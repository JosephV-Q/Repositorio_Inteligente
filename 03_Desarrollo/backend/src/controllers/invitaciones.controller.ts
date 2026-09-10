import { Request, Response } from 'express';
import {
  InvitacionesModule,
  Invitacion,
  CreateInvitacionDto,
  UpdateInvitacionDto,
  RolesModule,
  UsuariosModule
} from '../modules/index.js';

/**
 * Obtiene todas las invitaciones o filtra por parámetros de consulta
 * @query limit, offset, correo, rol
 */
export async function getInvitaciones(req: Request, res: Response): Promise<void> {
  try {
    const { limit, offset, correo, rol } = req.query;

    if (correo || rol !== undefined) {
      const invitaciones: Invitacion[] = await InvitacionesModule.findWhere({
        correo: correo ? String(correo) : undefined,
        rol: rol !== undefined ? Number(rol) : undefined
      });
      res.status(200).json({ total: invitaciones.length, data: invitaciones });
      return;
    }

    const invitaciones: Invitacion[] = await InvitacionesModule.findAll({
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0
    });

    res.status(200).json({ total: invitaciones.length, data: invitaciones });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al obtener invitaciones', details: err?.message });
  }
}

/**
 * Obtiene una invitación por su ID
 */
export async function getInvitacionById(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'El ID proporcionado no es un número válido' });
      return;
    }

    const invitacion = await InvitacionesModule.findById(id);
    if (!invitacion) {
      res.status(404).json({ error: `Invitación con ID ${id} no encontrada` });
      return;
    }

    const rolInfo = await RolesModule.findById(invitacion.rol);

    res.status(200).json({
      data: {
        ...invitacion,
        nombre_rol: rolInfo?.nombre_rol || 'desconocido'
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al buscar la invitación', details: err?.message });
  }
}

/**
 * Búsqueda por propiedad específica: Token de invitación
 */
export async function getInvitacionByToken(req: Request, res: Response): Promise<void> {
  try {
    const { token } = req.params;
    const invitacion = await InvitacionesModule.findByToken(token);

    if (!invitacion) {
      res.status(404).json({ error: 'Invitación no encontrada o token inválido' });
      return;
    }

    const rolInfo = await RolesModule.findById(invitacion.rol);

    res.status(200).json({
      data: {
        ...invitacion,
        nombre_rol: rolInfo?.nombre_rol || 'desconocido'
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al validar el token de invitación', details: err?.message });
  }
}

/**
 * Crea una nueva invitación y genera el enlace de registro para el cliente
 * Compara el rol contra la tabla roles para garantizar la seguridad
 */
export async function createInvitacion(req: Request, res: Response): Promise<void> {
  try {
    const { correo, rol, token } = req.body;

    if (!correo || rol === undefined) {
      res.status(400).json({
        error: 'Campos requeridos faltantes: "correo" y "rol" son obligatorios.'
      });
      return;
    }

    const rolId = Number(rol);
    if (isNaN(rolId)) {
      res.status(400).json({ error: 'El campo "rol" debe ser un número entero válido.' });
      return;
    }

    // 1. SEGURIDAD: Verificar que el rol exista en la tabla 'roles'
    const rolValido = await RolesModule.findById(rolId);
    if (!rolValido) {
      res.status(400).json({
        error: `Seguridad: El rol con ID ${rolId} no existe en la base de datos.`
      });
      return;
    }

    // 2. Verificar que no exista un usuario ya registrado con este correo
    const correoNormalizado = String(correo).trim().toLowerCase();
    const usuarioExistente = await UsuariosModule.findByGmail(correoNormalizado);
    if (usuarioExistente) {
      res.status(400).json({
        error: `Ya existe un usuario registrado con el correo "${correoNormalizado}".`
      });
      return;
    }

    const dto: CreateInvitacionDto = {
      correo: correoNormalizado,
      rol: rolId,
      token: token ? String(token).trim() : undefined
    };

    const nuevaInvitacion = await InvitacionesModule.create(dto);

    // 3. Generar enlace de registro absoluto
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol || 'http';
    const enlaceRegistro = `${protocol}://${host}/api/auth/register?token=${nuevaInvitacion.token}`;

    res.status(201).json({
      success: true,
      message: 'Invitación y enlace creados exitosamente.',
      data: {
        id: nuevaInvitacion.id,
        token: nuevaInvitacion.token,
        correo: nuevaInvitacion.correo,
        rol: nuevaInvitacion.rol,
        nombre_rol: rolValido.nombre_rol,
        enlace_registro: enlaceRegistro
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al crear la invitación', details: err?.message });
  }
}

/**
 * Actualiza una invitación
 */
export async function updateInvitacion(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'El ID proporcionado no es un número válido' });
      return;
    }

    const updateDto: UpdateInvitacionDto = req.body;

    if (updateDto.rol !== undefined) {
      const rolValido = await RolesModule.findById(Number(updateDto.rol));
      if (!rolValido) {
        res.status(400).json({ error: `El rol ${updateDto.rol} no existe en la base de datos.` });
        return;
      }
    }

    const actualizada = await InvitacionesModule.update(id, updateDto);

    if (!actualizada) {
      res.status(404).json({ error: `Invitación con ID ${id} no encontrada` });
      return;
    }

    res.status(200).json({
      message: 'Invitación actualizada exitosamente',
      data: actualizada
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al actualizar invitación', details: err?.message });
  }
}

/**
 * Modificación por propiedad específica: Rol
 */
export async function updateInvitacionRol(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    const { rol } = req.body;

    if (isNaN(id) || rol === undefined) {
      res.status(400).json({ error: 'Se requiere ID válido y el campo "rol" numérico' });
      return;
    }

    const rolValido = await RolesModule.findById(Number(rol));
    if (!rolValido) {
      res.status(400).json({ error: `El rol ${rol} no existe en la base de datos.` });
      return;
    }

    const actualizada = await InvitacionesModule.updateRol(id, Number(rol));
    if (!actualizada) {
      res.status(404).json({ error: `Invitación con ID ${id} no encontrada` });
      return;
    }

    res.status(200).json({
      message: 'Rol de la invitación actualizado exitosamente',
      data: actualizada
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al modificar rol', details: err?.message });
  }
}

/**
 * Modificación por propiedad específica: Correo
 */
export async function updateInvitacionCorreo(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    const { correo } = req.body;

    if (isNaN(id) || !correo) {
      res.status(400).json({ error: 'Se requiere ID válido y el campo "correo"' });
      return;
    }

    const actualizada = await InvitacionesModule.updateCorreo(id, String(correo));
    if (!actualizada) {
      res.status(404).json({ error: `Invitación con ID ${id} no encontrada` });
      return;
    }

    res.status(200).json({
      message: 'Correo de la invitación actualizado exitosamente',
      data: actualizada
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al modificar correo', details: err?.message });
  }
}

/**
 * Elimina una invitación por ID
 */
export async function deleteInvitacion(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'El ID proporcionado no es un número válido' });
      return;
    }

    const eliminada = await InvitacionesModule.delete(id);
    if (!eliminada) {
      res.status(404).json({ error: `Invitación con ID ${id} no encontrada para eliminar` });
      return;
    }

    res.status(200).json({ message: `Invitación con ID ${id} eliminada con éxito` });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al eliminar la invitación', details: err?.message });
  }
}

export default {
  getInvitaciones,
  getInvitacionById,
  getInvitacionByToken,
  createInvitacion,
  updateInvitacion,
  updateInvitacionRol,
  updateInvitacionCorreo,
  deleteInvitacion
};
