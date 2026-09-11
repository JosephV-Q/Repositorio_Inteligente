import { Router } from 'express';
import {
  getConfiguraciones,
  getConfiguracionById,
  createConfiguracion,
  updateConfiguracion,
  addCategoriaToConfig,
  removeCategoriaFromConfig,
  deleteConfiguracion
} from '../controllers/configuracion.controller.js';
import {
  getCategorias,
  createCategoria,
  updateCategoria,
  deleteCategoria
} from '../controllers/categorias.controller.js';

const router = Router();

// 1. Listar o buscar configuraciones
router.get('/', getConfiguraciones);

// 1.1 Rutas de conveniencia para gestión directa de categorías sin requerir ID
router.get('/categorias', getCategorias);
router.post('/categorias', createCategoria);
router.put('/categorias/:nombre', updateCategoria);
router.delete('/categorias/:nombre', deleteCategoria);

// 2. Obtener una configuración por ID
router.get('/:id', getConfiguracionById);

// 3. Crear una nueva configuración
router.post('/', createConfiguracion);

// 4. Actualizar configuración por ID
router.put('/:id', updateConfiguracion);

// 5. Añadir una categoría al array de categorías
router.post('/:id/categorias', addCategoriaToConfig);

// 6. Eliminar una categoría del array de categorías
router.delete('/:id/categorias/:categoria', removeCategoriaFromConfig);
router.delete('/:id/categorias', removeCategoriaFromConfig);

// 7. Eliminar un registro de configuración por ID
router.delete('/:id', deleteConfiguracion);

export default router;
