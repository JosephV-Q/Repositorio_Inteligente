import { Router } from 'express';
import {
  getCategorias,
  getCategoriaByName,
  createCategoria,
  updateCategoria,
  deleteCategoria
} from '../controllers/categorias.controller.js';

const router = Router();

// 1. Listar todas las categorías (admite ?search=...)
router.get('/', getCategorias);

// 2. Obtener detalle y estadísticas de uso de una categoría
router.get('/:nombre', getCategoriaByName);

// 3. Crear una nueva categoría
router.post('/', createCategoria);

// 4. Renombrar / Actualizar una categoría y sus referencias en cascada
router.put('/:nombre', updateCategoria);

// 5. Eliminar una categoría (con opción de reasignación ?reassignTo=...)
router.delete('/:nombre', deleteCategoria);

export default router;
