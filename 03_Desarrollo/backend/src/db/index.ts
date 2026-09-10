import { neon, NeonQueryFunction } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Cliente singleton de Neon para reutilizar la conexión en entornos Serverless / Node.js
 */
let sqlClient: NeonQueryFunction<false, false> | null = null;

/**
 * Obtiene la URL de conexión a Neon DB desde las variables de entorno.
 */
export function getNeonUrl(): string {
  const url = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) {
    throw new Error(
      'Neon DB: No se encontró una cadena de conexión válida. ' +
      'Por favor define DATABASE_URL (o NEON_DATABASE_URL / POSTGRES_URL) en tus variables de entorno (.env).'
    );
  }
  return url;
}

/**
 * Devuelve la instancia del cliente SQL de Neon.
 */
export function getDb(): NeonQueryFunction<false, false> {
  if (!sqlClient) {
    const url = getNeonUrl();
    sqlClient = neon(url);
  }
  return sqlClient;
}

/**
 * Ejecuta una consulta SQL parametrizada de forma segura contra Neon DB.
 * 
 * @example
 * const usuarios = await query<Usuario>('SELECT * FROM usuarios WHERE rol = $1', [1]);
 */
export async function query<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const db = getDb();
  const rows = await db.query(text, params);
  return rows as T[];
}

/**
 * Ejecuta una consulta y retorna una única fila o null si no se encontraron resultados.
 */
export async function queryOne<T = any>(text: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Comprueba la conectividad con la base de datos de Neon ejecutando SELECT 1.
 */
export async function checkConnection(): Promise<{ ok: boolean; latencyMs?: number; error?: string }> {
  const start = Date.now();
  try {
    await query('SELECT 1 AS health');
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Error desconocido de conexión' };
  }
}

export { ensureDatabaseTables, syncRolesFromConfig } from './init.js';

export type { NeonQueryFunction };
export default {
  getDb,
  query,
  queryOne,
  checkConnection,
  getNeonUrl
};
