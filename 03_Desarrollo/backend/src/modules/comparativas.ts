import { query, queryOne } from '../db/index.js';
import { generateEmbedding } from '../gemini/index.js';

/**
 * Entidad Comparativa que representa una fila de la tabla 'comparativas'
 */
export interface Comparativa {
  id: number;
  urls: string[];
  titulo: string;
  comparativa: string | null;
  descripcion: string | null;
  categoria: string | null;
  contexto: string | null;
  embedding?: number[] | string | null;
}

/**
 * Datos requeridos para crear una comparativa
 */
export interface CreateComparativaDto {
  urls?: string[];
  titulo: string;
  comparativa?: string | null;
  descripcion?: string | null;
  categoria?: string | null;
  contexto?: string | null;
  embedding?: number[] | string | null;
}

/**
 * Datos para actualización parcial de una comparativa
 */
export interface UpdateComparativaDto {
  urls?: string[];
  titulo?: string;
  comparativa?: string | null;
  descripcion?: string | null;
  categoria?: string | null;
  contexto?: string | null;
  embedding?: number[] | string | null;
}

/**
 * Filtros de búsqueda para comparativas
 */
export interface ComparativaFilters {
  id?: number;
  titulo?: string;
  categoria?: string;
  contexto?: string;
  url?: string;
}

/**
 * Opciones para búsqueda semántica / híbrida de comparativas
 */
export interface SearchComparativaOptions {
  limit?: number;
  minSimilarity?: number;
  categoria?: string;
  embedding?: number[] | string;
  modo?: 'semantico' | 'hibrido' | 'texto';
}

/**
 * Resultado de búsqueda de comparativa con score de similitud
 */
export type ComparativaSearchResult = Comparativa & {
  similarity: number;
  matchType?: 'vector' | 'texto' | 'hibrido';
};

export type ComparativaProperty = keyof Omit<Comparativa, 'id'>;

const ALLOWED_COLUMNS: Array<keyof Comparativa> = [
  'id',
  'urls',
  'titulo',
  'comparativa',
  'descripcion',
  'categoria',
  'contexto',
  'embedding'
];

function formatEmbedding(embedding?: number[] | string | null): string | null {
  if (!embedding) return null;
  return Array.isArray(embedding) ? JSON.stringify(embedding) : String(embedding);
}

