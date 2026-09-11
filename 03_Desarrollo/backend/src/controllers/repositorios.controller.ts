import { Request, Response } from 'express';
import {
  RepositoriosModule,
  Repositorio,
  CreateRepositorioDto,
  UpdateRepositorioDto,
  ConfiguracionModule
} from '../modules/index.js';
import {
  createDriveUploadUrl,
  getDriveFileMetadata,
  isGoogleDriveConfigured
} from '../drive/index.js';
import {
  analyzeDocumentText,
  generateEmbedding,
  DocumentAnalysisResult
} from '../gemini/index.js';

/**
 * 1. Genera un enlace prefirmado de Google Drive para subida directa
 * POST /api/repositorios/upload-url
 * Body: { fileName: string, mimeType?: string, fileSize?: number, folderId?: string }
 * 
 * NOTA DE ARQUITECTURA:
 * El archivo NO pasa por este servidor. El cliente obtiene 'uploadUrl'
 * y hace un HTTP PUT directamente a los servidores de Google Drive.
 */
export async function requestUploadUrl(req: Request, res: Response): Promise<void> {
  try {
    const { fileName, mimeType, fileSize, folderId, origin: bodyOrigin } = req.body;

    if (!fileName || typeof fileName !== 'string' || fileName.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'El campo "fileName" es obligatorio.',
        example: {
          fileName: 'informe_financiero_2026.pdf',
          mimeType: 'application/pdf',
          fileSize: 2048500
        }
      });
      return;
    }

    const envOrigin =
      process.env.FRONTEND_ORIGIN?.trim() ||
      process.env.CLIENT_ORIGIN?.trim() ||
      process.env.FRONTEND_URL?.trim();

    // Determinar origen del cliente para configurar CORS en Google Drive (Access-Control-Allow-Origin)
    let clientOrigin: string | undefined;
    if (bodyOrigin && typeof bodyOrigin === 'string' && bodyOrigin.trim().length > 0) {
      clientOrigin = bodyOrigin.trim();
    } else if (req.headers.origin && typeof req.headers.origin === 'string') {
      clientOrigin = req.headers.origin.trim();
    } else if (req.headers.referer && typeof req.headers.referer === 'string') {
      try {
        clientOrigin = new URL(req.headers.referer).origin;
      } catch {
        // Ignorar si el referer no es una URL parseable
      }
    } else if (envOrigin) {
      clientOrigin = envOrigin;
    }

    const driveResult = await createDriveUploadUrl({
      fileName: fileName.trim(),
      mimeType: mimeType ? String(mimeType).trim() : undefined,
      fileSize: fileSize !== undefined ? Number(fileSize) : undefined,
      folderId: folderId ? String(folderId).trim() : undefined,
      origin: clientOrigin
    });

    if (!driveResult.success) {
      res.status(502).json({
        success: false,
        error: 'Error al generar la URL de subida con Google Drive.',
        details: driveResult.error
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Enlace de subida directa generado exitosamente con Google Drive.',
      uploadUrl: driveResult.uploadUrl,
      fileName: driveResult.fileName,
      mimeType: driveResult.mimeType,
      expiresInSeconds: driveResult.expiresInSeconds,
      instructions: driveResult.instructions
    });
  } catch (err: any) {
    console.error('⚠️ [Drive Upload URL Error]:', err?.message);
    res.status(500).json({
      success: false,
      error: 'Error interno al solicitar URL prefirmada de Google Drive.',
      details: err?.message
    });
  }
}

/**
 * 2. Comprueba el estado de configuración del almacenamiento de Google Drive
 * GET /api/repositorios/drive/status
 */
export async function getDriveConfigStatus(_req: Request, res: Response): Promise<void> {
  const status = isGoogleDriveConfigured();

  res.status(200).json({
    service: 'Google Drive Storage (Cuenta Común)',
    configured: status.configured,
    method: status.method,
    defaultFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID || 'Raíz (No especificada)'
  });
}

/**
 * 3. Registra el archivo subido en la tabla 'repositorios' de la base de datos
 * POST /api/repositorios
 * Body: {
 *   nom_arch: string,
 *   ruta_arch?: string,
 *   driveFileId?: string,
 *   categoria?: string,
 *   descripcion?: string,
 *   resumen?: string,
 *   palabras_clave?: string[],
 *   contexto?: string
 * }
 */
