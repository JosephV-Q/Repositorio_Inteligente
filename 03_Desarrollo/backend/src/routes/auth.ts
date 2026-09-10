import { Router } from 'express';
import {
  login,
  register,
  getInvitationDetails,
  getCurrentUser,
  validateSession,
  getTestSessionToken
} from '../controllers/auth.controller.js';

const router = Router();

/**
 * Rutas de Autenticación Públicas
 */
router.post('/login', login);
router.post('/register', register);
router.get('/invitacion/:token', getInvitationDetails);

/**
 * Rutas de Sesión y Perfil
 */
router.get('/me', getCurrentUser);
router.get('/session', getCurrentUser);
router.post('/session', validateSession);
router.post('/validate-session', validateSession);
router.get('/validate-session', validateSession);

/**
 * Token de prueba para testing y desarrollo
 */
router.get('/test-token', getTestSessionToken);

export default router;
