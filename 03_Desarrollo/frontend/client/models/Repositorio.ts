import { api, ApiClient } from '../ApiClient.js';
import type {
  Repositorio as IRepositorio,
  CreateRepositorioDto,
  UpdateRepositorioDto,
  RepositorioFilters,
  ProcesarTextoDocumentoDto,
  SubirArchivoParams,
  SubirArchivoResult,
  BuscarRepositoriosParams
} from '../ApiClient.js';

/**
 * ============================================================================
 * CLASE MODELO: Repositorio (Frontend)
 * ============================================================================
 * 
 * Representa un archivo/documento del repositorio en el frontend.
 * Proporciona métodos de instancia y métodos estáticos tipo Active-Record
 * para interactuar directamente con la API REST y Google Drive.
 * 
 * @example
 * // Listar repositorios:
 * const docs = await Repositorio.fetchAll({ categoria: 'Finanzas' });
 * 
 * // Procesar texto plano con IA y obtener documento catalogado:
 * const doc = await Repositorio.procesarTexto({ texto: 'Contrato de...' });
 * 
 * // Actualizar metadatos:
 * await doc.update({ descripcion: 'Nueva descripción' });
 * 
 * // Eliminar:
 * await doc.delete();
 */
export class Repositorio implements IRepositorio {
  public id: number;
  public nom_arch: string;
  public ruta_arch: string;
  public categoria: string | null;
  public descripcion: string | null;
  public resumen: string | null;
  public palabras_clave: string[] | null;
  public contexto: string | null;
  public embedding?: number[] | string | null;

  constructor(data: IRepositorio) {
    this.id = data.id;
    this.nom_arch = data.nom_arch;
    this.ruta_arch = data.ruta_arch;
    this.categoria = data.categoria ?? null;
    this.descripcion = data.descripcion ?? null;
    this.resumen = data.resumen ?? null;
    this.palabras_clave = Array.isArray(data.palabras_clave) ? [...data.palabras_clave] : null;
    this.contexto = data.contexto ?? null;
    this.embedding = data.embedding ?? null;
  }

  // ==========================================================================
  // MÉTODOS ESTÁTICOS
  // ==========================================================================

  public static defaultClient: ApiClient = api;

  /**
   * Configura la instancia de ApiClient por defecto para todos los métodos estáticos.
   */
  public static setDefaultClient(client: ApiClient): void {
    Repositorio.defaultClient = client;
  }

  /**
   * Consulta repositorios aplicando filtros opcionales.
   */
  public static async fetchAll(
    filters?: RepositorioFilters,
    client?: ApiClient
  ): Promise<Repositorio[]> {
    const activeClient = client || Repositorio.defaultClient || api;
    const rows = await activeClient.getRepositorios(filters);
    return rows.map((r) => new Repositorio(r));
  }

  /**
   * Obtiene un repositorio por su ID.
   */
  public static async fetchById(
    id: number,
    client?: ApiClient
  ): Promise<Repositorio> {
    const activeClient = client || Repositorio.defaultClient || api;
    const data = await activeClient.getRepositorioById(id);
    return new Repositorio(data);
  }

  /**
   * Registra manualmente un archivo en el repositorio.
   */
  public static async create(
    dto: CreateRepositorioDto,
    client?: ApiClient
  ): Promise<Repositorio> {
    const activeClient = client || Repositorio.defaultClient || api;
    const data = await activeClient.createRepositorio(dto);
    return new Repositorio(data);
  }

  /**
   * Sube un archivo a Google Drive y lo registra automáticamente en el repositorio.
   */
  public static async subirArchivo(
    file: File | Blob,
    params: SubirArchivoParams = {},
    client?: ApiClient
  ): Promise<SubirArchivoResult> {
    const activeClient = client || Repositorio.defaultClient || api;
    return activeClient.subirArchivo(file, params);
  }

  /**
   * Flujo integrado: Sube a Drive, obtiene enlace desde getRepositorios y procesa con IA.
   */
  public static async subirYProcesar(
    file: File | Blob,
    params: SubirArchivoParams & { texto?: string } = {},
    client?: ApiClient
  ): Promise<{ uploadResult: SubirArchivoResult; enlace: string; repositorio: Repositorio }> {
    const activeClient = client || Repositorio.defaultClient || api;
    const result = await activeClient.subirYProcesarRepositorio(file, params);
    return {
      ...result,
      repositorio: new Repositorio(result.repositorio)
    };
  }

  /**
   * Envía texto bruto para que la IA extraiga metadatos, genere embeddings y lo registre.
   */
  public static async procesarTexto(
    dto: ProcesarTextoDocumentoDto,
    client?: ApiClient
  ): Promise<Repositorio> {
    const activeClient = client || Repositorio.defaultClient || api;
    const data = await activeClient.procesarTextoDocumento(dto);
    return new Repositorio(data);
  }

  /**
   * Realiza una búsqueda avanzada (semántica / híbrida / textual) en los documentos del repositorio.
   * Devuelve instancias de Repositorio con propiedades adicionales 'similarity' (score) y 'matchType'.
   * 
   * @param query Texto de búsqueda en lenguaje natural o parámetros completos
   * @param options Opciones adicionales (categoria, limit, minSimilarity, modo)
   * @param client Instancia de ApiClient opcional (por defecto usa Repositorio.defaultClient o api)
   * 
   * @example
   * const docs = await Repositorio.buscar('presupuestos y balances', { limit: 5 });
   */
  public static async buscar(
    query: string | BuscarRepositoriosParams,
    options: Omit<BuscarRepositoriosParams, 'texto' | 'query'> = {},
    client?: ApiClient
  ): Promise<Array<Repositorio & { similarity?: number; matchType?: 'vector' | 'texto' | 'hibrido' }>> {
    const activeClient = client || Repositorio.defaultClient || api;
    const params: BuscarRepositoriosParams = typeof query === 'string'
      ? { texto: query, ...options }
      : { ...query, ...options };

    const items = await activeClient.buscarRepositorios(params);
    return items.map((item) => {
      const repo = new Repositorio(item);
      return Object.assign(repo, {
        similarity: item.similarity,
        matchType: item.matchType
      });
    });
  }

  // ==========================================================================
  // MÉTODOS DE INSTANCIA
  // ==========================================================================

  /**
   * Actualiza los metadatos de este repositorio en el backend.
   */
  public async update(
    dto: UpdateRepositorioDto,
    client: ApiClient = api
  ): Promise<this> {
    const updated = await client.updateRepositorio(this.id, dto);
    Object.assign(this, updated);
    return this;
  }

  /**
   * Elimina este repositorio del backend.
   */
  public async delete(client: ApiClient = api): Promise<boolean> {
    const res = await client.deleteRepositorio(this.id);
    return res.success;
  }

  /**
   * Recarga los datos actualizados desde el backend.
   */
  public async refresh(client: ApiClient = api): Promise<this> {
    const fresh = await client.getRepositorioById(this.id);
    Object.assign(this, fresh);
    return this;
  }

  public toJSON(): IRepositorio {
    return {
      id: this.id,
      nom_arch: this.nom_arch,
      ruta_arch: this.ruta_arch,
      categoria: this.categoria,
      descripcion: this.descripcion,
      resumen: this.resumen,
      palabras_clave: this.palabras_clave,
      contexto: this.contexto,
      embedding: this.embedding
    };
  }
}

export default Repositorio;
