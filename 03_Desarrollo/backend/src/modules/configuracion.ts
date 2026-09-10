import { query, queryOne } from '../db/index.js';

/**
 * Entidad Configuracion que representa una fila de la tabla 'configuracion'
 */
export interface Configuracion {
  id: number;
  categorias: string[];
  nom_institucion: string;
}

/**
 * Datos requeridos para crear una configuración
 */
export interface CreateConfiguracionDto {
  categorias?: string[];
  nom_institucion: string;
}

/**
 * Datos para actualización parcial de una configuración
 */
export interface UpdateConfiguracionDto {
  categorias?: string[];
  nom_institucion?: string;
}

/**
 * Filtros de búsqueda para configuración
 */
export interface ConfiguracionFilters {
  id?: number;
  nom_institucion?: string;
  categoria?: string;
}

export type ConfiguracionProperty = keyof Omit<Configuracion, 'id'>;

const ALLOWED_COLUMNS: Array<keyof Configuracion> = ['id', 'categorias', 'nom_institucion'];

export const ConfiguracionModule = {
  // ==========================================
  // 1. CRUD BÁSICO
  // ==========================================

  /**
   * Crea un nuevo registro de configuración
   */
  async create(data: CreateConfiguracionDto): Promise<Configuracion> {
    const text = `
      INSERT INTO configuracion (categorias, nom_institucion)
      VALUES ($1, $2)
      RETURNING *;
    `;
    const rows = await query<Configuracion>(text, [data.categorias ?? [], data.nom_institucion]);
    return rows[0];
  },

  /**
   * Obtiene todos los registros de configuración
   */
  async findAll(options: {
    limit?: number;
    offset?: number;
    orderBy?: keyof Configuracion;
    orderDirection?: 'ASC' | 'DESC';
  } = {}): Promise<Configuracion[]> {
    const { limit = 100, offset = 0, orderBy = 'id', orderDirection = 'ASC' } = options;
    const safeOrder = ALLOWED_COLUMNS.includes(orderBy) ? orderBy : 'id';
    const safeDir = orderDirection === 'DESC' ? 'DESC' : 'ASC';

    const text = `
      SELECT * FROM configuracion
      ORDER BY ${safeOrder} ${safeDir}
      LIMIT $1 OFFSET $2;
    `;
    return query<Configuracion>(text, [limit, offset]);
  },

  /**
   * Busca una configuración por su ID
   */
  async findById(id: number): Promise<Configuracion | null> {
    const text = 'SELECT * FROM configuracion WHERE id = $1;';
    return queryOne<Configuracion>(text, [id]);
  },

  /**
   * Actualiza uno o más campos de una configuración por su ID
   */
  async update(id: number, data: UpdateConfiguracionDto): Promise<Configuracion | null> {
    const fields = Object.keys(data).filter((k): k is keyof UpdateConfiguracionDto =>
      ALLOWED_COLUMNS.includes(k as keyof Configuracion) && data[k as keyof UpdateConfiguracionDto] !== undefined
    );

    if (fields.length === 0) {
      return this.findById(id);
    }

    const setClauses = fields.map((field, idx) => `${field} = $${idx + 1}`);
    const values: any[] = fields.map((field) => data[field]);
    values.push(id);

    const text = `
      UPDATE configuracion
      SET ${setClauses.join(', ')}
      WHERE id = $${values.length}
      RETURNING *;
    `;

    return queryOne<Configuracion>(text, values);
  },

  /**
   * Elimina una configuración por su ID
   */
  async delete(id: number): Promise<boolean> {
    const text = 'DELETE FROM configuracion WHERE id = $1 RETURNING id;';
    const result = await queryOne<{ id: number }>(text, [id]);
    return result !== null;
  },

  // ==========================================
  // 2. BÚSQUEDA POR CADA PROPIEDAD
  // ==========================================

  /**
   * Búsqueda por nombre de la institución
   */
  async findByNomInstitucion(nom_institucion: string, exact: boolean = false): Promise<Configuracion[]> {
    if (exact) {
      return query<Configuracion>('SELECT * FROM configuracion WHERE nom_institucion = $1;', [nom_institucion]);
    }
    return query<Configuracion>('SELECT * FROM configuracion WHERE nom_institucion ILIKE $1;', [`%${nom_institucion}%`]);
  },

  /**
   * Búsqueda por coincidencia de una categoría dentro del array 'categorias'
   */
  async findByCategoria(categoria: string): Promise<Configuracion[]> {
    const text = 'SELECT * FROM configuracion WHERE $1 = ANY(categorias);';
    return query<Configuracion>(text, [categoria]);
  },

  /**
   * Búsqueda genérica por cualquier propiedad de la tabla
   */
  async findByProperty<K extends keyof Configuracion>(property: K, value: Configuracion[K]): Promise<Configuracion[]> {
    if (!ALLOWED_COLUMNS.includes(property)) {
      throw new Error(`Propiedad inválida para Configuracion: ${String(property)}`);
    }

    if (property === 'categorias' && typeof value === 'string') {
      return this.findByCategoria(value);
    }

    const text = `SELECT * FROM configuracion WHERE ${property} = $1;`;
    return query<Configuracion>(text, [value]);
  },

  /**
   * Búsqueda combinada por filtros dinámicos
   */
  async findWhere(filters: ConfiguracionFilters): Promise<Configuracion[]> {
    const conditions: string[] = [];
    const values: any[] = [];

    if (filters.id !== undefined) {
      values.push(filters.id);
      conditions.push(`id = $${values.length}`);
    }
    if (filters.nom_institucion) {
      values.push(`%${filters.nom_institucion}%`);
      conditions.push(`nom_institucion ILIKE $${values.length}`);
    }
    if (filters.categoria) {
      values.push(filters.categoria);
      conditions.push(`$${values.length} = ANY(categorias)`);
    }

    if (conditions.length === 0) {
      return this.findAll();
    }

    const text = `SELECT * FROM configuracion WHERE ${conditions.join(' AND ')};`;
    return query<Configuracion>(text, values);
  },

  // ==========================================
  // 3. MODIFICACIÓN POR CADA PROPIEDAD
  // ==========================================

  /**
   * Reemplaza la lista completa de categorías
   */
  async updateCategorias(id: number, categorias: string[]): Promise<Configuracion | null> {
    return this.updateProperty(id, 'categorias', categorias);
  },

  /**
   * Añade una categoría al array 'categorias' si aún no existe
   */
  async addCategoria(id: number, categoria: string): Promise<Configuracion | null> {
    const text = `
      UPDATE configuracion
      SET categorias = array_append(categorias, $1)
      WHERE id = $2 AND NOT ($1 = ANY(categorias))
      RETURNING *;
    `;
    const updated = await queryOne<Configuracion>(text, [categoria, id]);
    return updated || this.findById(id);
  },

  /**
   * Elimina una categoría del array 'categorias'
   */
  async removeCategoria(id: number, categoria: string): Promise<Configuracion | null> {
    const text = `
      UPDATE configuracion
      SET categorias = array_remove(categorias, $1)
      WHERE id = $2
      RETURNING *;
    `;
    return queryOne<Configuracion>(text, [categoria, id]);
  },

  /**
   * Modifica el nombre de la institución
   */
  async updateNomInstitucion(id: number, nom_institucion: string): Promise<Configuracion | null> {
    return this.updateProperty(id, 'nom_institucion', nom_institucion);
  },

  /**
   * Modificación genérica de una propiedad individual
   */
  async updateProperty<K extends keyof UpdateConfiguracionDto>(
    id: number,
    property: K,
    value: UpdateConfiguracionDto[K]
  ): Promise<Configuracion | null> {
    if (!ALLOWED_COLUMNS.includes(property as keyof Configuracion)) {
      throw new Error(`Propiedad inválida para actualización en Configuracion: ${String(property)}`);
    }
    const text = `UPDATE configuracion SET ${property} = $1 WHERE id = $2 RETURNING *;`;
    return queryOne<Configuracion>(text, [value, id]);
  }
};

export default ConfiguracionModule;
