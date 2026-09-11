import { query, queryOne } from '../db/index.js';
import { Configuracion } from './configuracion.js';

export interface CategoriaDetalle {
  nombre: string;
  repositoriosCount: number;
  comparativasCount: number;
}

export interface CategoriaUpdateResult {
  nombreAnterior: string;
  nuevoNombre: string;
  repositoriosActualizados: number;
  comparativasActualizadas: number;
  todas: string[];
}

export interface CategoriaDeleteResult {
  eliminada: string;
  reasignadaA: string | null;
  repositoriosAfectados: number;
  comparativasAfectadas: number;
  todas: string[];
}

/**
 * Módulo de gestión y CRUD para Categorías institucionales
 */
export const CategoriasModule = {
  /**
   * Asegura que exista al menos un registro de configuración en la BD
   */
  async ensureConfig(): Promise<Configuracion> {
    const existing = await queryOne<Configuracion>(
      'SELECT * FROM configuracion ORDER BY id ASC LIMIT 1;'
    );
    if (existing) {
      return existing;
    }

    const inserted = await queryOne<Configuracion>(`
      INSERT INTO configuracion (nom_institucion, categorias)
      VALUES ('Institución Principal', '{"General"}')
      RETURNING *;
    `);

    return inserted!;
  },

  /**
   * Obtiene la lista completa de categorías registradas
   */
  async getAll(): Promise<string[]> {
    const config = await this.ensureConfig();
    return Array.isArray(config.categorias) ? config.categorias : [];
  },

  /**
   * Comprueba si una categoría existe (insensible a mayúsculas)
   */
  async exists(nombre: string): Promise<boolean> {
    const categorias = await this.getAll();
    const target = nombre.trim().toLowerCase();
    return categorias.some((c) => c.toLowerCase() === target);
  },

  /**
   * Obtiene el detalle de una categoría y cuántos documentos/comparativas la usan
   */
  async getByName(nombre: string): Promise<CategoriaDetalle | null> {
    const cleanName = nombre.trim();
    const categorias = await this.getAll();
    const matched = categorias.find((c) => c.toLowerCase() === cleanName.toLowerCase());

    if (!matched) {
      return null;
    }

    const [reposRes, compRes] = await Promise.all([
      queryOne<{ count: string }>(
        'SELECT COUNT(*) as count FROM repositorios WHERE LOWER(categoria) = LOWER($1);',
        [matched]
      ),
      queryOne<{ count: string }>(
        'SELECT COUNT(*) as count FROM comparativas WHERE LOWER(categoria) = LOWER($1);',
        [matched]
      )
    ]);

    return {
      nombre: matched,
      repositoriosCount: parseInt(reposRes?.count || '0', 10),
      comparativasCount: parseInt(compRes?.count || '0', 10)
    };
  },

  /**
   * Crea / Agrega una nueva categoría
   */
  async create(nombre: string): Promise<{ nombre: string; todas: string[] }> {
    const cleanName = nombre.trim();
    if (!cleanName) {
      throw new Error('El nombre de la categoría no puede estar vacío.');
    }

    const config = await this.ensureConfig();
    const exists = await this.exists(cleanName);
    if (exists) {
      throw new Error(`La categoría "${cleanName}" ya existe en el sistema.`);
    }

    const text = `
      UPDATE configuracion
      SET categorias = array_append(categorias, $1)
      WHERE id = $2
      RETURNING *;
    `;
    const updated = await queryOne<Configuracion>(text, [cleanName, config.id]);
    const todas = updated ? updated.categorias : await this.getAll();

    return {
      nombre: cleanName,
      todas
    };
  },

  /**
   * Actualiza / Renombra una categoría existente y sincroniza referencias
   */
  async update(
    nombreAnterior: string,
    nuevoNombre: string,
    actualizarReferencias: boolean = true
  ): Promise<CategoriaUpdateResult> {
    const oldClean = nombreAnterior.trim();
    const newClean = nuevoNombre.trim();

    if (!oldClean || !newClean) {
      throw new Error('Debes proporcionar el nombre actual y el nuevo nombre de la categoría.');
    }

    if (oldClean.toLowerCase() === newClean.toLowerCase() && oldClean === newClean) {
      const todas = await this.getAll();
      return {
        nombreAnterior: oldClean,
        nuevoNombre: newClean,
        repositoriosActualizados: 0,
        comparativasActualizadas: 0,
        todas
      };
    }

    const config = await this.ensureConfig();
    const categorias = config.categorias || [];
    const index = categorias.findIndex((c) => c.toLowerCase() === oldClean.toLowerCase());

    if (index === -1) {
      throw new Error(`La categoría "${oldClean}" no existe.`);
    }

    // Verificar que el nuevo nombre no colisione con otra categoría existente
    const collision = categorias.find(
      (c, i) => i !== index && c.toLowerCase() === newClean.toLowerCase()
    );
    if (collision) {
      throw new Error(`Ya existe otra categoría con el nombre "${newClean}".`);
    }

    const exactOldName = categorias[index];

    // 1. Renombrar en el array de la tabla configuracion
    const text = `
      UPDATE configuracion
      SET categorias = array_replace(categorias, $1, $2)
      WHERE id = $3
      RETURNING *;
    `;
    const updated = await queryOne<Configuracion>(text, [exactOldName, newClean, config.id]);

    // 2. Si se solicita, actualizar referencias en 'repositorios' y 'comparativas'
    let reposCount = 0;
    let compCount = 0;

    if (actualizarReferencias) {
      const [reposRows, compRows] = await Promise.all([
        query<{ id: number }>(
          'UPDATE repositorios SET categoria = $1 WHERE LOWER(categoria) = LOWER($2) RETURNING id;',
          [newClean, exactOldName]
        ),
        query<{ id: number }>(
          'UPDATE comparativas SET categoria = $1 WHERE LOWER(categoria) = LOWER($2) RETURNING id;',
          [newClean, exactOldName]
        )
      ]);
      reposCount = reposRows.length;
      compCount = compRows.length;
    }

    return {
      nombreAnterior: exactOldName,
      nuevoNombre: newClean,
      repositoriosActualizados: reposCount,
      comparativasActualizadas: compCount,
      todas: updated ? updated.categorias : await this.getAll()
    };
  },

  /**
   * Elimina una categoría del sistema y opcionalmente reasigna los documentos asociados
   */
  async delete(
    nombre: string,
    reassignTo?: string
  ): Promise<CategoriaDeleteResult> {
    const cleanName = nombre.trim();
    if (!cleanName) {
      throw new Error('El nombre de la categoría es obligatorio.');
    }

    const config = await this.ensureConfig();
    const categorias = config.categorias || [];
    const exactMatch = categorias.find((c) => c.toLowerCase() === cleanName.toLowerCase());

    if (!exactMatch) {
      throw new Error(`La categoría "${cleanName}" no existe.`);
    }

    // Si se especificó reasignación, validar que la categoría destino exista
    let targetReassign: string | null = null;
    if (reassignTo && reassignTo.trim().length > 0) {
      const cleanReassign = reassignTo.trim();
      const targetMatch = categorias.find((c) => c.toLowerCase() === cleanReassign.toLowerCase());
      if (!targetMatch) {
        throw new Error(`La categoría de reasignación "${cleanReassign}" no existe.`);
      }
      if (targetMatch.toLowerCase() === exactMatch.toLowerCase()) {
        throw new Error('No puedes reasignar los documentos a la misma categoría que estás eliminando.');
      }
      targetReassign = targetMatch;
    }

    // 1. Remover del array en 'configuracion'
    const text = `
      UPDATE configuracion
      SET categorias = array_remove(categorias, $1)
      WHERE id = $2
      RETURNING *;
    `;
    const updated = await queryOne<Configuracion>(text, [exactMatch, config.id]);

    // 2. Reasignar o desvincular en repositorios y comparativas
    let reposCount = 0;
    let compCount = 0;

    const [reposRows, compRows] = await Promise.all([
      query<{ id: number }>(
        'UPDATE repositorios SET categoria = $1 WHERE LOWER(categoria) = LOWER($2) RETURNING id;',
        [targetReassign, exactMatch]
      ),
      query<{ id: number }>(
        'UPDATE comparativas SET categoria = $1 WHERE LOWER(categoria) = LOWER($2) RETURNING id;',
        [targetReassign, exactMatch]
      )
    ]);
    reposCount = reposRows.length;
    compCount = compRows.length;

    return {
      eliminada: exactMatch,
      reasignadaA: targetReassign,
      repositoriosAfectados: reposCount,
      comparativasAfectadas: compCount,
      todas: updated ? updated.categorias : await this.getAll()
    };
  }
};

export default CategoriasModule;
