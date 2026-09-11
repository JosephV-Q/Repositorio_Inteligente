# Checkpoint de Contexto del Proyecto

> **Fecha de Creación / Actualización:** 2026-09-10  
> **Estado General:** Operativo, verificado de punta a punta.  
> **Repositorio:** db_repo (Express + TypeScript + Neon PostgreSQL + Google Drive OAuth2)

---

## 1. Resumen Ejecutivo y Estado Actual

El proyecto es una API REST modular en **Express + TypeScript** (preparada para Vercel Serverless o runtime Node) con base de datos **PostgreSQL en Neon DB**, integración con **Google Gemini AI** y almacenamiento de archivos con arquitectura de cero carga en servidor mediante **Google Drive**.

### Estado de Componentes Principales

| Componente | Tecnología | Estado | Notas |
| :--- | :--- | :--- | :--- |
| **Backend API** | Express 4 + TypeScript | ✅ Operativo | Rutas modulares con validación y RBAC. |
| **Base de Datos** | Neon PostgreSQL Serverless | ✅ Conectado | Tablas autogestionadas por `src/db/init.ts`. Incluye extensión `pgvector` (dimensión 768) e índices HNSW. |
| **Google Drive** | Google Drive API v3 (OAuth2) | ✅ Verificado | Migrado de Service Account a **OAuth2 Refresh Token**. Sin problemas de cuota. |
| **Google Gemini AI**| `@google/genai` (v2.21.0) | ✅ Operativo | Análisis con `gemini-flash-latest` y embeddings con `gemini-embedding-001` (768d). |
| **Autenticación** | JWT + RBAC por Roles | ✅ Operativo | Roles sincronizados desde `src/config/roles.json`. Admin por defecto: `admin@admin.com`. |
| **Categorías CRUD** | Módulo dedicado + BD | ✅ Operativo | Rutas `/api/categorias` y `/api/configuracion/categorias` con actualización en cascada. |
| **Cliente Frontend** | `client/ApiClient.ts` & `client/models/` | ✅ Tipado 100% | Métodos funcionales y clases Active-Record (`Categoria`, `Repositorio`, `Comparativa`). |
| **Pruebas E2E** | `scripts/test_upload_flow.ts` | ✅ Pasando | Comando `npm run test:upload`. |

---

## 2. Decisiones Arquitectónicas Críticas

### 2.1. Google Drive: Migración a OAuth2 (Método B)
* **Motivo:** Las carpetas compartidas con cuentas de servicio de Google Cloud (`Service Account`) fallaban con el error `403 storageQuotaExceeded` debido a que Google no asigna cuota de almacenamiento a cuentas de servicio dentro de cuentas `@gmail.com` personales.
* **Solución Implementada:** Se configuró el flujo de autenticación OAuth2 con Refresh Token en `src/drive/index.ts`.
* **Variables requeridas / opcionales en `.env`:**
  - `GOOGLE_DRIVE_CLIENT_ID`
  - `GOOGLE_DRIVE_CLIENT_SECRET`
  - `GOOGLE_DRIVE_REFRESH_TOKEN`
  - `GOOGLE_DRIVE_FOLDER_ID`
  - `FRONTEND_ORIGIN` *(Opcional pero recomendado: ej. `https://test.utsvps.com` para habilitar CORS directo a Drive)*

### 2.2. Arquitectura de Cero Carga en Servidor
Los archivos binarios nunca atraviesan el backend de Express mediante `multipart/form-data`:
1. El cliente pide una URL prefirmada a `POST /api/repositorios/upload-url`.
2. El cliente sube el archivo binario directamente a los servidores de Google mediante `HTTP PUT`.
3. El cliente registra los metadatos y el `driveFileId` en Neon DB con `POST /api/repositorios`.

### 2.3. Cliente Frontend (`client/ApiClient.ts`)
* Se implementó el helper `unwrapData<T>(res)` para asegurar que las llamadas retornen directamente los objetos de tipo `Repositorio`, `Usuario`, `Rol`, etc., sin obligar al frontend a lidiar con el envoltorio `{ success: true, data: ... }`.

### 2.4. Google Drive: Soporte CORS en Resumable Upload (Navegadores)
* **Problema:** En el flujo resumable directo de Google Drive, el navegador bloqueaba las llamadas directas `PUT` con error `net::ERR_FAILED 200 (OK)` y `No 'Access-Control-Allow-Origin' header is present`.
* **Causa Raíz:** Google Drive solo inyecta encabezados CORS en las peticiones posteriores (`OPTIONS` / `PUT`) si la petición `POST` inicial de creación de la sesión incluía la cabecera `Origin`. Al ejecutarse dicha inicialización en Node.js, no se enviaba `Origin`.
* **Solución Implementada:** El backend ahora detecta el origen web del cliente (`req.body.origin`, `req.headers.origin`, `req.headers.referer` o la variable de entorno `FRONTEND_ORIGIN`) y lo reenvía a Google Drive en la cabecera `Origin` de la petición `POST` inicial. Google Drive responde inyectando `Access-Control-Allow-Origin: <origen>` y permitiendo la subida directa desde el navegador.
* **Documentación Técnica Detallada:** Consulta el archivo [DIAGNOSTICO_Y_SOLUCION_UPLOAD_CORS.md](../DIAGNOSTICO_Y_SOLUCION_UPLOAD_CORS.md) con el análisis exhaustivo de las 5 preguntas del diagnóstico y diagramas de secuencia.

