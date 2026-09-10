import { Request, Response } from 'express';
import {
  RepositoriosModule,
  Repositorio,
  CreateRepositorioDto,
  UpdateRepositorioDto
} from '../modules/index.js';
import {
  createDriveUploadUrl,
  getDriveFileMetadata,
  isGoogleDriveConfigured
} from '../drive/index.js';

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
    const { fileName, mimeType, fileSize, folderId } = req.body;

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

    const driveResult = await createDriveUploadUrl({
      fileName: fileName.trim(),
      mimeType: mimeType ? String(mimeType).trim() : undefined,
      fileSize: fileSize !== undefined ? Number(fileSize) : undefined,
      folderId: folderId ? String(folderId).trim() : undefined
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
      contexto: contexto ? String(contexto).trim() : null
    };

    const nuevoRepositorio = await RepositoriosModule.create(dto);

    res.status(201).json({
      success: true,
      message: 'Archivo registrado exitosamente en el repositorio.',
      data: nuevoRepositorio
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

export default {
  requestUploadUrl,
  getDriveConfigStatus,
  createRepositorio,
  getRepositorios,
  getRepositorioById,
  updateRepositorio,
  deleteRepositorio
};
