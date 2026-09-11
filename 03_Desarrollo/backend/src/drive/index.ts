import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Parámetros para solicitar un enlace de subida directa a Google Drive
 */
export interface RequestUploadUrlParams {
  /**
   * Nombre del archivo con su extensión (ej: 'documento.pdf')
   */
  fileName: string;

  /**
   * Tipo MIME del archivo (ej: 'application/pdf', 'image/png')
   * Por defecto: 'application/octet-stream'
   */
  mimeType?: string;

  /**
   * Tamaño del archivo en bytes (opcional, recomendado si se conoce de antemano)
   */
  fileSize?: number;

  /**
   * ID de la carpeta en Google Drive donde se almacenará el archivo.
   * Si no se especifica, toma GOOGLE_DRIVE_FOLDER_ID de .env.
   */
  folderId?: string;

  /**
   * Origen web del frontend (ej: 'https://test.utsvps.com' o 'http://localhost:3000').
   * Es crucial para que Google Drive configure las cabeceras CORS ('Access-Control-Allow-Origin')
   * en la sesión de subida resumible y permita al navegador realizar el PUT de bytes sin bloqueo.
   */
  origin?: string;
}

/**
 * Respuesta con el enlace de subida directa generado
 */
export interface RequestUploadUrlResponse {
  success: boolean;
  /**
   * URL prefirmada (Resumable Upload URI) de Google Drive.
   * El cliente debe enviar el archivo binario directamente a esta URL con una petición HTTP PUT.
   */
  uploadUrl?: string;
  fileName: string;
  mimeType: string;
  folderId?: string;
  expiresInSeconds: number;
  instructions: string;
  error?: string;
}

/**
 * Cache en memoria para el token de acceso de Google Drive
 */
interface CachedToken {
  token: string;
  expiresAt: number; // timestamp en ms
}

let cachedAccessToken: CachedToken | null = null;

/**
 * Genera un JWT firmado con RS256 para autenticación con Cuenta de Servicio de Google
 */
function createServiceAccountJwt(clientEmail: string, privateKey: string): string {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/drive',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsignedToken);

  // Asegurar formato correcto de saltos de línea en la clave privada
  const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');
  const signature = signer.sign(formattedPrivateKey, 'base64url');

  return `${unsignedToken}.${signature}`;
}

/**
 * Obtiene un token de acceso OAuth2 para la cuenta común de Google Drive.
 * Soporta:
 * 1. Cuenta de Servicio (GOOGLE_DRIVE_CLIENT_EMAIL + GOOGLE_DRIVE_PRIVATE_KEY o GOOGLE_SERVICE_ACCOUNT_KEY)
 * 2. OAuth2 Refresh Token (GOOGLE_DRIVE_CLIENT_ID + GOOGLE_DRIVE_CLIENT_SECRET + GOOGLE_DRIVE_REFRESH_TOKEN)
 * 3. Token directo (GOOGLE_DRIVE_ACCESS_TOKEN) para desarrollo/testing
 */
export async function getGoogleDriveAccessToken(): Promise<string> {
  const now = Date.now();

  // 1. Verificar si existe token válido en cache (con 5 minutos de margen de seguridad)
  if (cachedAccessToken && cachedAccessToken.expiresAt > now + 300000) {
    return cachedAccessToken.token;
  }

  // 2. Token de acceso directo (para pruebas rápidas)
  if (process.env.GOOGLE_DRIVE_ACCESS_TOKEN) {
    return process.env.GOOGLE_DRIVE_ACCESS_TOKEN.trim();
  }

  // 3. Método A: Cuenta de Servicio (Service Account)
  let serviceEmail = process.env.GOOGLE_DRIVE_CLIENT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_DRIVE_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY;

  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    try {
      const parsed = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
      serviceEmail = parsed.client_email || serviceEmail;
      privateKey = parsed.private_key || privateKey;
    } catch {
      console.warn('⚠️ [Google Drive] Error al parsear GOOGLE_SERVICE_ACCOUNT_KEY como JSON.');
    }
  }

  if (serviceEmail && privateKey) {
    const jwt = createServiceAccountJwt(serviceEmail, privateKey);

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      })
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      throw new Error(`Google OAuth2 Error (${tokenRes.status}) con Service Account: ${errText}`);
    }

    const data: any = await tokenRes.json();
    cachedAccessToken = {
      token: data.access_token,
      expiresAt: now + (data.expires_in || 3600) * 1000
    };

    return cachedAccessToken.token;
  }

  // 4. Método B: OAuth2 Refresh Token
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;

  if (clientId && clientSecret && refreshToken) {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      throw new Error(`Google OAuth2 Error (${tokenRes.status}) con Refresh Token: ${errText}`);
    }

    const data: any = await tokenRes.json();
    cachedAccessToken = {
      token: data.access_token,
      expiresAt: now + (data.expires_in || 3600) * 1000
    };

    return cachedAccessToken.token;
  }

  throw new Error(
    'Google Drive API: Credenciales no configuradas en .env. ' +
    'Debes configurar GOOGLE_DRIVE_CLIENT_EMAIL y GOOGLE_DRIVE_PRIVATE_KEY (Cuenta de Servicio) ' +
    'o GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET y GOOGLE_DRIVE_REFRESH_TOKEN (OAuth2).'
  );
}

