import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Obtiene la clave secreta para el hashing de contraseñas y firma de sesiones
 */
export function getHashSecret(): string {
  const secret = process.env.HASH_SECRET;
  if (!secret) {
    console.warn('⚠️ [Seguridad] HASH_SECRET no está definido en .env, usando clave por defecto para desarrollo.');
    return 'default_dev_hash_secret_key_change_in_production';
  }
  return secret;
}

/**
 * Genera un hash HMAC-SHA256 para contraseñas utilizando la clave secreta de .env.
 * El password se trata como hash en todo momento.
 */
export function hashPassword(password: string): string {
  const secret = getHashSecret();
  return crypto.createHmac('sha256', secret).update(password).digest('hex');
}

/**
 * Compara de forma segura (timing-safe) una contraseña en texto claro contra su hash almacenado
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  const computedHash = hashPassword(password);
  if (computedHash.length !== storedHash.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(storedHash));
}

/**
 * Estructura de datos almacenada dentro del token de sesión
 */
export interface SessionPayload {
  id: number;
  gmail: string;
  rol: number;
  createdAt: number;
}

/**
 * Genera un token de sesión firmado con HASH_SECRET
 */
export function createSessionToken(payload: Omit<SessionPayload, 'createdAt'>): string {
  const fullPayload: SessionPayload = {
    ...payload,
    createdAt: Date.now()
  };

  const dataStr = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', getHashSecret())
    .update(dataStr)
    .digest('base64url');

  return `${dataStr}.${signature}`;
}

/**
 * Valida la firma del token de sesión y retorna su contenido si es válido
 */
export function verifySessionToken(token: string): SessionPayload | null {
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    return null;
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return null;
  }

  const [dataStr, signature] = parts;
  if (!dataStr || !signature) {
    return null;
  }

  const expectedSignature = crypto
    .createHmac('sha256', getHashSecret())
    .update(dataStr)
    .digest('base64url');

  if (signature !== expectedSignature) {
    return null;
  }

  try {
    const json = Buffer.from(dataStr, 'base64url').toString('utf8');
    return JSON.parse(json) as SessionPayload;
  } catch {
    return null;
  }
}

export default {
  getHashSecret,
  hashPassword,
  verifyPassword,
  createSessionToken,
  verifySessionToken
};
