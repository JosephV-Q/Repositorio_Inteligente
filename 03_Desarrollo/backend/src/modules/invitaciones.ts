import crypto from 'crypto';
import { query, queryOne } from '../db/index.js';

/**
 * Entidad Invitacion que representa una fila de la tabla 'invitaciones'
 */
export interface Invitacion {
  id: number;
  token: string;
  correo: string;
  rol: number;
}

/**
 * Datos requeridos para crear una invitación
 */
export interface CreateInvitacionDto {
  token?: string; // Si no se provee, se puede autogenerar
  correo: string;
  rol: number;
}

/**
 * Datos para actualización parcial de una invitación
 */
export interface UpdateInvitacionDto {
  token?: string;
  correo?: string;
  rol?: number;
}

/**
 * Filtros de búsqueda para invitaciones
 */
export interface InvitacionFilters {
  id?: number;
  token?: string;
  correo?: string;
  rol?: number;
}

export type InvitacionProperty = keyof Omit<Invitacion, 'id'>;

const ALLOWED_COLUMNS: Array<keyof Invitacion> = ['id', 'token', 'correo', 'rol'];

export const InvitacionesModule = {
  // ==========================================
  // 1. CRUD BÁSICO
  // ==========================================

  /**
   * Genera un token aleatorio seguro de 32 bytes (hexadecimal)
   */
  generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  },

  /**
   * Crea una nueva invitación en la base de datos
   */
  async create(data: CreateInvitacionDto): Promise<Invitacion> {
    const token = data.token || this.generateToken();

    const text = `
      INSERT INTO invitaciones (token, correo, rol)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    const rows = await query<Invitacion>(text, [token, data.correo, data.rol]);
    return rows[0];
  },

  /**
   * Obtiene todas las invitaciones con paginación y ordenamiento opcional
   */
  async findAll(options: {
    limit?: number;
    offset?: number;
    orderBy?: keyof Invitacion;
    orderDirection?: 'ASC' | 'DESC';
  } = {}): Promise<Invitacion[]> {
    const { limit = 100, offset = 0, orderBy = 'id', orderDirection = 'ASC' } = options;
    const safeOrder = ALLOWED_COLUMNS.includes(orderBy) ? orderBy : 'id';
    const safeDir = orderDirection === 'DESC' ? 'DESC' : 'ASC';

    const text = `
      SELECT * FROM invitaciones
      ORDER BY ${safeOrder} ${safeDir}
      LIMIT $1 OFFSET $2;
    `;
    return query<Invitacion>(text, [limit, offset]);
  },

  /**
   * Busca una invitación por su ID
   */
  async findById(id: number): Promise<Invitacion | null> {
    const text = 'SELECT * FROM invitaciones WHERE id = $1;';
    return queryOne<Invitacion>(text, [id]);
  },

  /**
   * Actualiza uno o más campos de una invitación por su ID
   */
  async update(id: number, data: UpdateInvitacionDto): Promise<Invitacion | null> {
    const fields = Object.keys(data).filter((k): k is keyof UpdateInvitacionDto =>
      ALLOWED_COLUMNS.includes(k as keyof Invitacion) && data[k as keyof UpdateInvitacionDto] !== undefined
    );

    if (fields.length === 0) {
      return this.findById(id);
    }

    const setClauses = fields.map((field, idx) => `${field} = $${idx + 1}`);
    const values: any[] = fields.map((field) => data[field]);
    values.push(id);

    const text = `
      UPDATE invitaciones
      SET ${setClauses.join(', ')}
      WHERE id = $${values.length}
      RETURNING *;
    `;

    return queryOne<Invitacion>(text, values);
  },

  /**
   * Elimina una invitación por su ID
   */
  async delete(id: number): Promise<boolean> {
    const text = 'DELETE FROM invitaciones WHERE id = $1 RETURNING id;';
    const result = await queryOne<{ id: number }>(text, [id]);
    return result !== null;
  },

  /**
   * Elimina una invitación consumida por su Token
   */
  async deleteByToken(token: string): Promise<boolean> {
    const text = 'DELETE FROM invitaciones WHERE token = $1 RETURNING id;';
    const result = await queryOne<{ id: number }>(text, [token]);
    return result !== null;
  },

  // ==========================================
  // 2. BÚSQUEDA POR CADA PROPIEDAD
  // ==========================================

  /**
   * Búsqueda por token único de invitación
   */
  async findByToken(token: string): Promise<Invitacion | null> {
    const text = 'SELECT * FROM invitaciones WHERE token = $1;';
    return queryOne<Invitacion>(text, [token]);
  },

  /**
   * Búsqueda por correo electrónico del invitado
   */
  async findByCorreo(correo: string): Promise<Invitacion[]> {
    const text = 'SELECT * FROM invitaciones WHERE correo ILIKE $1;';
    return query<Invitacion>(text, [correo]);
  },

  /**
   * Búsqueda por rol de la invitación
   */
  async findByRol(rol: number): Promise<Invitacion[]> {
    const text = 'SELECT * FROM invitaciones WHERE rol = $1;';
    return query<Invitacion>(text, [rol]);
  },

  /**
   * Búsqueda genérica por cualquier propiedad de la tabla
   */
  async findByProperty<K extends keyof Invitacion>(property: K, value: Invitacion[K]): Promise<Invitacion[]> {
    if (!ALLOWED_COLUMNS.includes(property)) {
      throw new Error(`Propiedad inválida para Invitacion: ${String(property)}`);
    }
    const text = `SELECT * FROM invitaciones WHERE ${property} = $1;`;
    return query<Invitacion>(text, [value]);
  },

  /**
   * Búsqueda combinada por filtros dinámicos
   */
  async findWhere(filters: InvitacionFilters): Promise<Invitacion[]> {
    const keys = Object.keys(filters).filter((k): k is keyof InvitacionFilters =>
      ALLOWED_COLUMNS.includes(k as keyof Invitacion) && filters[k as keyof InvitacionFilters] !== undefined
    );

    if (keys.length === 0) {
      return this.findAll();
    }

    const whereClauses = keys.map((key, idx) => `${key} = $${idx + 1}`);
    const values = keys.map((key) => filters[key]);

    const text = `SELECT * FROM invitaciones WHERE ${whereClauses.join(' AND ')};`;
    return query<Invitacion>(text, values);
  },

  // ==========================================
  // 3. MODIFICACIÓN POR CADA PROPIEDAD
  // ==========================================

  /**
   * Modifica únicamente el token de la invitación
   */
  async updateToken(id: number, token: string): Promise<Invitacion | null> {
    return this.updateProperty(id, 'token', token);
  },

  /**
   * Modifica únicamente el correo del usuario invitado
   */
  async updateCorreo(id: number, correo: string): Promise<Invitacion | null> {
    return this.updateProperty(id, 'correo', correo);
  },

  /**
   * Modifica únicamente el rol al que se invita
   */
  async updateRol(id: number, rol: number): Promise<Invitacion | null> {
    return this.updateProperty(id, 'rol', rol);
  },

  /**
   * Modificación genérica de una propiedad individual
   */
  async updateProperty<K extends keyof UpdateInvitacionDto>(
    id: number,
    property: K,
    value: UpdateInvitacionDto[K]
  ): Promise<Invitacion | null> {
    if (!ALLOWED_COLUMNS.includes(property as keyof Invitacion)) {
      throw new Error(`Propiedad inválida para actualización en Invitacion: ${String(property)}`);
    }
    const text = `UPDATE invitaciones SET ${property} = $1 WHERE id = $2 RETURNING *;`;
    return queryOne<Invitacion>(text, [value, id]);
  }
};

export default InvitacionesModule;
