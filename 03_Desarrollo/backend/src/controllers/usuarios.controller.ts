import { Request, Response } from 'express';
import {
  UsuariosModule,
  Usuario,
  CreateUsuarioDto,
  UpdateUsuarioDto,
  RolesModule
} from '../modules/index.js';
import { checkConnection } from '../db/index.js';
import { hashPassword } from '../utils/security.js';

/**
 * Elimina la contraseña de los objetos de usuario antes de retornarlos al cliente
 */
function sanitizeUser(user: any) {
  if (!user) return user;
  const { password, ...safeUser } = user;
  return safeUser;
}

/**
 * Comprueba el estado de la conexión con Neon DB
 */
export async function checkDbStatus(req: Request, res: Response): Promise<void> {
  try {
    const status = await checkConnection();
    if (status.ok) {
      res.status(200).json({
        status: 'online',
        database: 'Neon PostgreSQL',
        latencyMs: status.latencyMs
      });
    } else {
      res.status(503).json({
        status: 'offline',
        database: 'Neon PostgreSQL',
        error: status.error
      });
    }
  } catch (err: any) {
    res.status(500).json({
      status: 'error',
      message: err?.message || 'Error al verificar la base de datos'
    });
  }
}

/**
 * Obtiene todos los usuarios o filtra según parámetros de consulta
 * @query limit, offset, nombre, rol
 */
export async function getUsuarios(req: Request, res: Response): Promise<void> {
  try {
    const { limit, offset, nombre, rol } = req.query;

    if (nombre || rol !== undefined) {
      const usuarios: Usuario[] = await UsuariosModule.findWhere({
        nombre: nombre ? String(nombre) : undefined,
        rol: rol !== undefined ? Number(rol) : undefined
      });
      res.status(200).json({
        total: usuarios.length,
        data: usuarios.map(sanitizeUser)
      });
      return;
    }

    const usuarios: Usuario[] = await UsuariosModule.findAll({
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0
    });

    res.status(200).json({
      total: usuarios.length,
      data: usuarios.map(sanitizeUser)
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al obtener usuarios', details: err?.message });
  }
}

/**
 * Obtiene un usuario por su ID
 */
export async function getUsuarioById(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'El ID proporcionado no es un número válido' });
      return;
    }

    const usuario = await UsuariosModule.findById(id);
    if (!usuario) {
      res.status(404).json({ error: `Usuario con ID ${id} no encontrado` });
      return;
    }

    res.status(200).json({ data: sanitizeUser(usuario) });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al buscar el usuario', details: err?.message });
  }
}

/**
 * Búsqueda por propiedad específica: Gmail
 */
export async function getUsuarioByGmail(req: Request, res: Response): Promise<void> {
  try {
    const { gmail } = req.params;
    const usuario = await UsuariosModule.findByGmail(gmail);

    if (!usuario) {
      res.status(404).json({ error: `No se encontró usuario con correo ${gmail}` });
      return;
    }

    res.status(200).json({ data: sanitizeUser(usuario) });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al buscar usuario por correo', details: err?.message });
  }
}

/**
 * Crea un nuevo usuario validando que el rol exista en la base de datos y hasheando el password
 */
