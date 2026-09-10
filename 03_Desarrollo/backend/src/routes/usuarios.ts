import { Router } from 'express';
import {
  checkDbStatus,
  getUsuarios,
  getUsuarioById,
  getUsuarioByGmail,
  createUsuario,
  updateUsuario,
  updateUsuarioRol,
  deleteUsuario
} from '../controllers/usuarios.controller.js';

const router = Router();

// 1. Verificación del estado de conexión con Neon DB
router.get('/db-status', checkDbStatus);

// 2. Búsqueda por propiedad específica (correo/gmail)
router.get('/buscar/gmail/:gmail', getUsuarioByGmail);

// 3. CRUD Básico: Leer todos (con query params opcionales: ?nombre=&rol=&limit=&offset=)
router.get('/', getUsuarios);

// 4. CRUD Básico: Leer por ID
router.get('/:id', getUsuarioById);

// 5. CRUD Básico: Crear usuario
router.post('/', createUsuario);

// 6. CRUD Básico: Actualizar usuario completo o parcial
router.put('/:id', updateUsuario);

// 7. Modificación por propiedad específica (por ejemplo, cambiar solo el rol)
router.patch('/:id/rol', updateUsuarioRol);

// 8. CRUD Básico: Eliminar usuario
router.delete('/:id', deleteUsuario);

export default router;
