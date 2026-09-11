import { query, queryOne } from './index.js';
import dotenv from 'dotenv';
import { hashPassword } from '../utils/security.js';
import { ROLES_PERMISSIONS, ROLE_NAME_TO_ID } from '../config/roles.js';

dotenv.config();

/**
 * Sentencias SQL DDL con 'IF NOT EXISTS' para cada una de las tablas del sistema
 */
export const SCHEMAS = {
  extensions: `
    CREATE EXTENSION IF NOT EXISTS vector;
  `,

  roles: `
    CREATE TABLE IF NOT EXISTS roles (
        id_roles     SERIAL PRIMARY KEY,
        nombre_rol   VARCHAR(50) NOT NULL,
        permisos_rol JSONB NOT NULL DEFAULT '[]'::jsonb
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_nombre_rol ON roles (nombre_rol);
  `,

  usuarios: `
    CREATE TABLE IF NOT EXISTS usuarios (
        id       SERIAL PRIMARY KEY,
        nombre   VARCHAR(100) NOT NULL,
        gmail    VARCHAR(150) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL, 
        rol      INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_usuarios_gmail ON usuarios (gmail);
  `,

  repositorios: `
    CREATE TABLE IF NOT EXISTS repositorios (
        id             SERIAL PRIMARY KEY,
        nom_arch       VARCHAR(255) NOT NULL,
        ruta_arch      TEXT NOT NULL, 
        categoria      VARCHAR(100), 
        descripcion    TEXT,
        resumen        TEXT,
        palabras_clave TEXT[], 
        contexto       VARCHAR(255),
        embedding      vector(768)
    );
    CREATE INDEX IF NOT EXISTS idx_repositorios_categoria ON repositorios (categoria);
    CREATE INDEX IF NOT EXISTS idx_repositorios_embedding ON repositorios USING hnsw (embedding vector_cosine_ops);
  `,

  configuracion: `
    CREATE TABLE IF NOT EXISTS configuracion (
        id              SERIAL PRIMARY KEY,
        categorias      TEXT[] NOT NULL DEFAULT '{}',
        nom_institucion VARCHAR(150) NOT NULL
    );
  `,

  comparativas: `
    CREATE TABLE IF NOT EXISTS comparativas (
        id           SERIAL PRIMARY KEY,
        urls         TEXT[] NOT NULL DEFAULT '{}',
        titulo       VARCHAR(255) NOT NULL,
        comparativa  VARCHAR(255),
        descripcion  TEXT,
        categoria    VARCHAR(100),
        contexto     VARCHAR(255),
        embedding    vector(768)
    );
    CREATE INDEX IF NOT EXISTS idx_comparativas_categoria ON comparativas (categoria);
    CREATE INDEX IF NOT EXISTS idx_comparativas_embedding ON comparativas USING hnsw (embedding vector_cosine_ops);
  `,

  invitaciones: `
    CREATE TABLE IF NOT EXISTS invitaciones (
        id     SERIAL PRIMARY KEY,
        token  VARCHAR(255) NOT NULL UNIQUE,
        correo VARCHAR(150) NOT NULL,
        rol    INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_invitaciones_token ON invitaciones (token);
    CREATE INDEX IF NOT EXISTS idx_invitaciones_correo ON invitaciones (correo);
  `
};

/**
 * Estado del ciclo de vida del worker para evitar ejecuciones redundantes
 */
let isInitialized = false;
let initPromise: Promise<{ ok: boolean; message: string }> | null = null;

/**
 * Se asegura de que todas las tablas de la base de datos existan.
 * Si no existen, las crea automáticamente.
 * 
 * Se ejecuta una sola vez por ciclo de vida de la instancia del worker/contenedor.
 */
