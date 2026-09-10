import { query, queryOne } from '../db/index.js';

/**
 * Entidad Repositorio que representa una fila de la tabla 'repositorios'
 */
export interface Repositorio {
  id: number;
  nom_arch: string;
  ruta_arch: string;
  categoria: string | null;
  descripcion: string | null;
  resumen: string | null;
  palabras_clave: string[] | null;
  contexto: string | null;
}

/**
 * Datos requeridos para registrar un repositorio
 */
export interface CreateRepositorioDto {
  nom_arch: string;
  ruta_arch: string;
  categoria?: string | null;
  descripcion?: string | null;
  resumen?: string | null;
  palabras_clave?: string[] | null;
  contexto?: string | null;
}

/**
 * Datos para actualización parcial de un repositorio
 */
export interface UpdateRepositorioDto {
  nom_arch?: string;
  ruta_arch?: string;
  categoria?: string | null;
  descripcion?: string | null;
  resumen?: string | null;
  palabras_clave?: string[] | null;
  contexto?: string | null;
}

/**
 * Filtros de búsqueda para repositorios
 */
export interface RepositorioFilters {
  id?: number;
  nom_arch?: string;
  categoria?: string;
  contexto?: string;
  palabra_clave?: string;
}

export type RepositorioProperty = keyof Omit<Repositorio, 'id'>;

const ALLOWED_COLUMNS: Array<keyof Repositorio> = [
  'id',
  'nom_arch',
  'ruta_arch',
  'categoria',
  'descripcion',
  'resumen',
  'palabras_clave',
  'contexto'
];

