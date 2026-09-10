import { Request, Response } from 'express';
import {
  ConfiguracionModule,
  Configuracion,
  CreateConfiguracionDto,
  UpdateConfiguracionDto
} from '../modules/index.js';

/**
 * Obtener todos los registros de configuración o filtrar por parámetros
 * GET /api/configuracion
 * Query params: ?nom_institucion=..., ?categoria=..., ?limit=..., ?offset=...
 */
export async function getConfiguraciones(req: Request, res: Response): Promise<void> {
  try {
    const { nom_institucion, categoria, limit, offset } = req.query;

    if (nom_institucion || categoria) {
      const configuraciones = await ConfiguracionModule.findWhere({
        nom_institucion: nom_institucion ? String(nom_institucion) : undefined,
        categoria: categoria ? String(categoria) : undefined
      });

      res.status(200).json({
        success: true,
        total: configuraciones.length,
        data: configuraciones
      });
      return;
    }

    const configuraciones: Configuracion[] = await ConfiguracionModule.findAll({
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
      orderBy: 'id',
      orderDirection: 'ASC'
    });

    res.status(200).json({
      success: true,
      total: configuraciones.length,
      data: configuraciones
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Error al consultar configuraciones.',
      details: err?.message
    });
  }
}

/**
 * Obtener una configuración por su ID
 * GET /api/configuracion/:id
 */
export async function getConfiguracionById(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ success: false, error: 'El ID debe ser un número entero válido.' });
      return;
    }

    const configuracion = await ConfiguracionModule.findById(id);

    if (!configuracion) {
      res.status(404).json({ success: false, error: `Configuración con ID ${id} no encontrada.` });
      return;
    }

    res.status(200).json({ success: true, data: configuracion });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Error al buscar configuración.',
      details: err?.message
    });
  }
}

/**
 * Crear un nuevo registro de configuración
 * POST /api/configuracion
 * Body: { nom_institucion: string, categorias?: string[] }
 */
export async function createConfiguracion(req: Request, res: Response): Promise<void> {
  try {
    const { nom_institucion, categorias } = req.body;

    if (!nom_institucion || typeof nom_institucion !== 'string' || nom_institucion.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'El campo "nom_institucion" es obligatorio.'
      });
      return;
    }

    const dto: CreateConfiguracionDto = {
      nom_institucion: nom_institucion.trim(),
      categorias: Array.isArray(categorias) ? categorias.map(String) : []
    };

    const nuevaConfiguracion = await ConfiguracionModule.create(dto);

    res.status(201).json({
      success: true,
      message: 'Configuración creada exitosamente.',
      data: nuevaConfiguracion
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Error al crear configuración.',
      details: err?.message
    });
  }
}

/**
 * Actualizar una configuración existente
 * PUT /api/configuracion/:id
 * Body: { nom_institucion?: string, categorias?: string[] }
 */
export async function updateConfiguracion(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ success: false, error: 'El ID debe ser un número válido.' });
      return;
    }

    const updateDto: UpdateConfiguracionDto = {};

    if (req.body.nom_institucion !== undefined) {
      updateDto.nom_institucion = String(req.body.nom_institucion).trim();
    }
    if (Array.isArray(req.body.categorias)) {
      updateDto.categorias = req.body.categorias.map(String);
    }

    const actualizada = await ConfiguracionModule.update(id, updateDto);

    if (!actualizada) {
      res.status(404).json({ success: false, error: `Configuración con ID ${id} no encontrada.` });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Configuración actualizada exitosamente.',
      data: actualizada
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Error al actualizar configuración.',
      details: err?.message
    });
  }
}

/**
 * Añadir una categoría a la configuración
 * POST /api/configuracion/:id/categorias
 * Body: { categoria: string }
 */
export async function addCategoriaToConfig(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    const { categoria } = req.body;

    if (isNaN(id) || !categoria || typeof categoria !== 'string') {
      res.status(400).json({ success: false, error: 'Se requiere ID válido y el campo "categoria" como texto.' });
      return;
    }

    const actualizada = await ConfiguracionModule.addCategoria(id, categoria.trim());

    if (!actualizada) {
      res.status(404).json({ success: false, error: `Configuración con ID ${id} no encontrada.` });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Categoría "${categoria.trim()}" agregada exitosamente.`,
      data: actualizada
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Error al agregar categoría.',
      details: err?.message
    });
  }
}

/**
 * Eliminar una categoría de la configuración
 * DELETE /api/configuracion/:id/categorias/:categoria
 */
export async function removeCategoriaFromConfig(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    const categoria = req.params.categoria || req.body?.categoria;

    if (isNaN(id) || !categoria) {
      res.status(400).json({ success: false, error: 'Se requiere ID válido y el nombre de la categoría a eliminar.' });
      return;
    }

    const actualizada = await ConfiguracionModule.removeCategoria(id, String(categoria).trim());

    if (!actualizada) {
      res.status(404).json({ success: false, error: `Configuración con ID ${id} no encontrada.` });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Categoría "${categoria}" eliminada exitosamente.`,
      data: actualizada
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Error al remover categoría.',
      details: err?.message
    });
  }
}

/**
 * Eliminar una configuración por su ID
 * DELETE /api/configuracion/:id
 */
export async function deleteConfiguracion(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ success: false, error: 'El ID debe ser un número válido.' });
      return;
    }

    const eliminada = await ConfiguracionModule.delete(id);

    if (!eliminada) {
      res.status(404).json({ success: false, error: `Configuración con ID ${id} no encontrada.` });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Configuración con ID ${id} eliminada exitosamente.`
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Error al eliminar configuración.',
      details: err?.message
    });
  }
}

export default {
  getConfiguraciones,
  getConfiguracionById,
  createConfiguracion,
  updateConfiguracion,
  addCategoriaToConfig,
  removeCategoriaFromConfig,
  deleteConfiguracion
};