export async function ensureDatabaseTables(): Promise<{ ok: boolean; message: string }> {
  // Si ya se ejecutó con éxito en este worker, retornamos inmediatamente
  if (isInitialized) {
    return { ok: true, message: 'Tablas previamente verificadas.' };
  }

  // Si ya hay una inicialización en progreso en este worker, esperamos la misma promesa
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const hasUrl = Boolean(
      process.env.DATABASE_URL ||
      process.env.NEON_DATABASE_URL ||
      process.env.POSTGRES_URL
    );

    if (!hasUrl) {
      console.warn('⚠️ [Worker DB Init] Omitiendo verificación de tablas: DATABASE_URL no está definida en .env');
      return { ok: false, message: 'DATABASE_URL no definida en el entorno.' };
    }

    try {
      console.log('🔄 [Worker DB Init] Comprobando existencia de tablas en Neon DB...');

      // Ejecutamos la creación de extensiones y tablas en orden
      const ddlQueries = [
        SCHEMAS.extensions,
        SCHEMAS.roles,
        SCHEMAS.usuarios,
        SCHEMAS.repositorios,
        SCHEMAS.configuracion,
        SCHEMAS.comparativas,
        SCHEMAS.invitaciones
      ];

      for (const sql of ddlQueries) {
        const statements = sql
          .split(';')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        for (const stmt of statements) {
          await query(stmt);
        }
      }

      // Migración incremental para tablas preexistentes (idempotente)
      await query('ALTER TABLE repositorios ADD COLUMN IF NOT EXISTS embedding vector(768);');
      await query('ALTER TABLE comparativas ADD COLUMN IF NOT EXISTS embedding vector(768);');
      await query('CREATE INDEX IF NOT EXISTS idx_repositorios_embedding ON repositorios USING hnsw (embedding vector_cosine_ops);');
      await query('CREATE INDEX IF NOT EXISTS idx_comparativas_embedding ON comparativas USING hnsw (embedding vector_cosine_ops);');

      // 1. Sincronización automática de roles con roles.json
      await syncRolesFromConfig();

      // 2. Creación o reemplazo del usuario administrador desde .env
      await ensureAdminUser();

      isInitialized = true;
      console.log('✅ [Worker DB Init] Todas las tablas, roles sincronizados y usuario administrador verificados/creados correctamente.');
      return { ok: true, message: 'Tablas, roles y usuario administrador sincronizados exitosamente.' };
    } catch (error: any) {
      console.error('❌ [Worker DB Init] Error al verificar/crear tablas en la base de datos:', error?.message);
      // Reseteamos initPromise para permitir reintentos en futuras peticiones si falló por red temporal
      initPromise = null;
      throw error;
    }
  })();

  return initPromise;
}

export interface SyncRolesResult {
  totalInConfig: number;
  created: string[];
  updated: string[];
  unchanged: string[];
}

/**
 * Comprueba de forma profunda si dos conjuntos de permisos son equivalentes
 */
function arePermissionsEqual(current: any, incoming: any[]): boolean {
  if (!Array.isArray(current) || !Array.isArray(incoming)) {
    return JSON.stringify(current) === JSON.stringify(incoming);
  }
  if (current.length !== incoming.length) {
    return false;
  }
  const sortedCurrent = [...current].map(String).sort();
  const sortedIncoming = [...incoming].map(String).sort();
  return JSON.stringify(sortedCurrent) === JSON.stringify(sortedIncoming);
}

/**
 * Sincroniza automáticamente la tabla 'roles' con la configuración de roles.json
 * - Crea los roles ausentes en la tabla, respetando ROLE_NAME_TO_ID.
 * - Actualiza permisos_rol si difieren de roles.json.
 * - Sincroniza la secuencia id_roles de PostgreSQL.
 */
