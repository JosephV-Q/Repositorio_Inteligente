import { Request, Response, NextFunction } from 'express';
import { verifySessionToken, SessionPayload } from '../utils/security.js';
import { isEndpointAllowed, ROLE_ID_TO_NAME } from '../config/roles.js';
import { RolesModule } from '../modules/index.js';

// Extendemos el tipo Request de Express para almacenar la sesión decodificada
declare global {
  namespace Express {
    interface Request {
      user?: SessionPayload;
    }
  }
}

/**
 * Lista de rutas públicas (no requieren autenticación obligatoria)
 */
export const PUBLIC_ROUTES: Array<string | RegExp> = [
  '/',
  '/api/health',
  '/api/hello',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/test-token',
  /^\/api\/auth\/invitacion\/[^/]+$/,
  /^\/api\/invitaciones\/token\/[^/]+$/
];

/**
 * Comprueba si una ruta es de acceso público
 */
export function isPublicPath(path: string): boolean {
  const cleanPath = (path || '').split('?')[0].replace(/\/+$/, '') || '/';
  return PUBLIC_ROUTES.some((route) => {
    if (typeof route === 'string') {
      return route === cleanPath;
    }
    return route.test(cleanPath);
  });
}

/**
 * Extrae el token de la solicitud HTTP (Authorization Bearer, x-session-token o query param)
 */
export function extractToken(req: Request): string | undefined {
  const authHeader = req.headers['authorization'];
  const customHeader = req.headers['x-session-token'];
  const queryToken = req.query?.token as string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  if (typeof customHeader === 'string' && customHeader.trim().length > 0) {
    return customHeader.trim();
  }
  if (typeof queryToken === 'string' && queryToken.trim().length > 0) {
    return queryToken.trim();
  }
  return undefined;
}

/**
 * Middleware global de autenticación y autorización (RBAC) para la API
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const fullRaw = req.originalUrl || (req.baseUrl + req.path) || req.path || '/';
  const targetPath = fullRaw.split('?')[0].replace(/\/+$/, '') || '/';

  // Permitir preflight OPTIONS sin exigir autenticación (CORS)
  if (req.method === 'OPTIONS') {
    return next();
  }

  // 1. Si la ruta es pública, permitimos el acceso sin exigir token
  if (isPublicPath(targetPath)) {
    const token = extractToken(req);
    if (token) {
      const session = verifySessionToken(token);
      if (session) {
        req.user = session;
      }
    }
    return next();
  }

  // 2. Extraer y verificar el token de sesión
  const token = extractToken(req);

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'No autenticado: Se requiere un token de sesión válido.',
      message: 'Debes incluir el token en la cabecera "Authorization: Bearer <token>" o "x-session-token".'
    });
    return;
  }

  const session = verifySessionToken(token);

  if (!session) {
    res.status(401).json({
      success: false,
      error: 'Sesión inválida o expirada.',
      message: 'La firma del token no coincide o ha caducado. Por favor inicia sesión nuevamente.'
    });
    return;
  }

  req.user = session;

  // 3. Verificación de autorización RBAC basada en roles y endpoints
  try {
    // Comprobar primero los permisos configurados en memoria (roles.json)
    let allowed = isEndpointAllowed(session.rol, targetPath);

    // Si no está permitido en memoria, consultar permisos dinámicos en la base de datos (con fallback silencioso)
    if (!allowed) {
      try {
        const dbRole = await RolesModule.findById(session.rol);
        if (dbRole && Array.isArray(dbRole.permisos_rol)) {
          allowed = isEndpointAllowed(session.rol, targetPath, dbRole.permisos_rol);
        }
      } catch {
        // En caso de fallo de conexión a DB, se respeta la denegación de roles.json
      }
    }

    if (!allowed) {
      const roleName = ROLE_ID_TO_NAME[session.rol] || `Rol ${session.rol}`;
      res.status(403).json({
        success: false,
        error: 'Acceso denegado (Forbidden).',
        message: `El rol "${roleName}" (ID: ${session.rol}) no tiene permisos para acceder al endpoint "${targetPath}".`,
        endpoint: targetPath,
        rol: session.rol
      });
      return;
    }

    next();
  } catch (err: any) {
    console.error('⚠️ [Auth Middleware Error]:', err?.message);
    res.status(500).json({
      success: false,
      error: 'Error interno en la verificación de permisos de usuario.',
      details: err?.message
    });
  }
}

/**
 * Middleware para exigir roles específicos en rutas puntuales (ej: requireRole('admin') o requireRole(1))
 */
export function requireRole(...allowedRoles: Array<string | number>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'No autenticado: Sesión no encontrada.'
      });
      return;
    }

    const userRole = req.user.rol;
    const userRoleName = ROLE_ID_TO_NAME[userRole];

    const isMatch = allowedRoles.some((r) => {
      if (typeof r === 'number') {
        return r === userRole;
      }
      return r.toLowerCase() === userRoleName?.toLowerCase();
    });

    if (!isMatch) {
      res.status(403).json({
        success: false,
        error: 'Acceso denegado: Rol insuficiente para esta operación.',
        requiredRoles: allowedRoles,
        userRole: userRoleName || userRole
      });
      return;
    }

    next();
  };
}

export default authMiddleware;
