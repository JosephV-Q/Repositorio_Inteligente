import { Request, Response } from 'express';
import {
  ComparativasModule,
  Comparativa,
  CreateComparativaDto,
  UpdateComparativaDto
} from '../modules/index.js';
import { generateEmbedding } from '../gemini/index.js';

/**
 * Obtener todas las comparativas o filtrar según query params
 * GET /api/comparativas
 * Query params: ?titulo=..., ?categoria=..., ?contexto=..., ?url=..., ?limit=..., ?offset=...
 */
export async function getComparativas(req: Request, res: Response): Promise<void> {
  try {
    const { titulo, categoria, contexto, url, limit, offset } = req.query;

    if (titulo || categoria || contexto || url) {
      const comparativas = await ComparativasModule.findWhere({
        titulo: titulo ? String(titulo) : undefined,
        categoria: categoria ? String(categoria) : undefined,
        contexto: contexto ? String(contexto) : undefined,
        url: url ? String(url) : undefined
      });

      res.status(200).json({
        success: true,
        total: comparativas.length,
        data: comparativas
      });
      return;
    }

    const comparativas: Comparativa[] = await ComparativasModule.findAll({
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
      orderBy: 'id',
      orderDirection: 'DESC'
    });

    res.status(200).json({
      success: true,
      total: comparativas.length,
      data: comparativas
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Error al consultar comparativas.',
      details: err?.message
    });
  }
}

/**
 * Obtener una comparativa por su ID
 * GET /api/comparativas/:id
 */
export async function getComparativaById(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ success: false, error: 'El ID debe ser un número entero válido.' });
      return;
    }

    const comparativa = await ComparativasModule.findById(id);

    if (!comparativa) {
      res.status(404).json({ success: false, error: `Comparativa con ID ${id} no encontrada.` });
      return;
    }

    res.status(200).json({ success: true, data: comparativa });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Error al buscar comparativa.',
      details: err?.message
    });
  }
}

/**
 * Crear una nueva comparativa
 * POST /api/comparativas
 * Body: {
 *   titulo: string,
 *   urls?: string[],
 *   comparativa?: string,
 *   descripcion?: string,
 *   categoria?: string,
 *   contexto?: string
 * }
 */
export async function createComparativa(req: Request, res: Response): Promise<void> {
  try {
    const { titulo, urls, comparativa, descripcion, categoria, contexto } = req.body;

    if (!titulo || typeof titulo !== 'string' || titulo.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'El campo "titulo" es obligatorio.'
      });
      return;
    }

    const dto: CreateComparativaDto = {
      titulo: titulo.trim(),
      urls: Array.isArray(urls) ? urls.map(String) : [],
      comparativa: comparativa ? String(comparativa).trim() : null,
      descripcion: descripcion ? String(descripcion).trim() : null,
      categoria: categoria ? String(categoria).trim() : null,
      contexto: contexto ? String(contexto).trim() : null,
      embedding: req.body.embedding !== undefined ? req.body.embedding : undefined
    };

    if (!dto.embedding) {
      const textToEmbed = [
        dto.titulo,
        dto.descripcion || '',
        dto.comparativa || '',
        dto.categoria || '',
        dto.contexto || ''
      ].filter(Boolean).join(' - ');

      if (textToEmbed.trim().length > 0) {
        try {
          dto.embedding = await generateEmbedding(textToEmbed);
        } catch (embErr: any) {
          console.warn('⚠️ [createComparativa] No se pudo generar embedding automáticamente:', embErr?.message);
        }
      }
    }

    const nuevaComparativa = await ComparativasModule.create(dto);

    res.status(201).json({
      success: true,
      message: 'Comparativa creada exitosamente.',
      data: nuevaComparativa
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Error al crear comparativa.',
      details: err?.message
    });
  }
}

/**
 * Actualizar una comparativa por su ID
 * PUT /api/comparativas/:id
 */
export async function updateComparativa(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ success: false, error: 'El ID debe ser un número entero válido.' });
      return;
    }

    const updateDto: UpdateComparativaDto = {};

    if (req.body.titulo !== undefined) updateDto.titulo = String(req.body.titulo).trim();
    if (Array.isArray(req.body.urls)) updateDto.urls = req.body.urls.map(String);
    if (req.body.comparativa !== undefined) updateDto.comparativa = req.body.comparativa ? String(req.body.comparativa).trim() : null;
    if (req.body.descripcion !== undefined) updateDto.descripcion = req.body.descripcion ? String(req.body.descripcion).trim() : null;
    if (req.body.categoria !== undefined) updateDto.categoria = req.body.categoria ? String(req.body.categoria).trim() : null;
    if (req.body.contexto !== undefined) updateDto.contexto = req.body.contexto ? String(req.body.contexto).trim() : null;
    if (req.body.embedding !== undefined) updateDto.embedding = req.body.embedding;

    const actualizada = await ComparativasModule.update(id, updateDto);

    if (!actualizada) {
      res.status(404).json({ success: false, error: `Comparativa con ID ${id} no encontrada.` });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Comparativa actualizada exitosamente.',
      data: actualizada
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Error al actualizar comparativa.',
      details: err?.message
    });
  }
}