export async function syncRolesFromConfig(): Promise<SyncRolesResult> {
  console.log('🔄 [Worker DB Init] Sincronizando tabla roles con roles.json...');

  const result: SyncRolesResult = {
    totalInConfig: 0,
    created: [],
    updated: [],
    unchanged: []
  };

  const roleEntries = Object.entries(ROLES_PERMISSIONS);
  result.totalInConfig = roleEntries.length;

  for (const [roleName, permissions] of roleEntries) {
    const permissionsArray = permissions || [];
    const permissionsJson = JSON.stringify(permissionsArray);

    // 1. Buscar si el rol ya existe por nombre (insensible a mayúsculas)
    const existing = await queryOne<{ id_roles: number; nombre_rol: string; permisos_rol: any }>(
      'SELECT id_roles, nombre_rol, permisos_rol FROM roles WHERE LOWER(nombre_rol) = LOWER($1);',
      [roleName]
    );

    if (existing) {
      // Comparar permisos existentes con los de la configuración
      if (!arePermissionsEqual(existing.permisos_rol, permissionsArray)) {
        await query(
          'UPDATE roles SET permisos_rol = $1::jsonb WHERE id_roles = $2;',
          [permissionsJson, existing.id_roles]
        );
        result.updated.push(roleName);
        console.log(`  ✏️ [Worker DB Init] Rol "${roleName}" (ID: ${existing.id_roles}) actualizado con ${permissionsArray.length} permisos.`);
      } else {
        result.unchanged.push(roleName);
      }
    } else {
      // 2. El rol no existe: verificar si tiene un ID numérico preferido
      const preferredId = ROLE_NAME_TO_ID[roleName.toLowerCase()];

      if (preferredId) {
        const idInUse = await queryOne<{ id_roles: number }>(
          'SELECT id_roles FROM roles WHERE id_roles = $1;',
          [preferredId]
        );

        if (!idInUse) {
          await query(
            'INSERT INTO roles (id_roles, nombre_rol, permisos_rol) VALUES ($1, $2, $3::jsonb);',
            [preferredId, roleName.toLowerCase(), permissionsJson]
          );
        } else {
          await query(
            'INSERT INTO roles (nombre_rol, permisos_rol) VALUES ($1, $2::jsonb);',
            [roleName.toLowerCase(), permissionsJson]
          );
        }
      } else {
        await query(
          'INSERT INTO roles (nombre_rol, permisos_rol) VALUES ($1, $2::jsonb);',
          [roleName.toLowerCase(), permissionsJson]
        );
      }

      result.created.push(roleName);
      console.log(`  ➕ [Worker DB Init] Rol "${roleName}" creado en la base de datos.`);
    }
  }

  // 3. Sincronizar secuencia SERIAL de PostgreSQL si aplica
  try {
    await query(`
      SELECT setval(
        pg_get_serial_sequence('roles', 'id_roles'),
        COALESCE((SELECT MAX(id_roles) FROM roles), 1)
      );
    `);
  } catch (seqErr: any) {
    console.warn('⚠️ [Worker DB Init] Secuencia id_roles no requerida o no disponible:', seqErr?.message);
  }

  console.log(`✅ [Worker DB Init] Sincronización de roles completada (${result.created.length} creados, ${result.updated.length} actualizados, ${result.unchanged.length} sin cambios).`);
  return result;
}

/**
 * Crea o reemplaza el usuario administrador configurado en .env.
 * La contraseña se procesa y almacena como hash HMAC en todo momento.
 */
export async function ensureAdminUser(): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.ADMIN_GMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME || 'Administrador';
  const adminRole = Number(process.env.ADMIN_ROLE || 1);

  if (!adminEmail || !adminPassword) {
    console.warn('⚠️ [Worker DB Init] ADMIN_EMAIL o ADMIN_PASSWORD no definidos en .env; omitiendo usuario admin.');
    return;
  }

  // 1. Asegurar la existencia del rol admin
  await query(`
    INSERT INTO roles (id_roles, nombre_rol, permisos_rol)
    VALUES ($1, 'admin', '["*"]'::jsonb)
    ON CONFLICT (id_roles) DO NOTHING;
  `, [adminRole]);

  // 2. La contraseña se hashea con el secret key de .env
  const hashedPassword = hashPassword(adminPassword);

  // 3. Inserta el usuario admin y si ya existe lo reemplaza (nombre, password hash y rol)
  const upsertUser = `
    INSERT INTO usuarios (nombre, gmail, password, rol)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (gmail) DO UPDATE
    SET nombre = EXCLUDED.nombre,
        password = EXCLUDED.password,
        rol = EXCLUDED.rol
    RETURNING id, nombre, gmail, rol;
  `;

  await query(upsertUser, [adminName, adminEmail, hashedPassword, adminRole]);
  console.log(`👤 [Worker DB Init] Usuario admin asegurado/reemplazado: ${adminEmail} (Rol: ${adminRole})`);
}

/**
 * Ejecución directa por CLI (ejemplo: `npx tsx src/db/init.ts` o `npm run db:init`)
 */
const isDirectExecution =
  process.argv[1] &&
  (process.argv[1].endsWith('init.ts') || process.argv[1].endsWith('init.js'));

if (isDirectExecution) {
  ensureDatabaseTables()
    .then((res) => {
      console.log(`[CLI] Resultado: ${res.message}`);
      process.exit(res.ok ? 0 : 1);
    })
    .catch((err) => {
      console.error('[CLI] Error fatal:', err);
      process.exit(1);
    });
}

export default ensureDatabaseTables;
