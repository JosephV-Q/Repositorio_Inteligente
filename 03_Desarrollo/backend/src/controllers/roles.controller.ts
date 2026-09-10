import { Request, Response } from 'express';
import { RolesModule, Rol, CreateRolDto, UpdateRolDto } from '../modules/index.js';

/**
 * Obtener todos los roles de la base de datos (con opción de filtrar por nombre)
 * GET /api/roles
 * Query params opcionales: ?nombre=...
 */
export async function getRoles(req: Request, res: Response): Promise<void> {
  try {
    const { nombre } = req.query;

    if (nombre && typeof nombre === 'string') {
      const roles = await RolesModule.findByNombreRol(nombre);
      res.status(200).json({
        success: true,
        total: roles.length,
        data: roles
      });
      return;
    }

    const roles: Rol[] = await RolesModule.findAll({
      orderBy: 'id_roles',
      orderDirection: 'ASC'
    });

    res.status(200).json({
      success: true,
      total: roles.length,
      data: roles
    });
  } catch (err: any) {
    console.error('⚠️ [Roles Controller Error]:', err?.message);
    res.status(500).json({
      success: false,
      error: 'Error al consultar los roles en la base de datos.',
      details: err?.message
    });
  }
}

/**
 * Obtener un rol por su ID
 * GET /api/roles/:id
 */
export async function getRoleById(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        error: 'El ID proporcionado no es un número entero válido.'
      });
      return;
    }

    const rol = await RolesModule.findById(id);

    if (!rol) {
      res.status(404).json({
        success: false,
        error: `Rol con ID ${id} no encontrado en la base de datos.`
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: rol
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Error al buscar el rol.',
      details: err?.message
    });
  }
}

/**
 * Crear un nuevo rol en la base de datos
 * POST /api/roles
 * Body: { nombre_rol: string, permisos_rol?: string[] }
 */
export async function createRol(req: Request, res: Response): Promise<void> {
  try {
    const { nombre_rol, permisos_rol } = req.body;

    if (!nombre_rol || typeof nombre_rol !== 'string' || nombre_rol.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'El campo "nombre_rol" es obligatorio.'
      });
      return;
    }

    const cleanName = nombre_rol.trim().toLowerCase();

    // Comprobar si ya existe un rol con ese nombre
    const existentes = await RolesModule.findByNombreRol(cleanName, true);
    if (existentes.length > 0) {
      res.status(409).json({
        success: false,
        error: `Ya existe un rol con el nombre "${cleanName}".`
      });
      return;
    }

    const dto: CreateRolDto = {
      nombre_rol: cleanName,
      permisos_rol: Array.isArray(permisos_rol) ? permisos_rol : []
    };

    const nuevoRol = await RolesModule.create(dto);

    res.status(201).json({
      success: true,
      message: 'Rol creado exitosamente.',
      data: nuevoRol
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Error al crear el rol.',
      details: err?.message
    });
  }
}

/**
 * Actualizar un rol por su ID
 * PUT /api/roles/:id
 * Body: { nombre_rol?: string, permisos_rol?: string[] }
 */
export async function updateRol(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ success: false, error: 'El ID debe ser un número entero válido.' });
      return;
    }

    const updateDto: UpdateRolDto = {};

    if (req.body.nombre_rol !== undefined) {
      updateDto.nombre_rol = String(req.body.nombre_rol).trim().toLowerCase();
    }
    if (req.body.permisos_rol !== undefined) {
      updateDto.permisos_rol = Array.isArray(req.body.permisos_rol) ? req.body.permisos_rol : [];
    }

    const rolActualizado = await RolesModule.update(id, updateDto);

    if (!rolActualizado) {
      res.status(404).json({ success: false, error: `Rol con ID ${id} no encontrado.` });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Rol actualizado exitosamente.',
      data: rolActualizado
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Error al actualizar el rol.',
      details: err?.message
    });
  }
}

/**
 * Añadir un permiso a un rol existente
 * POST /api/roles/:id/permisos
 * Body: { permiso: string }
 */
export async function addPermisoToRol(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    const { permiso } = req.body;

    if (isNaN(id) || !permiso || typeof permiso !== 'string') {
      res.status(400).json({ success: false, error: 'Se requiere ID numérico y el campo "permiso" como texto.' });
      return;
    }

    const rolActualizado = await RolesModule.addPermiso(id, permiso.trim());

    if (!rolActualizado) {
      res.status(404).json({ success: false, error: `Rol con ID ${id} no encontrado.` });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Permiso "${permiso.trim()}" agregado al rol.`,
      data: rolActualizado
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Error al agregar permiso al rol.',
      details: err?.message
    });
  }
}

/**
 * Eliminar un rol por su ID
 * DELETE /api/roles/:id
 */
export async function deleteRol(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ success: false, error: 'El ID debe ser un número entero válido.' });
      return;
    }

    // Proteger el rol de administrador principal
    if (id === 1) {
      res.status(403).json({
        success: false,
        error: 'Seguridad: No está permitido eliminar el rol de administrador principal (ID: 1).'
      });
      return;
    }

    const eliminado = await RolesModule.delete(id);

    if (!eliminado) {
      res.status(404).json({ success: false, error: `Rol con ID ${id} no encontrado para eliminar.` });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Rol con ID ${id} eliminado exitosamente.`
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Error al eliminar el rol.',
      details: err?.message
    });
  }
}

/**
 * Sincronizar manualmente la tabla roles con roles.json bajo demanda
 * POST /api/roles/sync
 */
export async function syncRoles(_req: Request, res: Response): Promise<void> {
  try {
    const syncResult = await RolesModule.syncFromConfig();

    res.status(200).json({
      success: true,
      message: 'Sincronización de roles con roles.json completada exitosamente.',
      data: syncResult
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Error al sincronizar roles con la configuración.',
      details: err?.message
    });
  }
}

export default {
  getRoles,
  getRoleById,
  createRol,
  updateRol,
  addPermisoToRol,
  deleteRol,
  syncRoles
};
