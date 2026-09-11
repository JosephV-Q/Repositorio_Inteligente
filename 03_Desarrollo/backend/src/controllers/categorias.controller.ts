import { Request, Response } from 'express';
import { CategoriasModule } from '../modules/index.js';

/**
 * 1. Obtener lista de todas las categorías disponibles
 * GET /api/categorias
 * Query params opcionales: ?search=texto
 */
export async function getCategorias(req: Request, res: Response): Promise<void> {
  try {
    const { search } = req.query;
    let categorias = await CategoriasModule.getAll();

    if (search && typeof search === 'string' && search.trim().length > 0) {
      const term = search.trim().toLowerCase();
      categorias = categorias.filter((c) => c.toLowerCase().includes(term));
    }

    res.status(200).json({
      success: true,
      total: categorias.length,
      data: categorias
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Error al consultar las categorías.',
      details: err?.message
    });
  }
}

/**
 * 2. Obtener detalle de una categoría por nombre (con estadísticas de uso)
 * GET /api/categorias/:nombre
 */
export async function getCategoriaByName(req: Request, res: Response): Promise<void> {
  try {
    const { nombre } = req.params;

    if (!nombre || typeof nombre !== 'string' || nombre.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'El nombre de la categoría es obligatorio.'
      });
      return;
    }

    const detalle = await CategoriasModule.getByName(nombre);

    if (!detalle) {
      res.status(404).json({
        success: false,
        error: `Categoría "${nombre}" no encontrada.`
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: detalle
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener detalle de la categoría.',
      details: err?.message
    });
  }
}

/**
 * 3. Crear o registrar una nueva categoría
 * POST /api/categorias
 * Body: { nombre: string } o { categoria: string }
 */
export async function createCategoria(req: Request, res: Response): Promise<void> {
  try {
    const rawNombre = req.body.nombre || req.body.categoria;

    if (!rawNombre || typeof rawNombre !== 'string' || rawNombre.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'El campo "nombre" (o "categoria") es obligatorio y no puede estar vacío.'
      });
      return;
    }

    const resultado = await CategoriasModule.create(rawNombre);

    res.status(201).json({
      success: true,
      message: `Categoría "${resultado.nombre}" creada exitosamente.`,
      data: resultado
    });
  } catch (err: any) {
    const isConflict = err?.message?.includes('ya existe');
    res.status(isConflict ? 409 : 500).json({
      success: false,
      error: err?.message || 'Error al crear categoría.'
    });
  }
}

/**
 * 4. Actualizar o renombrar una categoría existente
 * PUT /api/categorias/:nombre
 * Body: { nuevoNombre: string, actualizarReferencias?: boolean }
 */
export async function updateCategoria(req: Request, res: Response): Promise<void> {
  try {
    const { nombre } = req.params;
    const rawNuevoNombre = req.body.nuevoNombre || req.body.nuevo_nombre || req.body.nombre;
    const actualizarReferencias = req.body.actualizarReferencias !== false; // true por defecto

    if (!nombre || typeof nombre !== 'string' || nombre.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'El nombre actual de la categoría es obligatorio en la URL.'
      });
      return;
    }

    if (!rawNuevoNombre || typeof rawNuevoNombre !== 'string' || rawNuevoNombre.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Debes proporcionar "nuevoNombre" en el cuerpo de la petición.'
      });
      return;
    }

    const resultado = await CategoriasModule.update(
      nombre,
      rawNuevoNombre,
      actualizarReferencias
    );

    res.status(200).json({
      success: true,
      message: `Categoría "${resultado.nombreAnterior}" actualizada a "${resultado.nuevoNombre}".`,
      data: resultado
    });
  } catch (err: any) {
    const isNotFound = err?.message?.includes('no existe');
    const isConflict = err?.message?.includes('Ya existe');
    const status = isNotFound ? 404 : isConflict ? 409 : 500;

    res.status(status).json({
      success: false,
      error: err?.message || 'Error al actualizar categoría.'
    });
  }
}

/**
 * 5. Eliminar una categoría
 * DELETE /api/categorias/:nombre
 * Query / Body opcional: ?reassignTo=OtraCategoria
 */
export async function deleteCategoria(req: Request, res: Response): Promise<void> {
  try {
    const { nombre } = req.params;
    const reassignTo = (req.query.reassignTo as string) || req.body?.reassignTo || req.body?.reasignarA;

    if (!nombre || typeof nombre !== 'string' || nombre.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'El nombre de la categoría a eliminar es obligatorio en la URL.'
      });
      return;
    }

    const resultado = await CategoriasModule.delete(
      nombre,
      reassignTo ? String(reassignTo).trim() : undefined
    );

    res.status(200).json({
      success: true,
      message: `Categoría "${resultado.eliminada}" eliminada exitosamente.`,
      data: resultado
    });
  } catch (err: any) {
    const isNotFound = err?.message?.includes('no existe');
    res.status(isNotFound ? 404 : 500).json({
      success: false,
      error: err?.message || 'Error al eliminar categoría.'
    });
  }
}

export default {
  getCategorias,
  getCategoriaByName,
  createCategoria,
  updateCategoria,
  deleteCategoria
};
