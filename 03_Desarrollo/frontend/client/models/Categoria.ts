import { api, ApiClient } from '../ApiClient.js';
import type {
  CategoriaDetalle,
  CategoriaUpdateResult,
  CategoriaDeleteResult,
  CreateCategoriaDto,
  UpdateCategoriaDto
} from '../ApiClient.js';

/**
 * ============================================================================
 * CLASE MODELO: Categoria (Frontend)
 * ============================================================================
 * 
 * Representa una categoría del sistema en el frontend.
 * Proporciona métodos de instancia y métodos estáticos tipo Active-Record
 * para interactuar directamente con la API REST de forma orientada a objetos.
 * 
 * @example
 * // Listar todas las categorías:
 * const categorias = await Categoria.fetchAll();
 * 
 * // Crear una nueva categoría:
 * const nueva = await Categoria.create('Inteligencia Artificial');
 * 
 * // Renombrar la categoría y actualizar referencias:
 * await nueva.rename('IA & Machine Learning', true);
 * 
 * // Eliminar categoría (reasignando documentos a 'General'):
 * await nueva.delete('General');
 */
export class Categoria {
  public nombre: string;
  public repositoriosCount: number;
  public comparativasCount: number;

  constructor(
    data: string | { nombre: string; repositoriosCount?: number; comparativasCount?: number }
  ) {
    if (typeof data === 'string') {
      this.nombre = data.trim();
      this.repositoriosCount = 0;
      this.comparativasCount = 0;
    } else {
      this.nombre = (data.nombre || '').trim();
      this.repositoriosCount = data.repositoriosCount ?? 0;
      this.comparativasCount = data.comparativasCount ?? 0;
    }
  }

  // ==========================================================================
  // MÉTODOS ESTÁTICOS (CRUD)
  // ==========================================================================

  /**
   * Obtiene la lista de todas las categorías disponibles desde el backend.
   * @param search Filtro opcional por texto
   * @param client Instancia de ApiClient (usa 'api' por defecto)
   */
  public static async fetchAll(
    search?: string,
    client: ApiClient = api
  ): Promise<Categoria[]> {
    const nombres = await client.getCategorias(search);
    return nombres.map((nom) => new Categoria(nom));
  }

  /**
   * Obtiene el detalle de una categoría por su nombre, incluyendo conteos de uso.
   * @param nombre Nombre de la categoría
   * @param client Instancia de ApiClient
   */
  public static async fetchByName(
    nombre: string,
    client: ApiClient = api
  ): Promise<Categoria> {
    const detalle: CategoriaDetalle = await client.getCategoriaDetalle(nombre);
    return new Categoria(detalle);
  }

  /**
   * Crea una nueva categoría en el backend y retorna su instancia.
   * @param data Nombre de la categoría o DTO de creación
   * @param client Instancia de ApiClient
   */
  public static async create(
    data: string | CreateCategoriaDto,
    client: ApiClient = api
  ): Promise<Categoria> {
    const nombre = typeof data === 'string' ? data : data.nombre;
    const res = await client.createCategoria(nombre);
    return new Categoria(res.nombre);
  }

  // ==========================================================================
  // MÉTODOS DE INSTANCIA
  // ==========================================================================

  /**
   * Renombra la categoría en el backend y actualiza las referencias en repositorios y comparativas.
   * @param nuevoNombre Nuevo nombre para la categoría
   * @param actualizarReferencias Si es true (por defecto), actualiza en cascada los documentos
   * @param client Instancia de ApiClient
   */
  public async rename(
    nuevoNombre: string,
    actualizarReferencias: boolean = true,
    client: ApiClient = api
  ): Promise<CategoriaUpdateResult> {
    const res = await client.updateCategoria(this.nombre, nuevoNombre, actualizarReferencias);
    this.nombre = res.nuevoNombre;
    return res;
  }

  /**
   * Elimina esta categoría del backend.
   * @param reassignTo Categoría opcional a la que se reasignarán los documentos asociados
   * @param client Instancia de ApiClient
   */
  public async delete(
    reassignTo?: string,
    client: ApiClient = api
  ): Promise<CategoriaDeleteResult> {
    const res = await client.deleteCategoria(this.nombre, reassignTo);
    return res;
  }

  /**
   * Recarga las estadísticas de uso (repositorios y comparativas asociados).
   */
  public async refresh(client: ApiClient = api): Promise<void> {
    const detalle = await client.getCategoriaDetalle(this.nombre);
    this.repositoriosCount = detalle.repositoriosCount;
    this.comparativasCount = detalle.comparativasCount;
  }

  /**
   * Retorna una representación plana en JSON de la categoría.
   */
  public toJSON(): { nombre: string; repositoriosCount: number; comparativasCount: number } {
    return {
      nombre: this.nombre,
      repositoriosCount: this.repositoriosCount,
      comparativasCount: this.comparativasCount
    };
  }

  public toString(): string {
    return this.nombre;
  }
}

export default Categoria;
