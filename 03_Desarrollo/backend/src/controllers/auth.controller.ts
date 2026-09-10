import { Request, Response } from 'express';
import {
  verifySessionToken,
  createSessionToken,
  hashPassword,
  verifyPassword,
  SessionPayload
} from '../utils/security.js';
import { UsuariosModule, RolesModule, InvitacionesModule } from '../modules/index.js';
import { ROLE_ID_TO_NAME } from '../config/roles.js';

/**
 * Iniciar sesión (Login)
 * POST /api/auth/login
 * Body: { gmail: string, password: string }
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const emailInput = req.body.gmail || req.body.correo || req.body.email;
    const password = req.body.password;

    if (!emailInput || typeof emailInput !== 'string' || !password || typeof password !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Credenciales incompletas: se requieren "gmail" y "password".'
      });
      return;
    }

    const email = emailInput.trim().toLowerCase();

    // 1. Buscar usuario en la base de datos por correo
    const usuario = await UsuariosModule.findByGmail(email);
    if (!usuario) {
      res.status(401).json({
        success: false,
        error: 'Credenciales inválidas: correo o contraseña incorrectos.'
      });
      return;
    }

    // 2. Verificar la contraseña de forma segura (timing-safe HMAC comparison)
    const isMatch = verifyPassword(password, usuario.password);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        error: 'Credenciales inválidas: correo o contraseña incorrectos.'
      });
      return;
    }

    // 3. Consultar información del rol del usuario
    const rolInfo = await RolesModule.findById(usuario.rol);
    const nombreRol = rolInfo?.nombre_rol || ROLE_ID_TO_NAME[usuario.rol] || 'usuario';

    // 4. Generar token de sesión firmado
    const token = createSessionToken({
      id: usuario.id,
      gmail: usuario.gmail,
      rol: usuario.rol
    });

    res.status(200).json({
      success: true,
      message: 'Inicio de sesión exitoso.',
      token,
      user: {
        id: usuario.id,
        nombre: usuario.nombre,
        gmail: usuario.gmail,
        rol: usuario.rol,
        nombre_rol: nombreRol
      }
    });
  } catch (err: any) {
    console.error('⚠️ [Auth Login Error]:', err?.message);
    res.status(500).json({
      success: false,
      error: 'Error interno al procesar el inicio de sesión.',
      details: err?.message
    });
  }
}

/**
 * Registro de cliente mediante enlace / token de invitación
 * POST /api/auth/register
 * Body: { token: string, nombre: string, password: string }
 */
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const token = req.body.token || req.query.token;
    const { nombre, password } = req.body;

    if (!token || typeof token !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Token de invitación requerido.',
        message: 'Debes proporcionar el token de invitación en el cuerpo { "token": "..." } o en el parámetro de consulta ?token=...'
      });
      return;
    }

    if (!nombre || typeof nombre !== 'string' || nombre.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'El campo "nombre" es obligatorio.'
      });
      return;
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      res.status(400).json({
        success: false,
        error: 'La contraseña es obligatoria y debe contener al menos 6 caracteres.'
      });
      return;
    }

    // 1. Buscar la invitación por token
    const invitacion = await InvitacionesModule.findByToken(token.trim());
    if (!invitacion) {
      res.status(400).json({
        success: false,
        error: 'Enlace o token de invitación inválido o ya utilizado.',
        message: 'Solicita un nuevo enlace de invitación al administrador.'
      });
      return;
    }

    // 2. SEGURIDAD: Verificar que el rol de la invitación exista en la tabla 'roles'
    const rolEnDb = await RolesModule.findById(invitacion.rol);
    if (!rolEnDb) {
      res.status(400).json({
        success: false,
        error: `Seguridad: El rol asignado en la invitación (ID: ${invitacion.rol}) no existe en la base de datos.`
      });
      return;
    }

    // 3. Comprobar que no exista previamente un usuario con el correo de la invitación
    const emailNormalizado = invitacion.correo.trim().toLowerCase();
    const usuarioExistente = await UsuariosModule.findByGmail(emailNormalizado);
    if (usuarioExistente) {
      // Si ya está registrado, invalidamos la invitación para evitar reuso
      await InvitacionesModule.delete(invitacion.id);
      res.status(409).json({
        success: false,
        error: `Ya existe una cuenta registrada con el correo "${emailNormalizado}".`
      });
      return;
    }

    // 4. Hashear la contraseña con HMAC-SHA256
    const hashedPassword = hashPassword(password);

    // 5. Crear el nuevo usuario con el rol validado desde la invitación
    const nuevoUsuario = await UsuariosModule.create({
      nombre: nombre.trim(),
      gmail: emailNormalizado,
      password: hashedPassword,
      rol: rolEnDb.id_roles
    });

    // 6. Consumir y eliminar la invitación para garantizar uso único
    await InvitacionesModule.delete(invitacion.id);

    // 7. Generar token de sesión para inicio de sesión inmediato
    const sessionToken = createSessionToken({
      id: nuevoUsuario.id,
      gmail: nuevoUsuario.gmail,
      rol: nuevoUsuario.rol
    });

    res.status(201).json({
      success: true,
      message: 'Registro completado exitosamente a través de la invitación. Sesión iniciada.',
      token: sessionToken,
      user: {
        id: nuevoUsuario.id,
        nombre: nuevoUsuario.nombre,
        gmail: nuevoUsuario.gmail,
        rol: nuevoUsuario.rol,
        nombre_rol: rolEnDb.nombre_rol
      }
    });
  } catch (err: any) {
    console.error('⚠️ [Auth Register Error]:', err?.message);
    res.status(500).json({
      success: false,
      error: 'Error interno al procesar el registro.',
      details: err?.message
    });
  }
}

