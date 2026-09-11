# Despliegue 03 — Configuración de base de datos y almacenamiento

## 1. Neon PostgreSQL

Definir `DATABASE_URL` con una cadena TLS de Neon. También se aceptan `NEON_DATABASE_URL` o `POSTGRES_URL` como alternativas. El módulo `src/db/init.ts` ejecuta de forma idempotente:

1. `CREATE EXTENSION IF NOT EXISTS vector`.
2. Creación de `roles`, `usuarios`, `repositorios`, `configuracion`, `comparativas` e `invitaciones`.
3. Columnas `embedding vector(768)` donde corresponde.
4. Índices HNSW con `vector_cosine_ops`.
5. Sincronización de `roles.json`.
6. Creación o actualización del administrador inicial.

## 2. Datos principales

`repositorios` almacena nombre, referencia de Drive, categoría, descripción, resumen, palabras clave, contexto y embedding. `comparativas` almacena título, URLs, descripción, categoría, contexto y embedding. Las credenciales no se almacenan en estas tablas.

## 3. Google Drive

1. Habilitar Google Drive API en Google Cloud.
2. Crear una carpeta destino y obtener su ID.
3. Configurar OAuth2 (`GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_SECRET`, `GOOGLE_DRIVE_REFRESH_TOKEN`).
4. Definir `GOOGLE_DRIVE_FOLDER_ID`.
5. Configurar `FRONTEND_ORIGIN` para CORS de la sesión resumible.
6. Validar `GET /api/repositorios/drive/status`.

El flujo es: `POST /api/repositorios/upload-url` → `PUT` directo del navegador a `uploadUrl` → `POST /api/repositorios` con metadatos y `driveFileId`.

## 4. Copias y recuperación

Neon y Google Drive son servicios externos con sus propias opciones de recuperación. Programar exportaciones de la base y conservar una política de retención de Drive. Antes de borrar un registro, confirmar si el binario también debe eliminarse, porque el registro y el archivo viven en servicios distintos.

## 5. Verificación

```bash
pnpm db:init
pnpm test:upload
```

La prueba E2E debe ejecutarse con datos sintéticos y limpiarse al finalizar.
