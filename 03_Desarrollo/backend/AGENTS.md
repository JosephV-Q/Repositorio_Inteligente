# Reglas e Instrucciones del Proyecto (db_repo)

Este archivo es leído automáticamente por el asistente de IA / Antigravity al operar en este repositorio.

## 📌 Contexto y Estado del Proyecto
* Para consultar el estado actual del proyecto, la arquitectura completa y el historial de decisiones, lee [.agent/CHECKPOINT.md](.agent/CHECKPOINT.md).

## 🚀 Puntos Clave de Operación
1. **Google Drive Storage:**
   - La autenticación utiliza **OAuth2 con Refresh Token** (`GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_SECRET`, `GOOGLE_DRIVE_REFRESH_TOKEN`).
   - Nunca usar Cuentas de Servicio en Drive para carpetas personales de `@gmail.com` (genera error de cuota `403 storageQuotaExceeded`).
   - Los archivos binarios **no pasan** por el backend de Express (arquitectura de cero carga en servidor). El cliente realiza un `PUT` directo a la URL prefirmada devuelta por `/api/repositorios/upload-url`.
2. **Verificación Automatizada:**
   - Para verificar todo el flujo (servidor + RBAC + Google Drive + Neon DB), ejecutar:
     ```bash
     npm run test:upload
     ```
   - Habilidad documentada en [.agent/skills/test-upload-flow/SKILL.md](.agent/skills/test-upload-flow/SKILL.md).
3. **Cliente Frontend:**
   - Ubicado en [client/ApiClient.ts](client/ApiClient.ts). Todos los métodos desenvuelven automáticamente la propiedad `data` para mantener coherencia estricta con las interfaces de TypeScript.
