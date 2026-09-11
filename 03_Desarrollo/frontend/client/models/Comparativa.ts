import { api, ApiClient } from '../ApiClient.js';
import type {
  Comparativa as IComparativa,
  CreateComparativaDto,
  UpdateComparativaDto,
  ComparativaFilters,
  BuscarComparativasParams,
  ComparativaSearchResult
} from '../ApiClient.js';

/**
 * ============================================================================
 * CLASE MODELO: Comparativa (Frontend)
 * ============================================================================
 * 
 * Representa una comparativa del sistema en el frontend.
 */
export class Comparativa implements IComparativa {
  public id: number;
  public urls: string[];
  public titulo: string;
  public comparativa: string | null;
  public descripcion: string | null;
  public categoria: string | null;
  public contexto: string | null;
  public embedding?: number[] | string | null;

  constructor(data: IComparativa) {
    this.id = data.id;
    this.urls = Array.isArray(data.urls) ? [...data.urls] : [];
    this.titulo = data.titulo;
    this.comparativa = data.comparativa ?? null;
    this.descripcion = data.descripcion ?? null;
    this.categoria = data.categoria ?? null;
    this.contexto = data.contexto ?? null;
    this.embedding = data.embedding ?? null;
  }

  // ==========================================================================
  // MÉTODOS ESTÁTICOS
  // ==========================================================================

  public static async fetchAll(
    filters?: ComparativaFilters,
    client: ApiClient = api
  ): Promise<Comparativa[]> {
    const rows = await client.getComparativas(filters);
    return rows.map((c) => new Comparativa(c));
  }

  public static async fetchById(
    id: number,
    client: ApiClient = api
  ): Promise<Comparativa> {
    const data = await client.getComparativaById(id);
    return new Comparativa(data);
  }

  public static async create(
    dto: CreateComparativaDto,
    client: ApiClient = api
  ): Promise<Comparativa> {
    const data = await client.createComparativa(dto);
    return new Comparativa(data);
  }

  /**
   * Realiza una búsqueda avanzada (semántica / híbrida / textual) en las comparativas.
   */
  public static async buscar(
    query: string | BuscarComparativasParams,
    options: Omit<BuscarComparativasParams, 'texto' | 'query'> = {},
    client: ApiClient = api
  ): Promise<Array<Comparativa & { similarity?: number; matchType?: 'vector' | 'texto' | 'hibrido' }>> {
    const params: BuscarComparativasParams = typeof query === 'string'
      ? { texto: query, ...options }
      : { ...query, ...options };

    const items = await client.buscarComparativas(params);
    return items.map((item) => {
      const comp = new Comparativa(item);
      return Object.assign(comp, {
        similarity: item.similarity,
        matchType: item.matchType
      });
    });
  }

  // ==========================================================================
  // MÉTODOS DE INSTANCIA
  // ==========================================================================

  public async update(
    dto: UpdateComparativaDto,
    client: ApiClient = api
  ): Promise<this> {
    const updated = await client.updateComparativa(this.id, dto);
    Object.assign(this, updated);
    return this;
  }

  public async addUrl(url: string, client: ApiClient = api): Promise<this> {
    const updated = await client.addUrlToComparativa(this.id, url);
    Object.assign(this, updated);
    return this;
  }

  public async removeUrl(url: string, client: ApiClient = api): Promise<this> {
    const updated = await client.removeUrlFromComparativa(this.id, url);
    Object.assign(this, updated);
    return this;
  }

  public async delete(client: ApiClient = api): Promise<boolean> {
    const res = await client.deleteComparativa(this.id);
    return res.success;
  }

  public toJSON(): IComparativa {
    return {
      id: this.id,
      urls: this.urls,
      titulo: this.titulo,
      comparativa: this.comparativa,
      descripcion: this.descripcion,
      categoria: this.categoria,
      contexto: this.contexto,
      embedding: this.embedding
    };
  }
}

export default Comparativa;