export async function createRepositorio(req: Request, res: Response): Promise<void> {
  try {
    const {
      nom_arch,
      ruta_arch,
      driveFileId,
      categoria,
      descripcion,
      resumen,
      palabras_clave,
      contexto
    } = req.body;

    if (!nom_arch || typeof nom_arch !== 'string') {
      res.status(400).json({
        success: false,
        error: 'El campo "nom_arch" es obligatorio.'
      });
      return;
    }

    // Determinar la ruta o enlace del archivo
    let finalRuta = ruta_arch ? String(ruta_arch).trim() : '';

    // Si se envía el ID de Google Drive retornado al cliente tras completar la subida:
    if (driveFileId && typeof driveFileId === 'string' && driveFileId.trim().length > 0) {
      try {
        const fileMeta = await getDriveFileMetadata(driveFileId.trim());
        finalRuta = fileMeta.webViewLink || fileMeta.webContentLink || `https://drive.google.com/file/d/${driveFileId.trim()}/view`;
      } catch {
        finalRuta = `https://drive.google.com/file/d/${driveFileId.trim()}/view`;
      }
    }

    if (!finalRuta) {
      res.status(400).json({
        success: false,
        error: 'Debes proporcionar "ruta_arch" (URL del archivo) o "driveFileId" (ID del archivo en Google Drive).'
      });
      return;
    }

    const dto: CreateRepositorioDto = {
      nom_arch: nom_arch.trim(),
      ruta_arch: finalRuta,
      categoria: categoria ? String(categoria).trim() : null,
      descripcion: descripcion ? String(descripcion).trim() : null,
      resumen: resumen ? String(resumen).trim() : null,
      palabras_clave: Array.isArray(palabras_clave) ? palabras_clave.map(String) : null,
      contexto: contexto ? String(contexto).trim() : null,
      embedding: req.body.embedding !== undefined ? req.body.embedding : undefined
    };

    // Verificar si ya existe por ruta_arch (mismo archivo o Drive URL) o por nombre exacto de archivo
    let existente: Repositorio | null = null;
    if (finalRuta && finalRuta !== 'texto-plano') {
      const porRuta = await RepositoriosModule.findByProperty('ruta_arch', finalRuta);
      if (porRuta.length > 0) {
        existente = porRuta[0];
      }
    }
    if (!existente && dto.nom_arch) {
      const porNombre = await RepositoriosModule.findByNomArch(dto.nom_arch, true);
      if (porNombre.length > 0) {
        existente = porNombre[0];
      }
    }

    let repositorioFinal: Repositorio;
    let yaExistia = false;

    if (existente && existente.id) {
      const actualizado = await RepositoriosModule.update(existente.id, {
        nom_arch: dto.nom_arch,
        ruta_arch: dto.ruta_arch,
        categoria: dto.categoria || existente.categoria,
        descripcion: dto.descripcion || existente.descripcion,
        resumen: dto.resumen || existente.resumen,
        palabras_clave: dto.palabras_clave && dto.palabras_clave.length > 0 ? dto.palabras_clave : existente.palabras_clave,
        contexto: dto.contexto || existente.contexto,
        embedding: dto.embedding !== undefined ? dto.embedding : existente.embedding
      });
      repositorioFinal = actualizado || existente;
      yaExistia = true;
    } else {
      repositorioFinal = await RepositoriosModule.create(dto);
    }

    res.status(yaExistia ? 200 : 201).json({
      success: true,
      message: yaExistia
        ? `El documento "${repositorioFinal.nom_arch}" ya existe en la base de datos (ID ${repositorioFinal.id}). Sus metadatos fueron actualizados sin duplicar el registro.`
        : 'Archivo registrado exitosamente en el repositorio.',
      data: repositorioFinal,
      alreadyExisted: yaExistia
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Error al registrar el archivo en el repositorio.',
      details: err?.message
    });
  }
}

/**
 * 4. Obtener lista de repositorios con paginación y filtros
 * GET /api/repositorios
 * Query params: limit, offset, categoria, nom_arch, palabra_clave, contexto
 */
export async function getRepositorios(req: Request, res: Response): Promise<void> {
  try {
    const { limit, offset, categoria, nom_arch, palabra_clave, contexto } = req.query;

    if (categoria || nom_arch || palabra_clave || contexto) {
      const repositorios = await RepositoriosModule.findWhere({
        categoria: categoria ? String(categoria) : undefined,
        nom_arch: nom_arch ? String(nom_arch) : undefined,
        palabra_clave: palabra_clave ? String(palabra_clave) : undefined,
        contexto: contexto ? String(contexto) : undefined
      });

      res.status(200).json({
        success: true,
        total: repositorios.length,
        data: repositorios
      });
      return;
    }

    const repositorios: Repositorio[] = await RepositoriosModule.findAll({
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
      orderBy: 'id',
      orderDirection: 'DESC'
    });

    res.status(200).json({
      success: true,
      total: repositorios.length,
      data: repositorios
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener repositorios.',
      details: err?.message
    });
  }
}