export async function createUsuario(req: Request, res: Response): Promise<void> {
  try {
    const { nombre, gmail, password, rol } = req.body;

    if (!nombre || !gmail || !password || rol === undefined) {
      res.status(400).json({
        error: 'Campos requeridos faltantes: nombre, gmail, password y rol son obligatorios'
      });
      return;
    }

    const rolId = Number(rol);
    if (isNaN(rolId)) {
      res.status(400).json({ error: 'El campo rol debe ser un número entero válido.' });
      return;
    }

    // 1. SEGURIDAD: Verificar que el rol exista en la tabla roles
    const rolValido = await RolesModule.findById(rolId);
    if (!rolValido) {
      res.status(400).json({
        error: `Seguridad: El rol con ID ${rolId} no existe en la base de datos.`
      });
      return;
    }

    // 2. Verificar que no exista un usuario con este correo
    const correoNormalizado = String(gmail).trim().toLowerCase();
    const usuarioExistente = await UsuariosModule.findByGmail(correoNormalizado);
    if (usuarioExistente) {
      res.status(400).json({
        error: `Ya existe un usuario registrado con el correo ${correoNormalizado}.`
      });
      return;
    }

    const nuevoUsuarioDto: CreateUsuarioDto = {
      nombre: String(nombre).trim(),
      gmail: correoNormalizado,
      password: hashPassword(String(password)),
      rol: rolId
    };

    const usuarioCreado = await UsuariosModule.create(nuevoUsuarioDto);
    res.status(201).json({
      message: 'Usuario creado exitosamente',
      data: sanitizeUser(usuarioCreado)
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al crear el usuario', details: err?.message });
  }
}

/**
 * Actualiza parcialmente un usuario
 */
export async function updateUsuario(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'El ID proporcionado no es un número válido' });
      return;
    }

    const updateDto: UpdateUsuarioDto = { ...req.body };

    // Si se actualiza contraseña, hashearla con HMAC
    if (updateDto.password && typeof updateDto.password === 'string') {
      updateDto.password = hashPassword(updateDto.password);
    }

    // Si se actualiza rol, comprobar contra tabla roles
    if (updateDto.rol !== undefined) {
      const rolId = Number(updateDto.rol);
      const rolValido = await RolesModule.findById(rolId);
      if (!rolValido) {
        res.status(400).json({ error: `El rol con ID ${rolId} no existe en la base de datos.` });
        return;
      }
      updateDto.rol = rolId;
    }

    if (updateDto.gmail && typeof updateDto.gmail === 'string') {
      updateDto.gmail = updateDto.gmail.trim().toLowerCase();
    }

    const usuarioActualizado = await UsuariosModule.update(id, updateDto);

    if (!usuarioActualizado) {
      res.status(404).json({ error: `No se pudo actualizar: usuario con ID ${id} no encontrado` });
      return;
    }

    res.status(200).json({
      message: 'Usuario actualizado exitosamente',
      data: sanitizeUser(usuarioActualizado)
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al actualizar el usuario', details: err?.message });
  }
}

/**
 * Modificación de una propiedad específica: Rol
 */
export async function updateUsuarioRol(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    const { rol } = req.body;

    if (isNaN(id) || rol === undefined) {
      res.status(400).json({ error: 'Se requiere un ID válido y el campo "rol" numérico en el cuerpo de la petición' });
      return;
    }

    const rolId = Number(rol);
    const rolValido = await RolesModule.findById(rolId);
    if (!rolValido) {
      res.status(400).json({ error: `Seguridad: El rol con ID ${rolId} no existe en la base de datos.` });
      return;
    }

    const usuarioActualizado = await UsuariosModule.updateRol(id, rolId);

    if (!usuarioActualizado) {
      res.status(404).json({ error: `Usuario con ID ${id} no encontrado` });
      return;
    }

    res.status(200).json({
      message: 'Rol del usuario modificado exitosamente',
      data: sanitizeUser(usuarioActualizado)
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al modificar rol', details: err?.message });
  }
}

/**
 * Elimina un usuario por su ID
 */
export async function deleteUsuario(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'El ID proporcionado no es un número válido' });
      return;
    }

    const eliminado = await UsuariosModule.delete(id);
    if (!eliminado) {
      res.status(404).json({ error: `Usuario con ID ${id} no encontrado para eliminar` });
      return;
    }

    res.status(200).json({
      message: `Usuario con ID ${id} eliminado con éxito`
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al eliminar usuario', details: err?.message });
  }
}

export default {
  checkDbStatus,
  getUsuarios,
  getUsuarioById,
  getUsuarioByGmail,
  createUsuario,
  updateUsuario,
  updateUsuarioRol,
  deleteUsuario
};