/**
 * Añadir una URL al array de URLs de una comparativa
 * POST /api/comparativas/:id/urls
 * Body: { url: string }
 */
export async function addUrlToComparativa(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    const { url } = req.body;

    if (isNaN(id) || !url || typeof url !== 'string') {
      res.status(400).json({ success: false, error: 'Se requiere un ID válido y el campo "url" como texto.' });
      return;
    }

    const actualizada = await ComparativasModule.addUrl(id, url.trim());

    if (!actualizada) {
      res.status(404).json({ success: false, error: `Comparativa con ID ${id} no encontrada.` });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'URL añadida exitosamente a la comparativa.',
      data: actualizada
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Error al agregar URL a la comparativa.',
      details: err?.message
    });
  }
}

/**
 * Eliminar una URL del array de URLs de una comparativa
 * DELETE /api/comparativas/:id/urls
 * Body o query: url
 */
export async function removeUrlFromComparativa(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    const url = (req.body?.url || req.query?.url) as string;

    if (isNaN(id) || !url) {
      res.status(400).json({ success: false, error: 'Se requiere ID válido y la "url" a remover.' });
      return;
    }

    const actualizada = await ComparativasModule.removeUrl(id, String(url).trim());

    if (!actualizada) {
      res.status(404).json({ success: false, error: `Comparativa con ID ${id} no encontrada.` });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'URL eliminada exitosamente de la comparativa.',
      data: actualizada
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Error al eliminar URL de la comparativa.',
      details: err?.message
    });
  }
}

/**
 * Eliminar una comparativa por su ID
 * DELETE /api/comparativas/:id
 */
export async function deleteComparativa(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ success: false, error: 'El ID debe ser un número válido.' });
      return;
    }

    const eliminada = await ComparativasModule.delete(id);

    if (!eliminada) {
      res.status(404).json({ success: false, error: `Comparativa con ID ${id} no encontrada.` });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Comparativa con ID ${id} eliminada exitosamente.`
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Error al eliminar comparativa.',
      details: err?.message
    });
  }
}

/**
 * Realiza una búsqueda (semántica, híbrida o texto) en comparativas
 * GET /api/comparativas/buscar?q=...&categoria=...&limit=...&minSimilarity=...&modo=...
 * POST /api/comparativas/buscar
 * Body: { texto?: string, query?: string, q?: string, categoria?: string, limit?: number, minSimilarity?: number, modo?: string, embedding?: number[] }
 */
export async function buscarComparativas(req: Request, res: Response): Promise<void> {
  try {
    const rawQuery = (
      req.query.q ||
      req.query.query ||
      req.query.texto ||
      req.body?.texto ||
      req.body?.query ||
      req.body?.q
    );

    const queryText = typeof rawQuery === 'string' ? rawQuery.trim() : '';

    const rawCategoria = req.query.categoria || req.body?.categoria;
    const categoria = rawCategoria ? String(rawCategoria).trim() : undefined;

    const rawLimit = req.query.limit || req.body?.limit;
    const limit = rawLimit ? Math.min(100, Math.max(1, Number(rawLimit))) : 10;

    const rawMinSim = req.query.minSimilarity || req.body?.minSimilarity;
    const minSimilarity = rawMinSim ? Number(rawMinSim) : 0;

    const rawModo = req.query.modo || req.body?.modo || 'hibrido';
    const modo = String(rawModo) as 'semantico' | 'hibrido' | 'texto';

    const embedding = req.body?.embedding;

    if (!queryText && !embedding) {
      res.status(400).json({
        success: false,
        error: 'Debes proporcionar un término de búsqueda ("texto", "query" o "q") o un "embedding".'
      });
      return;
    }

    const resultados = await ComparativasModule.buscar(queryText, {
      limit,
      minSimilarity,
      categoria,
      modo,
      embedding
    });

    res.status(200).json({
      success: true,
      query: queryText,
      total: resultados.length,
      modo,
      data: resultados
    });
  } catch (err: any) {
    console.error('❌ Error en buscarComparativas:', err);
    res.status(500).json({
      success: false,
      error: 'Error al realizar la búsqueda en comparativas.',
      details: err?.message
    });
  }
}

export default {
  getComparativas,
  getComparativaById,
  createComparativa,
  updateComparativa,
  addUrlToComparativa,
  removeUrlFromComparativa,
  deleteComparativa,
  buscarComparativas
};