/**
 * 5. Obtener repositorio por ID
 * GET /api/repositorios/:id
 */
export async function getRepositorioById(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ success: false, error: 'El ID proporcionado no es un número válido.' });
      return;
    }

    const repositorio = await RepositoriosModule.findById(id);

    if (!repositorio) {
      res.status(404).json({ success: false, error: `Repositorio con ID ${id} no encontrado.` });
      return;
    }

    res.status(200).json({ success: true, data: repositorio });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Error al buscar el repositorio.',
      details: err?.message
    });
  }
}

/**
 * 6. Actualizar metadatos de un repositorio
 * PUT /api/repositorios/:id
 */
export async function updateRepositorio(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ success: false, error: 'El ID proporcionado no es un número válido.' });
      return;
    }

    const updateDto: UpdateRepositorioDto = req.body;
    const actualizado = await RepositoriosModule.update(id, updateDto);

    if (!actualizado) {
      res.status(404).json({ success: false, error: `Repositorio con ID ${id} no encontrado.` });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Repositorio actualizado exitosamente.',
      data: actualizado
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Error al actualizar el repositorio.',
      details: err?.message
    });
  }
}

/**
 * 7. Eliminar un repositorio por ID
 * DELETE /api/repositorios/:id
 */
export async function deleteRepositorio(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ success: false, error: 'El ID proporcionado no es un número válido.' });
      return;
    }

    const eliminado = await RepositoriosModule.delete(id);

    if (!eliminado) {
      res.status(404).json({ success: false, error: `Repositorio con ID ${id} no encontrado.` });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Repositorio con ID ${id} eliminado con éxito.`
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Error al eliminar el repositorio.',
      details: err?.message
    });
  }
}

/**
 * 8. Procesa el texto bruto de un documento con Gemini, genera metadatos, embedding y lo registra en repositorios
 * POST /api/repositorios/procesar-texto
 * Body: {
 *   texto: string (obligatorio),
 *   nom_arch?: string,
 *   ruta_arch?: string,
 *   driveFileId?: string,
 *   categoria?: string,
 *   contexto?: string
 * }
 */
export async function procesarTextoYCrearRepositorio(req: Request, res: Response): Promise<void> {
  try {
    const {
      texto,
      nom_arch,
      ruta_arch,
      driveFileId,
      categoria: categoriaManual,
      contexto: contextoManual,
      resumen: resumenManual,
      descripcion: descripcionManual,
      palabras_clave: palabrasClaveManual
    } = req.body;

    if (!texto || typeof texto !== 'string' || texto.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'El campo "texto" es obligatorio y debe contener el contenido del documento.'
      });
      return;
    }

    // 1. Obtener categorías disponibles en el sistema para orientar a la IA
    let availableCategories: string[] = [];
    try {
      const configs = await ConfiguracionModule.findAll({ limit: 1 });
      if (configs.length > 0 && Array.isArray(configs[0].categorias)) {
        availableCategories = configs[0].categorias;
      }
    } catch (catErr: any) {
      console.warn('⚠️ No se pudieron cargar categorías desde configuración:', catErr?.message);
    }

    // 2. Analizar el texto con Gemini para extraer metadatos estructurados
    // Si el cliente ya suministró un resumen sustancial y descripción validados, usarlos
    const hasValidManualSummary = typeof resumenManual === 'string' && resumenManual.trim().length >= 40;
    const hasValidManualDescription = typeof descripcionManual === 'string' && descripcionManual.trim().length >= 20;

    let analysis: DocumentAnalysisResult;
    if (hasValidManualSummary && hasValidManualDescription) {
      analysis = {
        nom_arch: nom_arch ? String(nom_arch).trim() : undefined,
        categoria: categoriaManual ? String(categoriaManual).trim() : undefined,
        descripcion: descripcionManual.trim(),
        resumen: resumenManual.trim(),
        palabras_clave: Array.isArray(palabrasClaveManual) ? palabrasClaveManual.map(String) : [],
        contexto: contextoManual ? String(contextoManual).trim() : 'General'
      };
    } else {
      analysis = await analyzeDocumentText(texto.trim(), {
        availableCategories,
        originalFileName: nom_arch ? String(nom_arch).trim() : undefined
      });

      // Si el cliente proveyó algún campo específico manualmente, priorizarlo sobre la IA
      if (hasValidManualSummary) {
        analysis.resumen = resumenManual.trim();
      }
      if (hasValidManualDescription) {
        analysis.descripcion = descripcionManual.trim();
      }
      if (Array.isArray(palabrasClaveManual) && palabrasClaveManual.length > 0) {
        analysis.palabras_clave = palabrasClaveManual.map(String);
      }
    }

    // 3. Generar embedding vectorial de 768 dimensiones
    const textToEmbed = `${analysis.resumen} ${analysis.descripcion} ${analysis.palabras_clave.join(' ')}`;
    let vectorEmbedding: number[] | null = null;
    try {
      vectorEmbedding = await generateEmbedding(textToEmbed);
    } catch (embedErr: any) {
      console.error('⚠️ Error al generar embedding con Gemini:', embedErr?.message);
    }

    // 4. Determinar enlace/ruta del archivo
    let finalRuta = ruta_arch ? String(ruta_arch).trim() : '';
    if (driveFileId && typeof driveFileId === 'string' && driveFileId.trim().length > 0) {
      try {
        const fileMeta = await getDriveFileMetadata(driveFileId.trim());
        finalRuta = fileMeta.webViewLink || fileMeta.webContentLink || `https://drive.google.com/file/d/${driveFileId.trim()}/view`;
      } catch {
        finalRuta = `https://drive.google.com/file/d/${driveFileId.trim()}/view`;
      }
    }

    if (!finalRuta) {
      finalRuta = 'texto-plano';
    }

    // 5. Preparar datos para registrar en la tabla 'repositorios'
    const finalNomArch = (nom_arch && typeof nom_arch === 'string' && nom_arch.trim().length > 0)
      ? nom_arch.trim()
      : (analysis.nom_arch || 'documento_analizado.pdf');

    const dto: CreateRepositorioDto = {
      nom_arch: finalNomArch,
      ruta_arch: finalRuta,
      categoria: categoriaManual ? String(categoriaManual).trim() : (analysis.categoria || null),
      descripcion: analysis.descripcion,
      resumen: analysis.resumen,
      palabras_clave: analysis.palabras_clave,
      contexto: contextoManual ? String(contextoManual).trim() : analysis.contexto,
      embedding: vectorEmbedding
    };

    // Verificar si ya existe un registro con esta misma ruta_arch o nombre para enriquecerlo sin duplicar
    let existente: Repositorio | null = null;
    if (finalRuta && finalRuta !== 'texto-plano') {
      const encontrados = await RepositoriosModule.findByProperty('ruta_arch', finalRuta);
      if (encontrados.length > 0) {
        existente = encontrados[0];
      }
    }
    if (!existente && finalNomArch) {
      const encontrados = await RepositoriosModule.findByNomArch(finalNomArch, true);
      if (encontrados.length > 0) {
        existente = encontrados[0];
      }
    }

    let nuevoRepositorio: Repositorio;
    if (existente) {
      const updated = await RepositoriosModule.update(existente.id, dto);
      nuevoRepositorio = updated || existente;
    } else {
      nuevoRepositorio = await RepositoriosModule.create(dto);
    }

    res.status(existente ? 200 : 201).json({
      success: true,
      message: existente
        ? `El documento "${nuevoRepositorio.nom_arch}" ya existe en el repositorio (ID ${nuevoRepositorio.id}). Se actualizaron sus metadatos y vector semántico sin duplicar el registro.`
        : 'Texto procesado por IA y registrado exitosamente en el repositorio.',
      analysis: {
        nom_arch_sugerido: analysis.nom_arch,
        categoria_asignada: dto.categoria,
        contexto_asignado: dto.contexto,
        embedding_generado: vectorEmbedding !== null
      },
      data: nuevoRepositorio,
      alreadyExisted: Boolean(existente)
    });
  } catch (err: any) {
    console.error('❌ Error en procesarTextoYCrearRepositorio:', err);
    res.status(500).json({
      success: false,
      error: 'Error al procesar el texto y registrar el repositorio con IA.',
      details: err?.message
    });
  }
}

/**
 * Realiza una búsqueda avanzada (semántica, híbrida o por texto) en repositorios de documentos
 * GET /api/repositorios/buscar?q=...&categoria=...&limit=...&minSimilarity=...&modo=...
 * POST /api/repositorios/buscar
 * Body: { texto?: string, query?: string, q?: string, categoria?: string, limit?: number, minSimilarity?: number, modo?: string, embedding?: number[] }
 */
export async function buscarRepositorios(req: Request, res: Response): Promise<void> {
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

    const resultados = await RepositoriosModule.buscar(queryText, {
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
    console.error('❌ Error en buscarRepositorios:', err);
    res.status(500).json({
      success: false,
      error: 'Error al realizar la búsqueda en repositorios.',
      details: err?.message
    });
  }
}

export default {
  requestUploadUrl,
  getDriveConfigStatus,
  createRepositorio,
  getRepositorios,
  getRepositorioById,
  updateRepositorio,
  deleteRepositorio,
  procesarTextoYCrearRepositorio,
  buscarRepositorios
};
