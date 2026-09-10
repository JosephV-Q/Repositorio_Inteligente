import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import healthRoutes from './health.js';
import usuariosRoutes from './usuarios.js';
import geminiRoutes from './gemini.js';
import invitacionesRoutes from './invitaciones.js';
import authRoutes from './auth.js';
import rolesRoutes from './roles.js';
import repositoriosRoutes from './repositorios.js';
import configuracionRoutes from './configuracion.js';
import comparativasRoutes from './comparativas.js';

const mainRouter = Router();

// Middleware de autenticación y autorización (RBAC) para toda la API
mainRouter.use('/api', authMiddleware);

// Subrutas bajo /api
mainRouter.use('/api', healthRoutes);
mainRouter.use('/api/usuarios', usuariosRoutes);
mainRouter.use('/api/gemini', geminiRoutes);
mainRouter.use('/api/invitaciones', invitacionesRoutes);
mainRouter.use('/api/auth', authRoutes);
mainRouter.use('/api/roles', rolesRoutes);
mainRouter.use('/api/repositorios', repositoriosRoutes);
mainRouter.use('/api/configuracion', configuracionRoutes);
mainRouter.use('/api/comparativas', comparativasRoutes);

export default mainRouter;