/**
 * Genera una URL prefirmada de subida directa (Resumable Upload Session) con la API de Google Drive.
 * 
 * IMPORTANTE: El archivo NO pasa por nuestro servidor. El cliente envía el archivo
 * directamente a la URL retornada mediante una petición HTTP PUT.
 */
export async function createDriveUploadUrl(params: RequestUploadUrlParams): Promise<RequestUploadUrlResponse> {
  const { fileName, mimeType = 'application/octet-stream', fileSize, folderId } = params;

  if (!fileName || typeof fileName !== 'string' || fileName.trim().length === 0) {
    throw new Error('El parámetro "fileName" es obligatorio.');
  }

  const cleanFileName = fileName.trim();
  const cleanMimeType = mimeType.trim() || 'application/octet-stream';
  const targetFolder = folderId || process.env.GOOGLE_DRIVE_FOLDER_ID;

  // 1. Obtener token de acceso para la cuenta común
  const accessToken = await getGoogleDriveAccessToken();

  // 2. Definir metadatos del archivo para la sesión de subida de Google Drive
  const metadata: Record<string, any> = {
    name: cleanFileName,
    mimeType: cleanMimeType
  };

  if (targetFolder && targetFolder.trim().length > 0) {
    metadata.parents = [targetFolder.trim()];
  }

  // 3. Cabeceras requeridas por Google Drive Resumable Upload
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json; charset=UTF-8',
    'X-Upload-Content-Type': cleanMimeType
  };

  const configuredOrigin =
    process.env.FRONTEND_ORIGIN?.trim() ||
    process.env.CLIENT_ORIGIN?.trim() ||
    process.env.FRONTEND_URL?.trim();

  const clientOrigin = params.origin?.trim() || configuredOrigin;
  if (clientOrigin) {
    headers['Origin'] = clientOrigin;
  }

  if (fileSize && fileSize > 0) {
    headers['X-Upload-Content-Length'] = String(fileSize);
  }

  // 4. Iniciar sesión de subida en Google Drive API v3
  const initUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true';

  const driveRes = await fetch(initUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(metadata)
  });

  if (!driveRes.ok) {
    const errorBody = await driveRes.text();
    return {
      success: false,
      fileName: cleanFileName,
      mimeType: cleanMimeType,
      expiresInSeconds: 0,
      instructions: '',
      error: `Error al iniciar la sesión de subida en Google Drive (${driveRes.status}): ${errorBody}`
    };
  }

  // La cabecera 'Location' contiene la URL de subida directa prefirmada
  const uploadUrl = driveRes.headers.get('location');

  if (!uploadUrl) {
    return {
      success: false,
      fileName: cleanFileName,
      mimeType: cleanMimeType,
      expiresInSeconds: 0,
      instructions: '',
      error: 'Google Drive no retornó la cabecera Location con la URL de subida.'
    };
  }

  return {
    success: true,
    uploadUrl,
    fileName: cleanFileName,
    mimeType: cleanMimeType,
    folderId: targetFolder,
    expiresInSeconds: 86400, // Las sesiones resumibles de Google Drive son válidas hasta por 24 horas
    instructions: 'Envía el archivo binario directamente a "uploadUrl" mediante una petición HTTP PUT con la cabecera Content-Type correspondiente.'
  };
}

/**
 * Consulta los metadatos de un archivo en Google Drive una vez que el cliente completó la subida
 */
export async function getDriveFileMetadata(fileId: string): Promise<any> {
  const accessToken = await getGoogleDriveAccessToken();

  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,size,webViewLink,webContentLink,createdTime&supportsAllDrives=true`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Error al consultar metadatos del archivo en Google Drive (${res.status}): ${error}`);
  }

  return res.json();
}

/**
 * Permite hacer público un archivo en Google Drive (cualquiera con el enlace puede leer)
 */
export async function makeDriveFilePublic(fileId: string): Promise<boolean> {
  try {
    const accessToken = await getGoogleDriveAccessToken();

    const url = `https://www.googleapis.com/drive/v3/files/${fileId}/permissions?supportsAllDrives=true`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone'
      })
    });

    return res.ok;
  } catch (err: any) {
    console.warn(`⚠️ [Google Drive] No se pudo cambiar visibilidad pública del archivo ${fileId}:`, err?.message);
    return false;
  }
}

/**
 * Comprueba si las credenciales de Google Drive están configuradas
 */
export function isGoogleDriveConfigured(): { configured: boolean; method: string } {
  if (process.env.GOOGLE_DRIVE_ACCESS_TOKEN) {
    return { configured: true, method: 'Direct Access Token' };
  }

  const hasServiceAccount = Boolean(
    (process.env.GOOGLE_DRIVE_CLIENT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) &&
    (process.env.GOOGLE_DRIVE_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY)
  ) || Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

  if (hasServiceAccount) {
    return { configured: true, method: 'Service Account (Cuenta de Servicio)' };
  }

  const hasOAuth2 = Boolean(
    process.env.GOOGLE_DRIVE_CLIENT_ID &&
    process.env.GOOGLE_DRIVE_CLIENT_SECRET &&
    process.env.GOOGLE_DRIVE_REFRESH_TOKEN
  );

  if (hasOAuth2) {
    return { configured: true, method: 'OAuth2 Refresh Token' };
  }

  return { configured: false, method: 'Ninguno configurado' };
}

export default {
  createDriveUploadUrl,
  getGoogleDriveAccessToken,
  getDriveFileMetadata,
  makeDriveFilePublic,
  isGoogleDriveConfigured
};
