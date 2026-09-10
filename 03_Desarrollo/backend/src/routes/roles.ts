import { Router } from 'express';
import {
  getRoles,
  getRoleById,
  createRol,
  updateRol,
  addPermisoToRol,
  deleteRol,
  syncRoles
} from '../controllers/roles.controller.js';

const router = Router();

// 1. Consultar todos los roles o filtrar (?nombre=...)
router.get('/', getRoles);

// 2. Sincronizar roles con roles.json bajo demanda
router.post('/sync', syncRoles);

// 3. Consultar un rol específico por ID
router.get('/:id', getRoleById);

// 4. Crear un nuevo rol
router.post('/', createRol);

// 5. Actualizar un rol por ID
router.put('/:id', updateRol);

// 6. Añadir un permiso a un rol
router.post('/:id/permisos', addPermisoToRol);

// 7. Eliminar un rol por ID
router.delete('/:id', deleteRol);

export default router;