---

## 3. Estructura del Código

```text
db_repo/
├── .agent/
│   ├── CHECKPOINT.md                     # Este archivo de contexto
│   └── skills/
│       └── test-upload-flow/SKILL.md    # Procedimiento de verificación automatizada
├── client/
│   ├── ApiClient.ts                      # Cliente HTTP oficial TypeScript para frontend
│   └── AI_PROMPT_FRONTEND.md            # Guía para el frontend y prompts de IA
├── scripts/
│   └── test_upload_flow.ts              # Script de test E2E de subida de archivos
├── src/
│   ├── auth/                             # Generación y validación de tokens JWT
│   ├── controllers/                      # Controladores HTTP de cada módulo
│   ├── db/
│   │   ├── index.ts                      # Pool de conexión a Neon PostgreSQL
│   │   └── init.ts                       # Migraciones automáticas y seeding inicial
│   ├── drive/
│   │   └── index.ts                      # Módulo de integración con Google Drive (OAuth2)
│   ├── middleware/
│   │   ├── auth.ts                       # Middleware de autenticación
│   │   └── rbac.ts                       # Control de acceso basado en roles
│   ├── modules/                          # Capa de acceso a datos (queries SQL)
│   ├── routes/                           # Definición de rutas Express
│   └── app.ts                            # Entrada de la app Express
├── roles.json                            # Definición canónica de roles y permisos
└── package.json
```

---

## 4. Endpoints Disponibles en la API

* **Autenticación (`/api/auth`):**
  - `POST /login`, `POST /register`, `GET /me`, `GET /session`, `GET /test-token`, `GET /invitacion/:token`
* **Usuarios (`/api/usuarios`):**
  - `GET /`, `GET /:id`, `GET /buscar/gmail/:gmail`, `POST /`, `PUT /:id`, `PATCH /:id/rol`, `DELETE /:id`, `GET /db-status`
* **Roles y Permisos (`/api/roles`):**
  - `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `POST /:id/permisos`, `DELETE /:id`, `POST /sync`
* **Invitaciones (`/api/invitaciones`):**
  - `GET /`, `GET /:id`, `GET /token/:token`, `POST /`, `PUT /:id`, `PATCH /:id/rol`, `PATCH /:id/correo`, `DELETE /:id`
* **Repositorios / Archivos (`/api/repositorios`):**
  - `POST /upload-url`: Genera enlace prefirmado de Google Drive.
  - `GET /drive/status`: Comprueba credenciales y método de Drive activo.
  - `GET /`: Lista archivos con filtros (`categoria`, `nom_arch`, `palabra_clave`, etc.).
  - `GET /:id`: Detalle de repositorio.
  - `POST /`: Registra archivo subido en la base de datos.
  - `POST /procesar-texto`: Recibe texto bruto, genera metadatos + embedding de 768 dimensiones con Gemini AI y lo almacena.
  - `PUT /:id`: Actualiza metadatos.
  - `DELETE /:id`: Elimina registro de la base de datos.
* **Categorías (`/api/categorias` y `/api/configuracion/categorias`):**
  - `GET /`: Listar nombres de categorías registradas (con filtro opcional `?search=`).
  - `GET /:nombre`: Detalle de una categoría con conteo de documentos y comparativas asociadas.
  - `POST /`: Crear una nueva categoría única.
  - `PUT /:nombre`: Renombrar categoría (con actualización en cascada automática en `repositorios` y `comparativas`).
  - `DELETE /:nombre`: Eliminar categoría (con reasignación opcional vía `?reassignTo=`).
* **Configuración (`/api/configuracion`):**
  - CRUD de opciones institucionales, categorías y contextos.
* **Comparativas (`/api/comparativas`):**
  - Comparación de entidades y gestión de URLs asociadas (soporta `embedding vector(768)`).
* **Gemini AI (`/api/gemini`):**
  - `POST /`: Consulta general a Gemini.
  - `POST /analizar-archivo`: Análisis de contenido con IA.

---

## 5. Comandos para Reanudar el Trabajo

### Comprobar Flujo de Subida a Drive
```bash
npm run test:upload
```
*(Opcional: `--keep` para no borrar el registro de prueba de la BD)*

### Comprobar Conexión y Modelos de Gemini AI
```bash
npm run test:gemini
```
*(Diagnostica la clave de API, consulta el catálogo y prueba la generación en todos los modelos recomendados)*

### Validación Integral de Endpoints de la API
```bash
npm run test:api
```
*(Inicia servidor efímero y valida Health, Auth, Gemini AI, Neon DB y Google Drive)*

### Comprobar Tipos TypeScript
```bash
npx tsc --noEmit
```

### Iniciar Servidor en Desarrollo
```bash
npm run dev
```

### Compilar Proyecto
```bash
npm run build
```
