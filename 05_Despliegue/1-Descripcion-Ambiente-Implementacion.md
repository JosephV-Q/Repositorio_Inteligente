# Despliegue 01 — Descripción del ambiente de implementación

## 1. Arquitectura desplegada

La implementación objetivo separa la interfaz estática del backend serverless:

```text
Navegador
   ├── Frontend React/Vite publicado como archivos estáticos
   └── HTTPS → API Express/TypeScript en Vercel
                         ├── HTTPS → Neon PostgreSQL + pgvector
                         ├── HTTPS → Google Gemini API
                         └── HTTPS/OAuth2 → Google Drive API v3
```

El binario no atraviesa la función de Vercel: el backend crea la sesión resumible y el navegador ejecuta el `PUT` directo a Google Drive. Neon conserva la referencia `ruta_arch`/`driveFileId` y los metadatos.

## 2. Componentes

- **Frontend:** aplicación React compilada con Vite.
- **API:** `api/index.ts` como entrada de Vercel y `src/app.ts` como aplicación Express.
- **Base de datos:** Neon PostgreSQL serverless con `vector`, tablas inicializadas automáticamente e índices HNSW.
- **Almacenamiento:** Google Drive API v3, preferentemente OAuth2 con refresh token para cuentas personales.
- **IA:** Google Gemini para generación y `gemini-embedding-001` para embeddings de 768 dimensiones.
- **Seguridad:** Helmet, CORS, sesión HMAC-SHA256 y RBAC por endpoint.

## 3. Dominios y conectividad

El frontend debe conocer la URL pública de la API. La API debe aceptar el origen del frontend y reenviarlo al inicio de la sesión resumible de Drive mediante `FRONTEND_ORIGIN`. Todas las comunicaciones públicas deben usar HTTPS.

## 4. Observabilidad operativa

El healthcheck es `GET /api/health`. También están disponibles los estados de Neon, Gemini y Drive mediante sus endpoints protegidos. Los logs de Vercel y las respuestas sanitizadas de estos endpoints son la evidencia primaria de diagnóstico.

## 5. Dependencias externas y límites

La disponibilidad del sistema depende de Vercel, Neon, Google Drive y Gemini. Las cuotas, expiración del refresh token, permisos de carpeta y límites de tiempo serverless deben revisarse antes de una demostración.
