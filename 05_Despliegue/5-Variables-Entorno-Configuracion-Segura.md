# Despliegue 05 — Variables de entorno y configuración segura

## 1. Variables

| Variable | Obligatoria | Uso |
|---|---:|---|
| `NODE_ENV` | Sí | Entorno de ejecución. |
| `PORT` | Local | Puerto del servidor local. |
| `DATABASE_URL` | Sí | Conexión TLS a Neon. |
| `GEMINI_API_KEY` | Sí | Acceso a Gemini. |
| `GEMINI_DEFAULT_MODEL` | No | Modelo generativo por defecto. |
| `GEMINI_EMBEDDING_MODEL` | No | Modelo de embeddings. |
| `HASH_SECRET` | Sí | Hash de contraseñas y firma de sesión. |
| `ADMIN_NAME` | Sí en inicialización | Nombre del administrador inicial. |
| `ADMIN_EMAIL` | Sí en inicialización | Correo del administrador inicial. |
| `ADMIN_PASSWORD` | Sí en inicialización | Contraseña inicial; cambiarla después del primer acceso. |
| `ADMIN_ROLE` | No | ID de rol inicial, por defecto `1`. |
| `GOOGLE_DRIVE_CLIENT_ID` | OAuth2 | Cliente OAuth2 de Drive. |
| `GOOGLE_DRIVE_CLIENT_SECRET` | OAuth2 | Secreto OAuth2 de Drive. |
| `GOOGLE_DRIVE_REFRESH_TOKEN` | OAuth2 | Refresh token de Drive. |
| `GOOGLE_DRIVE_FOLDER_ID` | Recomendada | Carpeta destino. |
| `FRONTEND_ORIGIN` | Recomendada | Origen para CORS y subida directa. |

El código también admite credenciales de Service Account o token directo para escenarios específicos, pero el ambiente verificado usa OAuth2 con refresh token.

## 2. Reglas de seguridad

- Definir secretos distintos por ambiente y rotarlos periódicamente.
- No versionar `.env`, refresh tokens, claves privadas ni respuestas que contengan tokens.
- Configurar las variables en el panel de Vercel, no en el código fuente.
- Restringir permisos de Google Drive a la carpeta necesaria.
- Usar HTTPS en producción.
- Evitar valores de ejemplo como `admin123456` o `super_secret...` fuera de desarrollo.
- Invalidar o rotar `HASH_SECRET` solo con un plan de migración, porque cambia hashes y sesiones existentes.

## 3. Validación

Comprobar `/api/health`, `/api/gemini/status`, `/api/usuarios/db-status` y `/api/repositorios/drive/status`. Las respuestas deben indicar estado, método o latencia, nunca imprimir secretos completos.
