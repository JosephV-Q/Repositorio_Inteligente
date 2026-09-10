import { query, queryOne } from '../db/index.js';

/**
 * Entidad Usuario que representa una fila de la tabla 'usuarios'
 */
export interface Usuario {
  id: number;
  nombre: string;
  gmail: string;
  password: string;
  rol: number;
}

/**
 * Datos requeridos para crear un nuevo usuario
 */
export interface CreateUsuarioDto {
  nombre: string;
  gmail: string;
  password: string;
  rol: number;
}

/**
 * Datos para actualización parcial de un usuario
 */
export interface UpdateUsuarioDto {
  nombre?: string;
  gmail?: string;
  password?: string;
  rol?: number;
}

/**
 * Filtros de búsqueda para usuarios
 */
export interface UsuarioFilters {
  id?: number;
  nombre?: string;
  gmail?: string;
  rol?: number;
}

export type UsuarioProperty = keyof Omit<Usuario, 'id'>;

const ALLOWED_COLUMNS: Array<keyof Usuario> = ['id', 'nombre', 'gmail', 'password', 'rol'];

export const UsuariosModule = {
  // ==========================================
  // 1. CRUD BÁSICO
  // ==========================================

  /**
   * Crea un nuevo usuario en la base de datos
   */
  async create(data: CreateUsuarioDto): Promise<Usuario> {
    const text = `
      INSERT INTO usuarios (nombre, gmail, password, rol)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const rows = await query<Usuario>(text, [data.nombre, data.gmail, data.password, data.rol]);
    return rows[0];
  },

  /**
   * Obtiene todos los usuarios con paginación y ordenamiento opcional
   */
  async findAll(options: {
    limit?: number;
    offset?: number;
    orderBy?: keyof Usuario;
    orderDirection?: 'ASC' | 'DESC';
  } = {}): Promise<Usuario[]> {
    const { limit = 100, offset = 0, orderBy = 'id', orderDirection = 'ASC' } = options;
    const safeOrder = ALLOWED_COLUMNS.includes(orderBy) ? orderBy : 'id';
    const safeDir = orderDirection === 'DESC' ? 'DESC' : 'ASC';

    const text = `
      SELECT * FROM usuarios
      ORDER BY ${safeOrder} ${safeDir}
      LIMIT $1 OFFSET $2;
    `;
    return query<Usuario>(text, [limit, offset]);
  },

  /**
   * Busca un usuario por su ID primario
   */
  async findById(id: number): Promise<Usuario | null> {
    const text = 'SELECT * FROM usuarios WHERE id = $1;';
    return queryOne<Usuario>(text, [id]);
  },

  /**
   * Actualiza uno o más campos de un usuario por su ID
   */
  async update(id: number, data: UpdateUsuarioDto): Promise<Usuario | null> {
    const fields = Object.keys(data).filter((k): k is keyof UpdateUsuarioDto =>
      ALLOWED_COLUMNS.includes(k as keyof Usuario) && data[k as keyof UpdateUsuarioDto] !== undefined
    );

    if (fields.length === 0) {
      return this.findById(id);
    }

    const setClauses = fields.map((field, idx) => `${field} = $${idx + 1}`);
    const values: any[] = fields.map((field) => data[field]);
    values.push(id);

    const text = `
      UPDATE usuarios
      SET ${setClauses.join(', ')}
      WHERE id = $${values.length}
      RETURNING *;
    `;

    return queryOne<Usuario>(text, values);
  },

  /**
   * Elimina un usuario por su ID
   */
  async delete(id: number): Promise<boolean> {
    const text = 'DELETE FROM usuarios WHERE id = $1 RETURNING id;';
    const result = await queryOne<{ id: number }>(text, [id]);
    return result !== null;
  },

  // ==========================================
  // 2. BÚSQUEDA POR CADA PROPIEDAD
  // ==========================================

  /**
   * Búsqueda por nombre (coincidencia parcial insensible a mayúsculas)
   */
  async findByNombre(nombre: string, exact: boolean = false): Promise<Usuario[]> {
    if (exact) {
      return query<Usuario>('SELECT * FROM usuarios WHERE nombre = $1;', [nombre]);
    }
    return query<Usuario>('SELECT * FROM usuarios WHERE nombre ILIKE $1;', [`%${nombre}%`]);
  },

  /**
   * Búsqueda por correo electrónico (único)
   */
  async findByGmail(gmail: string): Promise<Usuario | null> {
    return queryOne<Usuario>('SELECT * FROM usuarios WHERE gmail = $1;', [gmail]);
  },

  /**
   * Búsqueda por rol de usuario
   */
  async findByRol(rol: number): Promise<Usuario[]> {
    return query<Usuario>('SELECT * FROM usuarios WHERE rol = $1;', [rol]);
  },

  /**
   * Búsqueda genérica por cualquier propiedad de la tabla
   */
  async findByProperty<K extends keyof Usuario>(property: K, value: Usuario[K]): Promise<Usuario[]> {
    if (!ALLOWED_COLUMNS.includes(property)) {
      throw new Error(`Propiedad inválida para Usuario: ${String(property)}`);
    }
    const text = `SELECT * FROM usuarios WHERE ${property} = $1;`;
    return query<Usuario>(text, [value]);
  },

  /**
   * Búsqueda combinada por filtros dinámicos
   */
  async findWhere(filters: UsuarioFilters): Promise<Usuario[]> {
    const keys = Object.keys(filters).filter((k): k is keyof UsuarioFilters =>
      ALLOWED_COLUMNS.includes(k as keyof Usuario) && filters[k as keyof UsuarioFilters] !== undefined
    );

    if (keys.length === 0) {
      return this.findAll();
    }

    const whereClauses = keys.map((key, idx) => `${key} = $${idx + 1}`);
    const values = keys.map((key) => filters[key]);

    const text = `SELECT * FROM usuarios WHERE ${whereClauses.join(' AND ')};`;
    return query<Usuario>(text, values);
  },

  // ==========================================
  // 3. MODIFICACIÓN POR CADA PROPIEDAD
  // ==========================================

  /**
   * Modifica únicamente el nombre del usuario
   */
  async updateNombre(id: number, nombre: string): Promise<Usuario | null> {
    return this.updateProperty(id, 'nombre', nombre);
  },

  /**
   * Modifica únicamente el correo (gmail) del usuario
   */
  async updateGmail(id: number, gmail: string): Promise<Usuario | null> {
    return this.updateProperty(id, 'gmail', gmail);
  },

  /**
   * Modifica únicamente la contraseña del usuario
   */
  async updatePassword(id: number, password: string): Promise<Usuario | null> {
    return this.updateProperty(id, 'password', password);
  },

  /**
   * Modifica únicamente el rol del usuario
   */
  async updateRol(id: number, rol: number): Promise<Usuario | null> {
    return this.updateProperty(id, 'rol', rol);
  },

  /**
   * Modificación genérica de una propiedad individual
   */
  async updateProperty<K extends keyof UpdateUsuarioDto>(
    id: number,
    property: K,
    value: UpdateUsuarioDto[K]
  ): Promise<Usuario | null> {
    if (!ALLOWED_COLUMNS.includes(property as keyof Usuario)) {
      throw new Error(`Propiedad inválida para actualización en Usuario: ${String(property)}`);
    }
    const text = `UPDATE usuarios SET ${property} = $1 WHERE id = $2 RETURNING *;`;
    return queryOne<Usuario>(text, [value, id]);
  }
};

export default UsuariosModule;
