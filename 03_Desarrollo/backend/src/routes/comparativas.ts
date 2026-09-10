import { Router } from 'express';
import {
  getComparativas,
  getComparativaById,
  createComparativa,
  updateComparativa,
  addUrlToComparativa,
  removeUrlFromComparativa,
  deleteComparativa
} from '../controllers/comparativas.controller.js';

const router = Router();

// 1. Listar o buscar comparativas (con filtros: titulo, categoria, contexto, url, limit, offset)
router.get('/', getComparativas);

// 2. Obtener una comparativa por ID
router.get('/:id', getComparativaById);

// 3. Crear una nueva comparativa
router.post('/', createComparativa);

// 4. Actualizar comparativa por ID
router.put('/:id', updateComparativa);

// 5. Añadir una URL al array de URLs
router.post('/:id/urls', addUrlToComparativa);

// 6. Eliminar una URL del array de URLs
router.delete('/:id/urls', removeUrlFromComparativa);

// 7. Eliminar un registro de comparativa por ID
router.delete('/:id', deleteComparativa);

export default router;
