import { Router } from 'express';
import {
  getInvitaciones,
  getInvitacionById,
  getInvitacionByToken,
  createInvitacion,
  updateInvitacion,
  updateInvitacionRol,
  updateInvitacionCorreo,
  deleteInvitacion
} from '../controllers/invitaciones.controller.js';

const router = Router();

// 1. Validar / buscar por token único
router.get('/token/:token', getInvitacionByToken);

// 2. Listar todas o filtrar (?correo=&rol=&limit=&offset=)
router.get('/', getInvitaciones);

// 3. Buscar por ID
router.get('/:id', getInvitacionById);

// 4. Crear nueva invitación
router.post('/', createInvitacion);

// 5. Actualizar invitación por ID
router.put('/:id', updateInvitacion);

// 6. Modificar propiedad específica: Rol
router.patch('/:id/rol', updateInvitacionRol);

// 7. Modificar propiedad específica: Correo
router.patch('/:id/correo', updateInvitacionCorreo);

// 8. Eliminar invitación por ID
router.delete('/:id', deleteInvitacion);

export default router;
