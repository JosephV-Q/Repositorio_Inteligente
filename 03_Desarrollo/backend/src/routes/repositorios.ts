import { Router } from 'express';
import {
  requestUploadUrl,
  getDriveConfigStatus,
  createRepositorio,
  getRepositorios,
  getRepositorioById,
  updateRepositorio,
  deleteRepositorio
} from '../controllers/repositorios.controller.js';

const router = Router();

// 1. Solicitar enlace prefirmado de subida directa a Google Drive
router.post('/upload-url', requestUploadUrl);
router.post('/drive/upload-url', requestUploadUrl);

// 2. Estado de configuración de la cuenta común de Google Drive
router.get('/drive/status', getDriveConfigStatus);

// 3. Registrar metadatos del archivo subido en la base de datos
router.post('/', createRepositorio);

// 4. Listar repositorios (con filtros opcionales: categoria, nom_arch, palabra_clave, contexto, limit, offset)
router.get('/', getRepositorios);

// 5. Consultar un repositorio específico por ID
router.get('/:id', getRepositorioById);

// 6. Actualizar metadatos de un repositorio por ID
router.put('/:id', updateRepositorio);

// 7. Eliminar un registro de repositorio por ID
router.delete('/:id', deleteRepositorio);

export default router;