export const RepositoriosModule = {
  // ==========================================
  // 1. CRUD BÁSICO
  // ==========================================

  /**
   * Crea un nuevo registro en repositorios
   */
  async create(data: CreateRepositorioDto): Promise<Repositorio> {
    const text = `
      INSERT INTO repositorios (
        nom_arch,
        ruta_arch,
        categoria,
        descripcion,
        resumen,
        palabras_clave,
        contexto
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const rows = await query<Repositorio>(text, [
      data.nom_arch,
      data.ruta_arch,
      data.categoria ?? null,
      data.descripcion ?? null,
      data.resumen ?? null,
      data.palabras_clave ?? null,
      data.contexto ?? null
    ]);
    return rows[0];
  },

  /**
   * Obtiene todos los repositorios con paginación y ordenamiento
   */
  async findAll(options: {
    limit?: number;
    offset?: number;
    orderBy?: keyof Repositorio;
    orderDirection?: 'ASC' | 'DESC';
  } = {}): Promise<Repositorio[]> {
    const { limit = 100, offset = 0, orderBy = 'id', orderDirection = 'ASC' } = options;
    const safeOrder = ALLOWED_COLUMNS.includes(orderBy) ? orderBy : 'id';
    const safeDir = orderDirection === 'DESC' ? 'DESC' : 'ASC';

    const text = `
      SELECT * FROM repositorios
      ORDER BY ${safeOrder} ${safeDir}
      LIMIT $1 OFFSET $2;
    `;
    return query<Repositorio>(text, [limit, offset]);
  },

  /**
   * Busca un repositorio por su ID primario
   */
  async findById(id: number): Promise<Repositorio | null> {
    const text = 'SELECT * FROM repositorios WHERE id = $1;';
    return queryOne<Repositorio>(text, [id]);
  },

  /**
   * Actualiza uno o más campos de un repositorio por su ID
   */
  async update(id: number, data: UpdateRepositorioDto): Promise<Repositorio | null> {
    const fields = Object.keys(data).filter((k): k is keyof UpdateRepositorioDto =>
      ALLOWED_COLUMNS.includes(k as keyof Repositorio) && data[k as keyof UpdateRepositorioDto] !== undefined
    );

    if (fields.length === 0) {
      return this.findById(id);
    }

    const setClauses = fields.map((field, idx) => `${field} = $${idx + 1}`);
    const values: any[] = fields.map((field) => data[field]);
    values.push(id);

    const text = `
      UPDATE repositorios
      SET ${setClauses.join(', ')}
      WHERE id = $${values.length}
      RETURNING *;
    `;

    return queryOne<Repositorio>(text, values);
  },

  /**
   * Elimina un repositorio por su ID
   */
  async delete(id: number): Promise<boolean> {
    const text = 'DELETE FROM repositorios WHERE id = $1 RETURNING id;';
    const result = await queryOne<{ id: number }>(text, [id]);
    return result !== null;
  },

  // ==========================================
  // 2. BÚSQUEDA POR CADA PROPIEDAD
  // ==========================================

  /**
   * Búsqueda por nombre de archivo
   */
  async findByNomArch(nom_arch: string, exact: boolean = false): Promise<Repositorio[]> {
    if (exact) {
      return query<Repositorio>('SELECT * FROM repositorios WHERE nom_arch = $1;', [nom_arch]);
    }
    return query<Repositorio>('SELECT * FROM repositorios WHERE nom_arch ILIKE $1;', [`%${nom_arch}%`]);
  },

  /**
   * Búsqueda por ruta del archivo
   */
  async findByRutaArch(ruta_arch: string): Promise<Repositorio[]> {
    return query<Repositorio>('SELECT * FROM repositorios WHERE ruta_arch ILIKE $1;', [`%${ruta_arch}%`]);
  },

  /**
   * Búsqueda por categoría
   */
  async findByCategoria(categoria: string): Promise<Repositorio[]> {
    return query<Repositorio>('SELECT * FROM repositorios WHERE categoria = $1;', [categoria]);
  },

  /**
   * Búsqueda por texto en la descripción
   */
  async findByDescripcion(texto: string): Promise<Repositorio[]> {
    return query<Repositorio>('SELECT * FROM repositorios WHERE descripcion ILIKE $1;', [`%${texto}%`]);
  },

  /**
   * Búsqueda por texto en el resumen
   */
  async findByResumen(texto: string): Promise<Repositorio[]> {
    return query<Repositorio>('SELECT * FROM repositorios WHERE resumen ILIKE $1;', [`%${texto}%`]);
  },

  /**
   * Búsqueda por coincidencia en el array de palabras clave
   */
  async findByPalabraClave(palabra: string): Promise<Repositorio[]> {
    const text = 'SELECT * FROM repositorios WHERE $1 = ANY(palabras_clave);';
    return query<Repositorio>(text, [palabra]);
  },

  /**
   * Búsqueda por contexto
   */
  async findByContexto(contexto: string): Promise<Repositorio[]> {
    return query<Repositorio>('SELECT * FROM repositorios WHERE contexto ILIKE $1;', [`%${contexto}%`]);
  },

  /**
   * Búsqueda genérica por cualquier propiedad de la tabla
   */
  async findByProperty<K extends keyof Repositorio>(property: K, value: Repositorio[K]): Promise<Repositorio[]> {
    if (!ALLOWED_COLUMNS.includes(property)) {
      throw new Error(`Propiedad inválida para Repositorio: ${String(property)}`);
    }

    if (property === 'palabras_clave' && typeof value === 'string') {
      return this.findByPalabraClave(value);
    }

    const text = `SELECT * FROM repositorios WHERE ${property} = $1;`;
    return query<Repositorio>(text, [value]);
  },

  /**
   * Búsqueda combinada por filtros dinámicos
   */
  async findWhere(filters: RepositorioFilters): Promise<Repositorio[]> {
    const conditions: string[] = [];
    const values: any[] = [];

    if (filters.id !== undefined) {
      values.push(filters.id);
      conditions.push(`id = $${values.length}`);
    }
    if (filters.nom_arch) {
      values.push(`%${filters.nom_arch}%`);
      conditions.push(`nom_arch ILIKE $${values.length}`);
    }
    if (filters.categoria) {
      values.push(filters.categoria);
      conditions.push(`categoria = $${values.length}`);
    }
    if (filters.contexto) {
      values.push(`%${filters.contexto}%`);
      conditions.push(`contexto ILIKE $${values.length}`);
    }
    if (filters.palabra_clave) {
      values.push(filters.palabra_clave);
      conditions.push(`$${values.length} = ANY(palabras_clave)`);
    }

    if (conditions.length === 0) {
      return this.findAll();
    }

    const text = `SELECT * FROM repositorios WHERE ${conditions.join(' AND ')};`;
    return query<Repositorio>(text, values);
  },

  // ==========================================
  // 3. MODIFICACIÓN POR CADA PROPIEDAD
  // ==========================================

  /**
   * Modifica el nombre de archivo
   */
  async updateNomArch(id: number, nom_arch: string): Promise<Repositorio | null> {
    return this.updateProperty(id, 'nom_arch', nom_arch);
  },

  /**
   * Modifica la ruta del archivo
   */
  async updateRutaArch(id: number, ruta_arch: string): Promise<Repositorio | null> {
    return this.updateProperty(id, 'ruta_arch', ruta_arch);
  },

  /**
   * Modifica la categoría
   */
  async updateCategoria(id: number, categoria: string | null): Promise<Repositorio | null> {
    return this.updateProperty(id, 'categoria', categoria);
  },

  /**
   * Modifica la descripción
   */
  async updateDescripcion(id: number, descripcion: string | null): Promise<Repositorio | null> {
    return this.updateProperty(id, 'descripcion', descripcion);
  },

  /**
   * Modifica el resumen
   */
  async updateResumen(id: number, resumen: string | null): Promise<Repositorio | null> {
    return this.updateProperty(id, 'resumen', resumen);
  },

  /**
   * Reemplaza el array de palabras clave
   */
  async updatePalabrasClave(id: number, palabras_clave: string[] | null): Promise<Repositorio | null> {
    return this.updateProperty(id, 'palabras_clave', palabras_clave);
  },

  /**
   * Agrega una palabra clave al array si aún no existe
   */
  async addPalabraClave(id: number, palabra: string): Promise<Repositorio | null> {
    const text = `
      UPDATE repositorios
      SET palabras_clave = array_append(
        COALESCE(palabras_clave, '{}'),
        $1
      )
      WHERE id = $2 AND NOT ($1 = ANY(COALESCE(palabras_clave, '{}')))
      RETURNING *;
    `;
    const updated = await queryOne<Repositorio>(text, [palabra, id]);
    return updated || this.findById(id);
  },

  /**
   * Modifica el contexto
   */
  async updateContexto(id: number, contexto: string | null): Promise<Repositorio | null> {
    return this.updateProperty(id, 'contexto', contexto);
  },

  /**
   * Modificación genérica de una propiedad individual
   */
  async updateProperty<K extends keyof UpdateRepositorioDto>(
    id: number,
    property: K,
    value: UpdateRepositorioDto[K]
  ): Promise<Repositorio | null> {
    if (!ALLOWED_COLUMNS.includes(property as keyof Repositorio)) {
      throw new Error(`Propiedad inválida para actualización en Repositorio: ${String(property)}`);
    }
    const text = `UPDATE repositorios SET ${property} = $1 WHERE id = $2 RETURNING *;`;
    return queryOne<Repositorio>(text, [value, id]);
  }
};

export default RepositoriosModule;
