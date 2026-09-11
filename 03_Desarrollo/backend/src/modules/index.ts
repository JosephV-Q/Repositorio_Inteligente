/**
 * Exportación centralizada de módulos y tipos para todas las tablas de la base de datos
 */

// Módulo Usuarios
export * from './usuarios.js';
export { default as UsuariosModule } from './usuarios.js';

// Módulo Roles
export * from './roles.js';
export { default as RolesModule } from './roles.js';

// Módulo Repositorios
export * from './repositorios.js';
export { default as RepositoriosModule } from './repositorios.js';

// Módulo Configuración
export * from './configuracion.js';
export { default as ConfiguracionModule } from './configuracion.js';

// Módulo Comparativas
export * from './comparativas.js';
export { default as ComparativasModule } from './comparativas.js';

// Módulo Invitaciones
export * from './invitaciones.js';
export { default as InvitacionesModule } from './invitaciones.js';

// Módulo Categorías
export * from './categorias.js';
export { default as CategoriasModule } from './categorias.js';

import UsuariosModule from './usuarios.js';
import RolesModule from './roles.js';
import RepositoriosModule from './repositorios.js';
import ConfiguracionModule from './configuracion.js';
import ComparativasModule from './comparativas.js';
import InvitacionesModule from './invitaciones.js';
import CategoriasModule from './categorias.js';

export const dbModules = {
  usuarios: UsuariosModule,
  roles: RolesModule,
  repositorios: RepositoriosModule,
  configuracion: ConfiguracionModule,
  comparativas: ComparativasModule,
  invitaciones: InvitacionesModule,
  categorias: CategoriasModule
};

export default dbModules;