export const ComparativasModule = {
  // ==========================================
  // 1. CRUD BÁSICO
  // ==========================================

  /**
   * Crea una nueva comparativa
   */
  async create(data: CreateComparativaDto): Promise<Comparativa> {
    const text = `
      INSERT INTO comparativas (
        urls,
        titulo,
        comparativa,
        descripcion,
        categoria,
        contexto,
        embedding
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const rows = await query<Comparativa>(text, [
      data.urls ?? [],
      data.titulo,
      data.comparativa ?? null,
      data.descripcion ?? null,
      data.categoria ?? null,
      data.contexto ?? null,
      formatEmbedding(data.embedding)
    ]);
    return rows[0];
  },

  /**
   * Obtiene todas las comparativas con paginación y ordenamiento
   */
  async findAll(options: {
    limit?: number;
    offset?: number;
    orderBy?: keyof Comparativa;
    orderDirection?: 'ASC' | 'DESC';
  } = {}): Promise<Comparativa[]> {
    const { limit = 100, offset = 0, orderBy = 'id', orderDirection = 'ASC' } = options;
    const safeOrder = ALLOWED_COLUMNS.includes(orderBy) ? orderBy : 'id';
    const safeDir = orderDirection === 'DESC' ? 'DESC' : 'ASC';

    const text = `
      SELECT * FROM comparativas
      ORDER BY ${safeOrder} ${safeDir}
      LIMIT $1 OFFSET $2;
    `;
    return query<Comparativa>(text, [limit, offset]);
  },

  /**
   * Busca una comparativa por su ID
   */
  async findById(id: number): Promise<Comparativa | null> {
    const text = 'SELECT * FROM comparativas WHERE id = $1;';
    return queryOne<Comparativa>(text, [id]);
  },

  /**
   * Actualiza uno o más campos de una comparativa por su ID
   */
  async update(id: number, data: UpdateComparativaDto): Promise<Comparativa | null> {
    const fields = Object.keys(data).filter((k): k is keyof UpdateComparativaDto =>
      ALLOWED_COLUMNS.includes(k as keyof Comparativa) && data[k as keyof UpdateComparativaDto] !== undefined
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
      UPDATE comparativas
      SET ${setClauses.join(', ')}
      WHERE id = $${values.length}
      RETURNING *;
    `;

    return queryOne<Comparativa>(text, values);
  },

  /**
   * Elimina una comparativa por su ID
   */
  async delete(id: number): Promise<boolean> {
    const text = 'DELETE FROM comparativas WHERE id = $1 RETURNING id;';
    const result = await queryOne<{ id: number }>(text, [id]);
    return result !== null;
  },

  // ==========================================
  // 2. BÚSQUEDA POR CADA PROPIEDAD
  // ==========================================

  /**
   * Búsqueda por título
   */
  async findByTitulo(titulo: string, exact: boolean = false): Promise<Comparativa[]> {
    if (exact) {
      return query<Comparativa>('SELECT * FROM comparativas WHERE titulo = $1;', [titulo]);
    }
    return query<Comparativa>('SELECT * FROM comparativas WHERE titulo ILIKE $1;', [`%${titulo}%`]);
  },

  /**
   * Búsqueda por comparativa (nombre o valor de comparación)
   */
  async findByComparativa(comparativa: string): Promise<Comparativa[]> {
    return query<Comparativa>('SELECT * FROM comparativas WHERE comparativa ILIKE $1;', [`%${comparativa}%`]);
  },

  /**
   * Búsqueda por descripción
   */
  async findByDescripcion(texto: string): Promise<Comparativa[]> {
    return query<Comparativa>('SELECT * FROM comparativas WHERE descripcion ILIKE $1;', [`%${texto}%`]);
  },

  /**
   * Búsqueda por categoría
   */
  async findByCategoria(categoria: string): Promise<Comparativa[]> {
    return query<Comparativa>('SELECT * FROM comparativas WHERE categoria = $1;', [categoria]);
  },

  /**
   * Búsqueda por contexto
   */
  async findByContexto(contexto: string): Promise<Comparativa[]> {
    return query<Comparativa>('SELECT * FROM comparativas WHERE contexto ILIKE $1;', [`%${contexto}%`]);
  },

  /**
   * Búsqueda de comparativas que incluyan una URL específica en su array
   */
  async findByUrl(url: string): Promise<Comparativa[]> {
    const text = 'SELECT * FROM comparativas WHERE $1 = ANY(urls);';
    return query<Comparativa>(text, [url]);
  },

  /**
   * Búsqueda genérica por cualquier propiedad de la tabla
   */
  async findByProperty<K extends keyof Comparativa>(property: K, value: Comparativa[K]): Promise<Comparativa[]> {
    if (!ALLOWED_COLUMNS.includes(property)) {
      throw new Error(`Propiedad inválida para Comparativa: ${String(property)}`);
    }

    if (property === 'urls' && typeof value === 'string') {
      return this.findByUrl(value);
    }

    const text = `SELECT * FROM comparativas WHERE ${property} = $1;`;
    return query<Comparativa>(text, [value]);
  },

  /**
   * Búsqueda combinada por filtros dinámicos
   */
  async findWhere(filters: ComparativaFilters): Promise<Comparativa[]> {
    const conditions: string[] = [];
    const values: any[] = [];

    if (filters.id !== undefined) {
      values.push(filters.id);
      conditions.push(`id = $${values.length}`);
    }
    if (filters.titulo) {
      values.push(`%${filters.titulo}%`);
      conditions.push(`titulo ILIKE $${values.length}`);
    }
    if (filters.categoria) {
      values.push(filters.categoria);
      conditions.push(`categoria = $${values.length}`);
    }
    if (filters.contexto) {
      values.push(`%${filters.contexto}%`);
      conditions.push(`contexto ILIKE $${values.length}`);
    }
    if (filters.url) {
      values.push(filters.url);
      conditions.push(`$${values.length} = ANY(urls)`);
    }

    if (conditions.length === 0) {
      return this.findAll();
    }

    const text = `SELECT * FROM comparativas WHERE ${conditions.join(' AND ')};`;
    return query<Comparativa>(text, values);
  },

  // ==========================================
  // 3. MODIFICACIÓN POR CADA PROPIEDAD
  // ==========================================

  /**
   * Reemplaza el array de URLs
   */
  async updateUrls(id: number, urls: string[]): Promise<Comparativa | null> {
    return this.updateProperty(id, 'urls', urls);
  },

  /**
   * Añade una URL al array 'urls' si aún no existe
   */
  async addUrl(id: number, url: string): Promise<Comparativa | null> {
    const text = `
      UPDATE comparativas
      SET urls = array_append(urls, $1)
      WHERE id = $2 AND NOT ($1 = ANY(urls))
      RETURNING *;
    `;
    const updated = await queryOne<Comparativa>(text, [url, id]);
    return updated || this.findById(id);
  },

  /**
   * Elimina una URL del array 'urls'
   */
  async removeUrl(id: number, url: string): Promise<Comparativa | null> {
    const text = `
      UPDATE comparativas
      SET urls = array_remove(urls, $1)
      WHERE id = $2
      RETURNING *;
    `;
    return queryOne<Comparativa>(text, [url, id]);
  },

  /**
   * Modifica el título de la comparativa
   */
  async updateTitulo(id: number, titulo: string): Promise<Comparativa | null> {
    return this.updateProperty(id, 'titulo', titulo);
  },

  /**
   * Modifica el campo comparativa
   */
  async updateComparativa(id: number, comparativa: string | null): Promise<Comparativa | null> {
    return this.updateProperty(id, 'comparativa', comparativa);
  },

  /**
   * Modifica la descripción
   */
  async updateDescripcion(id: number, descripcion: string | null): Promise<Comparativa | null> {
    return this.updateProperty(id, 'descripcion', descripcion);
  },

  /**
   * Modifica la categoría
   */
  async updateCategoria(id: number, categoria: string | null): Promise<Comparativa | null> {
    return this.updateProperty(id, 'categoria', categoria);
  },

  /**
   * Modifica el contexto
   */
  async updateContexto(id: number, contexto: string | null): Promise<Comparativa | null> {
    return this.updateProperty(id, 'contexto', contexto);
  },

  /**
   * Modificación genérica de una propiedad individual
   */
  async updateProperty<K extends keyof UpdateComparativaDto>(
    id: number,
    property: K,
    value: UpdateComparativaDto[K]
  ): Promise<Comparativa | null> {
    if (!ALLOWED_COLUMNS.includes(property as keyof Comparativa)) {
      throw new Error(`Propiedad inválida para actualización en Comparativa: ${String(property)}`);
    }
    const text = `UPDATE comparativas SET ${property} = $1 WHERE id = $2 RETURNING *;`;
    return queryOne<Comparativa>(text, [value, id]);
  },

  /**
   * Modifica o asigna el embedding vectorial de una comparativa
   */
  async updateEmbedding(id: number, embedding: number[] | string | null): Promise<Comparativa | null> {
    const formatted = formatEmbedding(embedding);
    const text = 'UPDATE comparativas SET embedding = $1 WHERE id = $2 RETURNING *;';
    return queryOne<Comparativa>(text, [formatted, id]);
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
  ): Promise<Array<Comparativa & { similarity: number }>> {
    const { limit = 10, minSimilarity = 0, categoria } = options;
    const formatted = formatEmbedding(embedding);

    let text = `
      SELECT 
        id,
        urls,
        titulo,
        comparativa,
        descripcion,
        categoria,
        contexto,
        embedding,
        (1 - (embedding <=> $1::vector)) AS similarity
      FROM comparativas
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

    return query<Comparativa & { similarity: number }>(text, params);
  },

  /**
   * Búsqueda integral de comparativas (Semántica / Vectorial / Híbrida / Texto)
   */
  async buscar(
    queryText: string,
    options: SearchComparativaOptions = {}
  ): Promise<ComparativaSearchResult[]> {
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

    let vectorResultados: ComparativaSearchResult[] = [];
    let textoResultados: ComparativaSearchResult[] = [];

    // 1. Búsqueda Vectorial / Semántica
    if (modo !== 'texto') {
      let queryVector: number[] | string | null = (embedding !== undefined && embedding !== null) ? embedding : null;

      if (!queryVector && trimmedQuery) {
        try {
          queryVector = await generateEmbedding(trimmedQuery);
        } catch (err: any) {
          console.warn('⚠️ No se pudo generar embedding para búsqueda de comparativas, usando texto:', err?.message);
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

    // 2. Búsqueda Textual (ILIKE en titulo, comparativa, descripcion, contexto)
    if (trimmedQuery && (modo === 'texto' || modo === 'hibrido')) {
      let textSql = `
        SELECT 
          id,
          urls,
          titulo,
          comparativa,
          descripcion,
          categoria,
          contexto,
          embedding,
          1.0::float AS similarity
        FROM comparativas
        WHERE (
          titulo ILIKE $1
          OR comparativa ILIKE $1
          OR descripcion ILIKE $1
          OR contexto ILIKE $1
          OR $2 = ANY(urls)
        )
      `;
      const params: any[] = [`%${trimmedQuery}%`, trimmedQuery];

      if (categoria) {
        params.push(categoria);
        textSql += ` AND categoria = $${params.length}`;
      }

      params.push(limit);
      textSql += ` ORDER BY id DESC LIMIT $${params.length};`;

      const textRows = await query<Comparativa & { similarity: number }>(textSql, params);
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
    const mapa = new Map<number, ComparativaSearchResult>();

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

export default ComparativasModule;
