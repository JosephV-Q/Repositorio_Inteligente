import rolesData from './roles.json';

/**
 * Estructura del JSON de configuración base de roles y permisos:
 * Clave (key): Nombre del rol
 * Valor (value): Array de strings con los endpoints permitidos
 */
export type RolesPermissionsConfig = Record<string, string[]>;

export type RoleName = 'admin' | 'editor' | 'usuario' | 'invitado' | string;

export const ROLES_PERMISSIONS: RolesPermissionsConfig = rolesData as RolesPermissionsConfig;

/**
 * Mapeo entre IDs numéricos de la base de datos y nombres de rol
 */
export const ROLE_ID_TO_NAME: Record<number, string> = {
  1: 'admin',
  2: 'editor',
  3: 'usuario',
  4: 'invitado'
};

export const ROLE_NAME_TO_ID: Record<string, number> = {
  admin: 1,
  editor: 2,
  usuario: 3,
  invitado: 4
};

/**
 * Obtiene la lista de endpoints permitidos para un rol específico (por nombre o ID numérico)
 */
export function getPermissionsForRole(role: string | number): string[] {
  const roleName = typeof role === 'number' ? (ROLE_ID_TO_NAME[role] || 'invitado') : role.toLowerCase();
  return ROLES_PERMISSIONS[roleName] || [];
}

/**
 * Comprueba si un rol tiene permiso para acceder a un endpoint específico
 */
export function isEndpointAllowed(
  role: string | number,
  requestPath: string,
  customPermissions?: string[]
): boolean {
  const cleanPath = (requestPath || '').split('?')[0].replace(/\/+$/, '') || '/';
  const permissions = customPermissions || getPermissionsForRole(role);

  // Acceso total con comodín
  if (permissions.includes('*')) {
    return true;
  }

  // Coincidencia exacta
  if (permissions.includes(cleanPath)) {
    return true;
  }

  // Coincidencia de rutas parametrizadas (ej: /api/usuarios/5 coincide con /api/usuarios/:id)
  return permissions.some((perm) => {
    if (perm.endsWith('*')) {
      const prefix = perm.slice(0, -1);
      return cleanPath.startsWith(prefix);
    }

    if (perm.includes(':')) {
      const regexPattern = '^' + perm.replace(/:[a-zA-Z0-9_]+/g, '[^/]+') + '$';
      return new RegExp(regexPattern).test(cleanPath);
    }

    return false;
  });
}

export default {
  ROLES_PERMISSIONS,
  ROLE_ID_TO_NAME,
  ROLE_NAME_TO_ID,
  getPermissionsForRole,
  isEndpointAllowed
};