/**
 * Validar enlace / token de invitación para el formulario de registro del cliente
 * GET /api/auth/invitacion/:token
 */
export async function getInvitationDetails(req: Request, res: Response): Promise<void> {
  try {
    const token = req.params.token || (req.query.token as string);

    if (!token) {
      res.status(400).json({
        success: false,
        valid: false,
        error: 'Token de invitación no proporcionado.'
      });
      return;
    }

    const invitacion = await InvitacionesModule.findByToken(token.trim());
    if (!invitacion) {
      res.status(404).json({
        success: false,
        valid: false,
        error: 'Invitación no encontrada o token expirado/inválido.'
      });
      return;
    }

    // Comprobar rol en la base de datos
    const rolEnDb = await RolesModule.findById(invitacion.rol);
    if (!rolEnDb) {
      res.status(400).json({
        success: false,
        valid: false,
        error: `El rol (${invitacion.rol}) asociado a esta invitación no existe en el sistema.`
      });
      return;
    }

    res.status(200).json({
      success: true,
      valid: true,
      message: 'Invitación válida.',
      invitacion: {
        correo: invitacion.correo,
        rol: invitacion.rol,
        nombre_rol: rolEnDb.nombre_rol
      }
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      valid: false,
      error: 'Error al consultar la invitación.',
      details: err?.message
    });
  }
}

/**
 * Obtener perfil del usuario autenticado
 * GET /api/auth/me
 */
export async function getCurrentUser(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'No autenticado.'
      });
      return;
    }

    let dbUser = null;
    let dbRole = null;
    try {
      dbUser = await UsuariosModule.findById(req.user.id);
      dbRole = await RolesModule.findById(req.user.rol);
    } catch {
      // Fallback a los datos almacenados en el token de sesión
    }

    res.status(200).json({
      success: true,
      user: {
        id: dbUser?.id || req.user.id,
        nombre: dbUser?.nombre || 'Usuario',
        gmail: dbUser?.gmail || req.user.gmail,
        rol: dbUser?.rol || req.user.rol,
        nombre_rol: dbRole?.nombre_rol || ROLE_ID_TO_NAME[req.user.rol] || 'usuario'
      },
      session: {
        createdAt: new Date(req.user.createdAt).toISOString()
      }
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener la información de sesión.',
      details: err?.message
    });
  }
}

/**
 * Endpoint para validar la sesión actual
 * POST /api/auth/validate-session
 * GET /api/auth/validate-session
 */
export async function validateSession(req: Request, res: Response): Promise<void> {
  const authHeader = req.headers['authorization'];
  const customHeader = req.headers['x-session-token'];
  const bodyToken = req.body?.token;
  const queryToken = req.query?.token;

  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else if (typeof customHeader === 'string') {
    token = customHeader.trim();
  } else if (typeof bodyToken === 'string') {
    token = bodyToken.trim();
  } else if (typeof queryToken === 'string') {
    token = queryToken.trim();
  }

  if (!token) {
    res.status(401).json({
      success: false,
      valid: false,
      error: 'Token de sesión no proporcionado.',
      message: 'Envía el token mediante la cabecera "Authorization: Bearer <token>", "x-session-token", o en el cuerpo { "token": "..." }'
    });
    return;
  }

  const session: SessionPayload | null = verifySessionToken(token);

  if (!session) {
    res.status(401).json({
      success: false,
      valid: false,
      error: 'Sesión inválida o firma no coincide.'
    });
    return;
  }

  let rolInfo = null;
  try {
    rolInfo = await RolesModule.findById(session.rol);
  } catch {
    // Fallback a ROLE_ID_TO_NAME
  }

  res.status(200).json({
    success: true,
    valid: true,
    message: 'Sesión válida y autenticada.',
    session: {
      id: session.id,
      gmail: session.gmail,
      rol: session.rol,
      nombre_rol: rolInfo?.nombre_rol || ROLE_ID_TO_NAME[session.rol] || 'usuario',
      createdAt: new Date(session.createdAt).toISOString()
    }
  });
}

/**
 * Endpoint auxiliar para obtener un token de sesión de prueba generado a partir del admin configurado en .env
 */
export async function getTestSessionToken(_req: Request, res: Response): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.ADMIN_GMAIL || 'admin@admin.com';
  const adminRole = Number(process.env.ADMIN_ROLE || 1);

  const testToken = createSessionToken({
    id: 1,
    gmail: adminEmail,
    rol: adminRole
  });

  res.status(200).json({
    success: true,
    message: 'Token de sesión generado para el usuario administrador de prueba.',
    token: testToken,
    user: {
      id: 1,
      gmail: adminEmail,
      rol: adminRole,
      nombre_rol: 'admin'
    }
  });
}

export default {
  login,
  register,
  getInvitationDetails,
  getCurrentUser,
  validateSession,
  getTestSessionToken
};
