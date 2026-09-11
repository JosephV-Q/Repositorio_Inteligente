# Despliegue 09 — Manual de administración y soporte

## 1. Responsabilidades del administrador

- Gestionar usuarios, invitaciones y roles.
- Revisar estados de Neon, Gemini y Drive.
- Rotar secretos y refresh tokens cuando corresponda.
- Validar permisos de la carpeta de Drive.
- Ejecutar pruebas de salud antes de una demostración.
- Revisar logs sin copiar credenciales a tickets o evidencias.

## 2. Roles

| Rol | Alcance |
|---|---|
| `admin` | Acceso completo, usuarios, roles, configuración e integraciones. |
| `editor` | Gestión operativa de repositorios, categorías, comparativas y consultas permitidas. |
| `usuario` | Consulta y operaciones documentales permitidas por `roles.json`. |
| `invitado` | Health, sesión e invitación; acceso mínimo. |

Los permisos canónicos están en `backend/src/config/roles.json` y se sincronizan al inicializar la base.

## 3. Diagnóstico por capas

1. Ejecutar `GET /api/health`.
2. Ejecutar `GET /api/usuarios/db-status` con un token admin.
3. Ejecutar `GET /api/gemini/status`.
4. Ejecutar `GET /api/repositorios/drive/status`.
5. Revisar logs de Vercel o del proceso local.
6. Reproducir con `pnpm test:api`, `pnpm test:gemini` o `pnpm test:upload`.

## 4. Problemas frecuentes

| Síntoma | Revisión |
|---|---|
| 401 | Token ausente, mal formado o firmado con otro `HASH_SECRET`. |
| 403 | Endpoint no incluido en permisos del rol. |
| DB offline | `DATABASE_URL`, TLS, cuota o permisos de Neon. |
| Gemini no configurado | `GEMINI_API_KEY` y modelo configurado. |
| Drive `storageQuotaExceeded` | Usar OAuth2 con refresh token para cuenta personal; no depender de Service Account en ese escenario. |
| Error CORS en PUT | Confirmar `FRONTEND_ORIGIN` y que el origen enviado al crear la sesión sea el real. |
| Tablas ausentes | Ejecutar `pnpm db:init` con una cuenta Neon autorizada. |

## 5. Mantenimiento

- Revisar dependencias y ejecutar builds después de actualizarlas.
- Mantener una copia de la configuración no secreta y de los procedimientos de recuperación.
- Limpiar registros y archivos de prueba.
- Verificar que la dimensión de embeddings siga siendo 768.
- Antes de cambiar `HASH_SECRET`, planificar invalidación de sesiones y migración de contraseñas.

## 6. Escalamiento

Un incidente debe incluir ambiente, fecha, endpoint, código HTTP, mensaje sanitizado, commit o deployment y pasos de reproducción. Nunca incluir contraseñas, API keys, refresh tokens, tokens completos ni contenido documental confidencial.
