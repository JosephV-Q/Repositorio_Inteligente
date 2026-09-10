import { query, queryOne, syncRolesFromConfig } from '../db/index.js';
import type { SyncRolesResult } from '../db/init.js';

/**
 * Entidad Rol que representa una fila de la tabla 'roles'
 */
export interface Rol {
  id_roles: number;
  nombre_rol: string;
  permisos_rol: any; // JSONB
}

/**
 * Datos requeridos para crear un nuevo rol
 */
export interface CreateRolDto {
  nombre_rol: string;
  permisos_rol?: any;
}

/**
 * Datos para actualización parcial de un rol
 */
export interface UpdateRolDto {
  nombre_rol?: string;
  permisos_rol?: any;
}

/**
 * Filtros de búsqueda para roles
 */
export interface RolFilters {
  id_roles?: number;
  nombre_rol?: string;
}

export type RolProperty = keyof Omit<Rol, 'id_roles'>;

const ALLOWED_COLUMNS: Array<keyof Rol> = ['id_roles', 'nombre_rol', 'permisos_rol'];

export const RolesModule = {
  // ==========================================
  // 1. CRUD BÁSICO
  // ==========================================

  /**
   * Crea un nuevo rol en la base de datos
   */
  async create(data: CreateRolDto): Promise<Rol> {
    const permisosJson = data.permisos_rol !== undefined
      ? (typeof data.permisos_rol === 'string' ? data.permisos_rol : JSON.stringify(data.permisos_rol))
      : '[]';

    const text = `
      INSERT INTO roles (nombre_rol, permisos_rol)
      VALUES ($1, $2::jsonb)
      RETURNING *;
    `;
    const rows = await query<Rol>(text, [data.nombre_rol, permisosJson]);
    return rows[0];
  },

  /**
   * Obtiene todos los roles con paginación y ordenamiento opcional
   */
  async findAll(options: {
    limit?: number;
    offset?: number;
    orderBy?: keyof Rol;
    orderDirection?: 'ASC' | 'DESC';
  } = {}): Promise<Rol[]> {
    const { limit = 100, offset = 0, orderBy = 'id_roles', orderDirection = 'ASC' } = options;
    const safeOrder = ALLOWED_COLUMNS.includes(orderBy) ? orderBy : 'id_roles';
    const safeDir = orderDirection === 'DESC' ? 'DESC' : 'ASC';

    const text = `
      SELECT * FROM roles
      ORDER BY ${safeOrder} ${safeDir}
      LIMIT $1 OFFSET $2;
    `;
    return query<Rol>(text, [limit, offset]);
  },

  /**
   * Busca un rol por su ID primario
   */
  async findById(id_roles: number): Promise<Rol | null> {
    const text = 'SELECT * FROM roles WHERE id_roles = $1;';
    return queryOne<Rol>(text, [id_roles]);
  },

  /**
   * Actualiza uno o más campos de un rol por su ID
   */
  async update(id_roles: number, data: UpdateRolDto): Promise<Rol | null> {
    const fields = Object.keys(data).filter((k): k is keyof UpdateRolDto =>
      ALLOWED_COLUMNS.includes(k as keyof Rol) && data[k as keyof UpdateRolDto] !== undefined
    );

    if (fields.length === 0) {
      return this.findById(id_roles);
    }

    const setClauses: string[] = [];
    const values: any[] = [];

    fields.forEach((field) => {
      values.push(
        field === 'permisos_rol' && typeof data[field] !== 'string'
          ? JSON.stringify(data[field])
          : data[field]
      );
      if (field === 'permisos_rol') {
        setClauses.push(`${field} = $${values.length}::jsonb`);
      } else {
        setClauses.push(`${field} = $${values.length}`);
      }
    });

    values.push(id_roles);

    const text = `
      UPDATE roles
      SET ${setClauses.join(', ')}
      WHERE id_roles = $${values.length}
      RETURNING *;
    `;

    return queryOne<Rol>(text, values);
  },

  /**
   * Elimina un rol por su ID
   */
  async delete(id_roles: number): Promise<boolean> {
    const text = 'DELETE FROM roles WHERE id_roles = $1 RETURNING id_roles;';
    const result = await queryOne<{ id_roles: number }>(text, [id_roles]);
    return result !== null;
  },

  // ==========================================
  // 2. BÚSQUEDA POR CADA PROPIEDAD
  // ==========================================

  /**
   * Búsqueda por ID de rol
   */
  async findByIdRoles(id_roles: number): Promise<Rol | null> {
    return this.findById(id_roles);
  },

  /**
   * Búsqueda por nombre de rol
   */
  async findByNombreRol(nombre_rol: string, exact: boolean = false): Promise<Rol[]> {
    if (exact) {
      return query<Rol>('SELECT * FROM roles WHERE nombre_rol = $1;', [nombre_rol]);
    }
    return query<Rol>('SELECT * FROM roles WHERE nombre_rol ILIKE $1;', [`%${nombre_rol}%`]);
  },

  /**
   * Búsqueda de roles que contengan un permiso específico dentro del array JSONB
   */
  async findByPermiso(permiso: string): Promise<Rol[]> {
    const text = `
      SELECT * FROM roles
      WHERE permisos_rol @> $1::jsonb;
    `;
    return query<Rol>(text, [JSON.stringify([permiso])]);
  },

  /**
   * Búsqueda genérica por cualquier propiedad de la tabla
   */
  async findByProperty<K extends keyof Rol>(property: K, value: Rol[K]): Promise<Rol[]> {
    if (!ALLOWED_COLUMNS.includes(property)) {
      throw new Error(`Propiedad inválida para Rol: ${String(property)}`);
    }

    if (property === 'permisos_rol') {
      const jsonVal = typeof value === 'string' ? value : JSON.stringify(value);
      return query<Rol>('SELECT * FROM roles WHERE permisos_rol @> $1::jsonb;', [jsonVal]);
    }

    const text = `SELECT * FROM roles WHERE ${property} = $1;`;
    return query<Rol>(text, [value]);
  },

  /**
   * Búsqueda combinada por filtros dinámicos
   */
  async findWhere(filters: RolFilters): Promise<Rol[]> {
    const keys = Object.keys(filters).filter((k): k is keyof RolFilters =>
      ALLOWED_COLUMNS.includes(k as keyof Rol) && filters[k as keyof RolFilters] !== undefined
    );

    if (keys.length === 0) {
      return this.findAll();
    }

    const whereClauses = keys.map((key, idx) => `${key} = $${idx + 1}`);
    const values = keys.map((key) => filters[key]);

    const text = `SELECT * FROM roles WHERE ${whereClauses.join(' AND ')};`;
    return query<Rol>(text, values);
  },

  // ==========================================
  // 3. MODIFICACIÓN POR CADA PROPIEDAD
  // ==========================================

  /**
   * Modifica únicamente el nombre del rol
   */
  async updateNombreRol(id_roles: number, nombre_rol: string): Promise<Rol | null> {
    return this.updateProperty(id_roles, 'nombre_rol', nombre_rol);
  },

  /**
   * Modifica únicamente el objeto/array de permisos JSONB del rol
   */
  async updatePermisosRol(id_roles: number, permisos_rol: any): Promise<Rol | null> {
    const jsonVal = typeof permisos_rol === 'string' ? permisos_rol : JSON.stringify(permisos_rol);
    const text = `UPDATE roles SET permisos_rol = $1::jsonb WHERE id_roles = $2 RETURNING *;`;
    return queryOne<Rol>(text, [jsonVal, id_roles]);
  },

  /**
   * Añade un permiso al array de permisos sin sobrescribir los existentes
   */
  async addPermiso(id_roles: number, permiso: string): Promise<Rol | null> {
    const text = `
      UPDATE roles
      SET permisos_rol = (
        CASE
          WHEN permisos_rol @> $1::jsonb THEN permisos_rol
          ELSE permisos_rol || $1::jsonb
        END
      )
      WHERE id_roles = $2
      RETURNING *;
    `;
    return queryOne<Rol>(text, [JSON.stringify([permiso]), id_roles]);
  },

  /**
   * Modificación genérica de una propiedad individual
   */
  async updateProperty<K extends keyof UpdateRolDto>(
    id_roles: number,
    property: K,
    value: UpdateRolDto[K]
  ): Promise<Rol | null> {
    if (!ALLOWED_COLUMNS.includes(property as keyof Rol)) {
      throw new Error(`Propiedad inválida para actualización en Rol: ${String(property)}`);
    }

    if (property === 'permisos_rol') {
      return this.updatePermisosRol(id_roles, value);
    }

    const text = `UPDATE roles SET ${property} = $1 WHERE id_roles = $2 RETURNING *;`;
    return queryOne<Rol>(text, [value, id_roles]);
  },

  /**
   * Sincroniza la tabla roles con la configuración de roles.json
   */
  async syncFromConfig(): Promise<SyncRolesResult> {
    return syncRolesFromConfig();
  }
};

export type { SyncRolesResult };
export default RolesModule;
