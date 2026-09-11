import { query, queryOne } from '../db/index.js';
import { generateEmbedding } from '../gemini/index.js';

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
  embedding?: number[] | string | null;
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
  embedding?: number[] | string | null;
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
  embedding?: number[] | string | null;
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

/**
 * Opciones para búsqueda semántica / híbrida de repositorios
 */
export interface SearchRepositorioOptions {
  limit?: number;
  minSimilarity?: number;
  categoria?: string;
  embedding?: number[] | string;
  modo?: 'semantico' | 'hibrido' | 'texto';
}

/**
 * Resultado de búsqueda con score de similitud y tipo de coincidencia
 */
export type RepositorioSearchResult = Repositorio & {
  similarity: number;
  matchType?: 'vector' | 'texto' | 'hibrido';
};

export type RepositorioProperty = keyof Omit<Repositorio, 'id'>;

const ALLOWED_COLUMNS: Array<keyof Repositorio> = [
  'id',
  'nom_arch',
  'ruta_arch',
  'categoria',
  'descripcion',
  'resumen',
  'palabras_clave',
  'contexto',
  'embedding'
];

function formatEmbedding(embedding?: number[] | string | null): string | null {
  if (!embedding) return null;
  return Array.isArray(embedding) ? JSON.stringify(embedding) : String(embedding);
}

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
        contexto,
        embedding
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;
    const rows = await query<Repositorio>(text, [
      data.nom_arch,
      data.ruta_arch,
      data.categoria ?? null,
      data.descripcion ?? null,
      data.resumen ?? null,
      data.palabras_clave ?? null,
      data.contexto ?? null,
      formatEmbedding(data.embedding)
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
    const values: any[] = fields.map((field) => {
      if (field === 'embedding') {
        return formatEmbedding(data.embedding);
      }
      return data[field];
    });
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
  },

  /**
   * Modifica o asigna el embedding vectorial de un repositorio
   */
  async updateEmbedding(id: number, embedding: number[] | string | null): Promise<Repositorio | null> {
    const formatted = formatEmbedding(embedding);
    const text = 'UPDATE repositorios SET embedding = $1 WHERE id = $2 RETURNING *;';
    return queryOne<Repositorio>(text, [formatted, id]);
  },

  /**
   * Búsqueda por similitud semántica de coseno (Vector Similarity Search)
   * 
   * @param embedding Vector de consulta (768 dimensiones) o su representación en string '[0.1, 0.2, ...]'
   * @param options Opciones de búsqueda: límite de registros, umbral mínimo de similitud y filtro por categoría
   */
  async findSimilar(
    embedding: number[] | string,
    options: {
      limit?: number;
      minSimilarity?: number;
      categoria?: string;
    } = {}
  ): Promise<Array<Repositorio & { similarity: number }>> {
    const { limit = 10, minSimilarity = 0, categoria } = options;
    const formatted = formatEmbedding(embedding);

    let text = `
      SELECT 
        id,
        nom_arch,
        ruta_arch,
        categoria,
        descripcion,
        resumen,
        palabras_clave,
        contexto,
        embedding,
        (1 - (embedding <=> $1::vector)) AS similarity
      FROM repositorios
      WHERE embedding IS NOT NULL
    `;
    const params: any[] = [formatted];

    if (categoria) {
      params.push(categoria);
      text += ` AND categoria = $${params.length}`;
    }

    if (minSimilarity > 0) {
      params.push(minSimilarity);
      text += ` AND (1 - (embedding <=> $1::vector)) >= $${params.length}`;
    }

    params.push(limit);
    text += ` ORDER BY embedding <=> $1::vector ASC LIMIT $${params.length};`;

    return query<Repositorio & { similarity: number }>(text, params);
  },

  /**
   * Búsqueda integral de documentos (Semántica / Vectorial / Híbrida / Texto)
   * 
   * Si no se envía embedding, lo genera automáticamente con Gemini AI a partir del texto ingresado.
   * En modo 'hibrido', combina la similitud semántica con coincidencias textuales léxicas.
   */
  async buscar(
    queryText: string,
    options: SearchRepositorioOptions = {}
  ): Promise<RepositorioSearchResult[]> {
    const {
      limit = 10,
      minSimilarity = 0,
      categoria,
      modo = 'hibrido',
      embedding
    } = options;

    const trimmedQuery = (queryText || '').trim();
    if (!trimmedQuery && !embedding) {
      return [];
    }

    let vectorResultados: RepositorioSearchResult[] = [];
    let textoResultados: RepositorioSearchResult[] = [];

    // 1. Búsqueda Vectorial / Semántica
    if (modo !== 'texto') {
      let queryVector: number[] | string | null = (embedding !== undefined && embedding !== null) ? embedding : null;

      if (!queryVector && trimmedQuery) {
        try {
          queryVector = await generateEmbedding(trimmedQuery);
        } catch (err: any) {
          console.warn('⚠️ No se pudo generar embedding para la búsqueda semántica, recurriendo a búsqueda textual:', err?.message);
        }
      }

      if (queryVector) {
        const similares = await this.findSimilar(queryVector, {
          limit,
          minSimilarity,
          categoria
        });
        vectorResultados = similares.map((s) => ({
          ...s,
          similarity: Number(s.similarity),
          matchType: 'vector' as const
        }));
      }
    }

    if (modo === 'semantico') {
      return vectorResultados.slice(0, limit);
    }

    // 2. Búsqueda Textual (ILIKE en nom_arch, descripcion, resumen, contexto y ANY(palabras_clave))
    if (trimmedQuery && (modo === 'texto' || modo === 'hibrido')) {
      let textSql = `
        SELECT 
          id,
          nom_arch,
          ruta_arch,
          categoria,
          descripcion,
          resumen,
          palabras_clave,
          contexto,
          embedding,
          1.0::float AS similarity
        FROM repositorios
        WHERE (
          nom_arch ILIKE $1
          OR descripcion ILIKE $1
          OR resumen ILIKE $1
          OR contexto ILIKE $1
          OR $2 = ANY(palabras_clave)
        )
      `;
      const params: any[] = [`%${trimmedQuery}%`, trimmedQuery.toLowerCase()];

      if (categoria) {
        params.push(categoria);
        textSql += ` AND categoria = $${params.length}`;
      }

      params.push(limit);
      textSql += ` ORDER BY id DESC LIMIT $${params.length};`;

      const textRows = await query<Repositorio & { similarity: number }>(textSql, params);
      textoResultados = textRows.map((r) => ({
        ...r,
        similarity: 1.0,
        matchType: 'texto' as const
      }));
    }

    if (modo === 'texto') {
      return textoResultados.slice(0, limit);
    }

    // 3. Modo Híbrido: combinar resultados vectoriales y textuales sin duplicados
    const mapa = new Map<number, RepositorioSearchResult>();

    for (const item of vectorResultados) {
      mapa.set(item.id, item);
    }

    for (const item of textoResultados) {
      if (mapa.has(item.id)) {
        const exist = mapa.get(item.id)!;
        exist.matchType = 'hibrido';
        exist.similarity = Math.min(1.0, (exist.similarity ?? 0.5) + 0.2);
      } else {
        mapa.set(item.id, {
          ...item,
          similarity: 0.5,
          matchType: 'texto'
        });
      }
    }

    const combinados = Array.from(mapa.values());
    combinados.sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0));

    return combinados.slice(0, limit);
  }
};

export default RepositoriosModule;
