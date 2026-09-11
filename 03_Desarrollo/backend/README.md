# Backend API: Express + TypeScript (Vercel Serverless & Local)

API REST modular y de alto rendimiento construida con **Express**, **TypeScript** y **PostgreSQL Serverless (Neon DB)**. Diseñada con arquitectura híbrida para correr en servidores tradicionales Node.js o desplegarse como **Serverless Functions en Vercel**.

Incluye:
* **Autenticación Criptográfica:** Sesiones firmadas HMAC-SHA256 y hashing timing-safe de contraseñas.
* **Control de Acceso por Roles (RBAC):** Sincronización automática de roles y permisos por endpoint con la base de datos.
* **Registro por Invitación:** Flujo seguro de generación de enlaces por el administrador y canje de uso único para clientes.
* **Subida Directa a Google Drive (Zero-Server Load):** Enlaces prefirmados resumibles (`uploadType=resumable`) para que los archivos no consuman ancho de banda ni memoria del backend.
* **Integración con Google Gemini AI:** Abstracción para modelos generativos (`@google/genai`).

---

## 📋 Índice
1. [Arquitectura y Estructura del Proyecto](#-estructura-del-proyecto)
2. [Flujos Principales del Sistema](#-flujos-del-sistema)
   * [1. Flujo de Autenticación (Login y Sesión)](#1-flujo-de-autenticación)
   * [2. Flujo de Invitación y Registro de Clientes](#2-flujo-de-invitaciones-y-registro)
   * [3. Flujo de Subida de Archivos con Google Drive](#3-flujo-de-subida-directa-a-google-drive)
   * [4. Flujo de Sincronización de Roles (RBAC)](#4-flujo-de-sincronización-de-roles-y-rbac)
3. [Catálogo Completo de Rutas API](#-catálogo-completo-de-rutas-api)
   * [Rutas Públicas y Healthcheck](#-rutas-públicas-y-healthcheck)
   * [Autenticación (`/api/auth`)](#-módulo-de-autenticación-apiauth)
   * [Roles (`/api/roles`)](#-módulo-de-roles-apiroles)
   * [Invitaciones (`/api/invitaciones`)](#-módulo-de-invitaciones-apiinvitaciones)
   * [Usuarios (`/api/usuarios`)](#-módulo-de-usuarios-apiusuarios)
   * [Repositorios y Archivos (`/api/repositorios`)](#-módulo-de-repositorios-y-archivos-apirepositorios)
   * [Configuración Institucional (`/api/configuracion`)](#-módulo-de-configuración-institucional-apiconfiguracion)
   * [Comparativas (`/api/comparativas`)](#-módulo-de-comparativas-apicomparativas)
   * [Google Gemini AI (`/api/gemini`)](#-módulo-de-gemini-ai-apigemini)
4. [Variables de Entorno (`.env`)](#-variables-de-entorno)
5. [Instalación y Despliegue](#-instalación-y-despliegue)

---

## 📁 Estructura del Proyecto

```text
.
├── api/
│   └── index.ts                 # Punto de entrada para Serverless Functions en Vercel
├── src/
│   ├── app.ts                   # Instancia Express, middlewares globales y manejo de errores
│   ├── server.ts                # Servidor HTTP local (puerto 3000)
│   ├── config/
│   │   ├── roles.json           # Matriz base de roles y endpoints permitidos
│   │   └── roles.ts             # Mapeos, tipos y función isEndpointAllowed
│   ├── controllers/
│   │   ├── auth.controller.ts   # Login, registro por invitación y sesiones
│   │   ├── example.controller.ts# Endpoints de prueba y salud
│   │   ├── gemini.controller.ts # Consultas a Gemini AI
│   │   ├── invitaciones.controller.ts # CRUD de invitaciones y generación de enlaces
│   │   ├── roles.controller.ts  # Consulta de roles y sincronización manual
│   │   └── usuarios.controller.ts# CRUD de usuarios y comprobación de base de datos
│   ├── database/                # Scripts SQL de referencia de esquemas
│   ├── db/
│   │   ├── index.ts             # Cliente Neon PostgreSQL Serverless (singleton)
│   │   └── init.ts              # DDL de tablas, sincronización de roles y usuario admin
│   ├── drive/
│   │   └── index.ts             # Integración con Google Drive API v3 (JWT RS256 / OAuth2)
│   ├── gemini/
│   │   └── index.ts             # Abstracción de Google Gemini AI
│   ├── middlewares/
│   │   └── auth.middleware.ts   # Middleware global de autenticación y autorización RBAC
│   ├── modules/                 # Capa de acceso a datos (CRUD tipado para PostgreSQL)
│   ├── routes/
│   │   ├── auth.ts              # Subrutas de /api/auth
│   │   ├── gemini.ts            # Subrutas de /api/gemini
│   │   ├── health.ts            # Subrutas de /api/health
│   │   ├── index.ts             # Router maestro /api
│   │   ├── invitaciones.ts      # Subrutas de /api/invitaciones
│   │   ├── roles.ts             # Subrutas de /api/roles
│   │   └── usuarios.ts          # Subrutas de /api/usuarios
│   └── utils/
│       └── security.ts          # Hasheo HMAC, timing-safe compare y tokens de sesión
├── .env.example                 # Plantilla de variables de entorno requeridas
├── tsconfig.json                # Configuración TypeScript (NodeNext, ES2022)
├── vercel.json                  # Reescrituras de enrutamiento para Vercel
└── package.json
```

---

## 🔄 Flujos del Sistema

### 1. Flujo de Autenticación
```
Cliente                                          Backend (API)
   │                                                   │
   ├────── POST /api/auth/login { gmail, password } ──►│
   │                                                   ├─ Verifica contraseña con HMAC timing-safe
   │                                                   ├─ Genera token de sesión firmado
   │◄───── 200 OK { token, user } ─────────────────────┤
   │                                                   │
   ├────── Petición con Header 'Authorization: Bearer'►│
   │                                                   ├─ authMiddleware valida firma
   │                                                   ├─ Comprueba RBAC con roles.json
   │◄───── Respuesta autorizada ───────────────────────┤
```

### 2. Flujo de Invitaciones y Registro
```
Admin (Rol 1)                                Backend (API)                               Cliente
   │                                               │                                        │
   ├─ POST /api/invitaciones { correo, rol } ─────►│                                        │
   │                                               ├─ Valida que rol exista en tabla roles  │
   │                                               ├─ Genera token criptográfico de 32 bytes│
   │◄─ 201 Created { enlace_registro, token } ─────┤                                        │
   │                                               │                                        │
   │                   (Envía enlace al cliente)   │                                        │
   │═══════════════════════════════════════════════╪═══════════════════════════════════════►│
   │                                               │                                        │
   │                                               │◄─ GET /api/auth/invitacion/:token ─────┤
   │                                               ├─ Valida token y retorna rol            │
   │                                               ├─────── 200 OK { valid: true } ────────►│
   │                                               │                                        │
   │                                               │◄─ POST /api/auth/register ─────────────┤
   │                                               │   { token, nombre, password }          │
   │                                               ├─ Verifica rol contra tabla roles       │
   │                                               ├─ Hashea password con HMAC              │
   │                                               ├─ Inserta usuario en DB                 │
   │                                               ├─ Elimina invitación (un solo uso)      │
   │                                               ├─ Genera token de sesión                │
   │                                               ├─────── 201 Created { token, user } ───►│
```

### 3. Flujo de Subida Directa a Google Drive
```
Cliente                                      Backend (API)                           Google Drive
   │                                               │                                       │
   ├── POST /api/repositorios/upload-url ─────────►│                                       │
   │   { fileName, mimeType, fileSize }            ├── Inicia sesión resumible con JWT ───►│
   │                                               │◄─ Retorna Location: uploadUrl ────────┤
   │◄─ 200 OK { uploadUrl } ───────────────────────┤                                       │
   │                                                                                       │
   ├── PUT <uploadUrl> (Envía binario directo) ───────────────────────────────────────────►│
   │                                                                                       │
   │◄── 200 OK { id: "driveFileId", name: "archivo.pdf" } ─────────────────────────────────┤
   │                                               │                                       │
   ├── POST /api/repositorios ────────────────────►│                                       │
   │   { nom_arch, driveFileId, categoria... }     ├─ Guarda registro en PostgreSQL        │
   │◄─ 201 Created { data: repositorio } ──────────┤                                       │
```

### 4. Flujo de Sincronización de Roles y RBAC
1. **Arranque de la instancia:** Cada worker o servidor local ejecuta `ensureDatabaseTables()` en su inicialización.
2. **Sincronización:** Llama a `syncRolesFromConfig()`, la cual lee `src/config/roles.json` y compara cada rol contra la tabla `roles` de PostgreSQL:
   * Si el rol existe pero cambiaron sus endpoints, actualiza `permisos_rol` (`JSONB`).
   * Si no existe, lo crea con su ID designado (`ROLE_NAME_TO_ID`).
   * Sincroniza la secuencia autoincremental `SERIAL` de la base de datos.
3. **Validación en peticiones:** `authMiddleware` intercepta todas las peticiones a `/api/*`:
   * Si es pública, permite el paso.
   * Si es protegida, valida el token (`401`) y valida si el rol del usuario contiene el endpoint (`403`).

---

## 📡 Catálogo Completo de Rutas API

### 🌐 Rutas Públicas y Healthcheck

#### `GET /`
* **Acceso:** Público
* **Descripción:** Bienvenida y referencia rápida de la API.
* **Respuesta (`200 OK`):**
  ```json
  {
    "message": "API Express en Vercel Serverless Functions",
    "documentation": "/api/health"
  }
  ```

#### `GET /api/health`
* **Acceso:** Público
* **Descripción:** Estado del servidor, hora actual y entorno (`development` / `production`).
* **Respuesta (`200 OK`):**
  ```json
  {
    "status": "online",
    "timestamp": "2026-09-09T23:00:00.000Z",
    "environment": "development"
  }
  ```

#### `GET /api/hello?name=TuNombre`
* **Acceso:** Público
* **Descripción:** Saludo de prueba con parámetro opcional.

---

### 🔑 Módulo de Autenticación (`/api/auth`)

#### `POST /api/auth/login`
* **Acceso:** Público
* **Descripción:** Inicia sesión con credenciales registradas.
* **Cuerpo (JSON):**
  ```json
  {
    "gmail": "admin@admin.com",
    "password": "tu_password"
  }
  ```
* **Respuesta (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "Inicio de sesión exitoso.",
    "token": "eyJpZCI6MS...signedToken",
    "user": {
      "id": 1,
      "nombre": "Administrador",
      "gmail": "admin@admin.com",
      "rol": 1,
      "nombre_rol": "admin"
    }
  }
  ```

#### `POST /api/auth/register`
* **Acceso:** Público (Requiere token de invitación válido)
* **Descripción:** Registra un nuevo usuario consumiendo el token de invitación.
* **Cuerpo (JSON):**
  ```json
  {
    "token": "a1b2c3d4e5f6...token_invitacion",
    "nombre": "Carlos Gómez",
    "password": "passwordSeguro123"
  }
  ```
* **Respuesta (`201 Created`):**
  ```json
  {
    "success": true,
    "message": "Registro completado exitosamente a través de la invitación. Sesión iniciada.",
    "token": "eyJpZCI6Mi...signedToken",
    "user": {
      "id": 2,
      "nombre": "Carlos Gómez",
      "gmail": "carlos@empresa.com",
      "rol": 3,
      "nombre_rol": "usuario"
    }
  }
  ```

#### `GET /api/auth/invitacion/:token`
* **Acceso:** Público
* **Descripción:** Permite consultar los datos de una invitación antes de enviar el formulario de registro.
* **Respuesta (`200 OK`):**
  ```json
  {
    "success": true,
    "valid": true,
    "message": "Invitación válida.",
    "invitacion": {
      "correo": "carlos@empresa.com",
      "rol": 3,
      "nombre_rol": "usuario"
    }
  }
  ```

#### `GET /api/auth/me` (o `/api/auth/session`)
* **Acceso:** Autenticado (`admin`, `editor`, `usuario`, `invitado`)
* **Headers:** `Authorization: Bearer <token>`
* **Descripción:** Retorna la identidad y rol del usuario de la sesión actual.

#### `POST /api/auth/validate-session`
* **Acceso:** Público / Autenticado
* **Descripción:** Valida la firma del token enviado en header `Authorization`, `x-session-token`, query param o body `{ "token": "..." }`.

#### `GET /api/auth/test-token`
* **Acceso:** Público
* **Descripción:** Genera un token de sesión de prueba asociado al administrador para agilizar pruebas en desarrollo.

---

### 🛡️ Módulo de Roles (`/api/roles`)

#### `GET /api/roles`
* **Acceso:** Solo Administrador (`admin`)
* **Headers:** `Authorization: Bearer <token_admin>`
* **Query Params:** `?nombre=...` (opcional, filtra por coincidencia parcial de nombre)
* **Descripción:** Obtiene la lista de todos los roles registrados en la base de datos con sus listas de endpoints (`JSONB`).
* **Respuesta (`200 OK`):**
  ```json
  {
    "success": true,
    "total": 4,
    "data": [
      {
        "id_roles": 1,
        "nombre_rol": "admin",
        "permisos_rol": ["*", "/api/health", "/api/usuarios", "/api/roles", "..."]
      },
      {
        "id_roles": 2,
        "nombre_rol": "editor",
        "permisos_rol": ["/api/health", "/api/usuarios", "/api/repositorios", "..."]
      }
    ]
  }
  ```

#### `GET /api/roles/:id`
* **Acceso:** Solo Administrador (`admin`)
* **Descripción:** Obtiene el detalle de un rol por su ID numérico.

#### `POST /api/roles/sync`
* **Acceso:** Solo Administrador (`admin`)
* **Descripción:** Fuerza la sincronización de la tabla `roles` con `src/config/roles.json` bajo demanda.

#### `POST /api/roles`
* **Acceso:** Solo Administrador (`admin`)
* **Cuerpo (JSON):**
  ```json
  {
    "nombre_rol": "auditor",
    "permisos_rol": ["/api/health", "/api/repositorios", "/api/comparativas"]
  }
  ```
* **Descripción:** Crea un nuevo rol en la base de datos.

#### `PUT /api/roles/:id`
* **Acceso:** Solo Administrador (`admin`)
* **Cuerpo (JSON):**
  ```json
  {
    "nombre_rol": "auditor_senior",
    "permisos_rol": ["*"]
  }
  ```
* **Descripción:** Actualiza el nombre o la lista de permisos de un rol.

#### `POST /api/roles/:id/permisos`
* **Acceso:** Solo Administrador (`admin`)
* **Cuerpo (JSON):** `{ "permiso": "/api/configuracion" }`
* **Descripción:** Agrega un permiso específico al array JSONB del rol.

#### `DELETE /api/roles/:id`
* **Acceso:** Solo Administrador (`admin`)
* **Descripción:** Elimina un rol por su ID (protegido contra la eliminación del rol admin ID: 1).

---

### ✉️ Módulo de Invitaciones (`/api/invitaciones`)

#### `POST /api/invitaciones`
* **Acceso:** Solo Administrador (`admin`)
* **Headers:** `Authorization: Bearer <token_admin>`
* **Cuerpo (JSON):**
  ```json
  {
    "correo": "colaborador@dominio.com",
    "rol": 2
  }
  ```
* **Respuesta (`201 Created`):**
  ```json
  {
    "success": true,
    "message": "Invitación y enlace creados exitosamente.",
    "data": {
      "id": 5,
      "token": "3a4b5c6d7e8f...32bytesHex",
      "correo": "colaborador@dominio.com",
      "rol": 2,
      "nombre_rol": "editor",
      "enlace_registro": "http://localhost:3000/api/auth/register?token=3a4b5c6d7e8f..."
    }
  }
  ```

#### `GET /api/invitaciones`
* **Acceso:** Solo Administrador (`admin`)
* **Query Params:** `?correo=...`, `?rol=...`, `?limit=50`, `?offset=0`
* **Descripción:** Lista todas las invitaciones pendientes.

#### `GET /api/invitaciones/:id`
* **Acceso:** Solo Administrador (`admin`)
* **Descripción:** Consulta una invitación por su ID primario.

#### `GET /api/invitaciones/token/:token`
* **Acceso:** Público / Invitado
* **Descripción:** Consulta los datos de la invitación asociada al token.

#### `PUT /api/invitaciones/:id`
* **Acceso:** Solo Administrador (`admin`)
* **Descripción:** Actualiza los datos de la invitación (valida que el rol exista en la base de datos).

#### `PATCH /api/invitaciones/:id/rol`
* **Acceso:** Solo Administrador (`admin`)
* **Cuerpo:** `{ "rol": 3 }`

#### `PATCH /api/invitaciones/:id/correo`
* **Acceso:** Solo Administrador (`admin`)
* **Cuerpo:** `{ "correo": "nuevo_correo@dominio.com" }`

#### `DELETE /api/invitaciones/:id`
* **Acceso:** Solo Administrador (`admin`)
* **Descripción:** Cancela y elimina una invitación.

---

### 👥 Módulo de Usuarios (`/api/usuarios`)

#### `GET /api/usuarios`
* **Acceso:** `admin`, `editor`
* **Headers:** `Authorization: Bearer <token>`
* **Query Params:** `?nombre=...`, `?rol=...`, `?limit=50`, `?offset=0`
* **Descripción:** Lista de usuarios registrados (las contraseñas se omiten de la respuesta).

#### `GET /api/usuarios/:id`
* **Acceso:** `admin`, `editor`
* **Descripción:** Obtiene un usuario específico por su ID.

#### `GET /api/usuarios/buscar/gmail/:gmail`
* **Acceso:** `admin`, `editor`
* **Descripción:** Búsqueda directa por correo electrónico.

#### `GET /api/usuarios/db-status`
* **Acceso:** `admin`
* **Descripción:** Comprueba el estado de conexión directa y latencia contra Neon PostgreSQL.

#### `POST /api/usuarios`
* **Acceso:** `admin`
* **Cuerpo (JSON):**
  ```json
  {
    "nombre": "Nuevo Editor",
    "gmail": "editor@empresa.com",
    "password": "Password123",
    "rol": 2
  }
  ```
* **Descripción:** Crea un usuario directamente. Hashea la contraseña automáticamente y valida la existencia del rol.

#### `PUT /api/usuarios/:id`
* **Acceso:** `admin`
* **Descripción:** Actualiza parcialmente datos de usuario. Si incluye `password`, la hashea con HMAC.

#### `PATCH /api/usuarios/:id/rol`
* **Acceso:** `admin`
* **Cuerpo:** `{ "rol": 1 }`

#### `DELETE /api/usuarios/:id`
* **Acceso:** `admin`
* **Descripción:** Elimina un usuario por su ID.

---

### 📂 Módulo de Repositorios y Archivos (`/api/repositorios`)

> 📘 **Guía paso a paso:** Para vincular tu cuenta personal de Google Drive o configurar una Cuenta de Servicio, consulta la guía dedicada: [README_GOOGLE_DRIVE.md](./README_GOOGLE_DRIVE.md).

#### `POST /api/repositorios/upload-url` (o `/drive/upload-url`)
* **Acceso:** `admin`, `editor`, `usuario`
* **Headers:** `Authorization: Bearer <token>`
* **Descripción:** Solicita a Google Drive una sesión prefirmada resumible para subida directa sin pasar por el servidor.
* **Cuerpo (JSON):**
  ```json
  {
    "fileName": "informe_2026.pdf",
    "mimeType": "application/pdf",
    "fileSize": 10485760,
    "folderId": "1a2b3c..." // Opcional
  }
  ```
* **Respuesta (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "Enlace de subida directa generado exitosamente con Google Drive.",
    "uploadUrl": "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=ADPycd...",
    "fileName": "informe_2026.pdf",
    "mimeType": "application/pdf",
    "expiresInSeconds": 86400,
    "instructions": "Envía el archivo binario directamente a \"uploadUrl\" mediante una petición HTTP PUT con la cabecera Content-Type correspondiente."
  }
  ```

#### Subida directa desde el Cliente (Frontend):
```javascript
// Petición directa a Google Drive:
await fetch(uploadUrl, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/pdf'
  },
  body: fileBlob
});
```

#### `GET /api/repositorios/drive/status`
* **Acceso:** `admin`, `editor`, `usuario`
* **Descripción:** Comprueba si la cuenta común de Google Drive está configurada en `.env` (Service Account u OAuth2).

#### `POST /api/repositorios`
* **Acceso:** `admin`, `editor`, `usuario`
* **Descripción:** Registra el archivo subido en la base de datos tras completarse la subida a Google Drive.
* **Cuerpo (JSON):**
  ```json
  {
    "nom_arch": "informe_2026.pdf",
    "driveFileId": "1a2b3c4d5e6f...",
    "categoria": "Finanzas",
    "descripcion": "Reporte anual del ejercicio 2026",
    "resumen": "Resumen ejecutivo de ingresos y balance",
    "palabras_clave": ["finanzas", "balance", "2026"],
    "contexto": "Contabilidad"
  }
  ```
* **Respuesta (`201 Created`):**
  ```json
  {
    "success": true,
    "message": "Archivo registrado exitosamente en el repositorio.",
    "data": {
      "id": 1,
      "nom_arch": "informe_2026.pdf",
      "ruta_arch": "https://drive.google.com/file/d/1a2b3c4d5e6f.../view",
      "categoria": "Finanzas",
      "descripcion": "Reporte anual del ejercicio 2026",
      "resumen": "Resumen ejecutivo de ingresos y balance",
      "palabras_clave": ["finanzas", "balance", "2026"],
      "contexto": "Contabilidad"
    }
  }
  ```

#### `GET /api/repositorios`
* **Acceso:** `admin`, `editor`, `usuario`
* **Query Params:** `?categoria=...`, `?nom_arch=...`, `?palabra_clave=...`, `?contexto=...`, `?limit=50`, `?offset=0`
* **Descripción:** Consulta y búsqueda de repositorios almacenados.

#### `GET /api/repositorios/:id`
* **Acceso:** `admin`, `editor`, `usuario`
* **Descripción:** Consulta un repositorio por su ID.

#### `PUT /api/repositorios/:id`
* **Acceso:** `admin`, `editor`
* **Descripción:** Actualiza metadatos de un repositorio.

#### `DELETE /api/repositorios/:id`
* **Acceso:** `admin`, `editor`
* **Descripción:** Elimina el registro del repositorio de la base de datos.

---

### ⚙️ Módulo de Configuración Institucional (`/api/configuracion`)

#### `GET /api/configuracion`
* **Acceso:** `admin`, `editor`
* **Query Params:** `?nom_institucion=...`, `?categoria=...`, `?limit=50`, `?offset=0`
* **Descripción:** Consulta los registros de configuración y categorías institucionales.

#### `GET /api/configuracion/:id`
* **Acceso:** `admin`, `editor`
* **Descripción:** Obtiene un registro de configuración por su ID.

#### `POST /api/configuracion`
* **Acceso:** `admin`, `editor`
* **Cuerpo (JSON):**
  ```json
  {
    "nom_institucion": "Universidad Nacional de Ingeniería",
    "categorias": ["Tesis", "Artículos", "Investigación", "Proyectos"]
  }
  ```
* **Descripción:** Crea un nuevo registro de configuración institucional.

#### `PUT /api/configuracion/:id`
* **Acceso:** `admin`, `editor`
* **Cuerpo (JSON):**
  ```json
  {
    "nom_institucion": "Universidad Nacional de Ingeniería - Facultad de Sistemas",
    "categorias": ["Tesis", "Artículos", "Innovación"]
  }
  ```
* **Descripción:** Actualiza el nombre o la lista completa de categorías.

#### `POST /api/configuracion/:id/categorias`
* **Acceso:** `admin`, `editor`
* **Cuerpo (JSON):** `{ "categoria": "Robótica" }`
* **Descripción:** Añade una categoría al array de categorías (evita duplicados).

#### `DELETE /api/configuracion/:id/categorias/:categoria`
* **Acceso:** `admin`, `editor`
* **Descripción:** Remueve una categoría específica del array.

#### `DELETE /api/configuracion/:id`
* **Acceso:** `admin`
* **Descripción:** Elimina un registro de configuración por su ID.

---

### 📊 Módulo de Comparativas (`/api/comparativas`)

#### `GET /api/comparativas`
* **Acceso:** `admin`, `editor`, `usuario`
* **Query Params:** `?titulo=...`, `?categoria=...`, `?contexto=...`, `?url=...`, `?limit=50`, `?offset=0`
* **Descripción:** Lista todas las comparativas almacenadas con soporte de filtros.

#### `GET /api/comparativas/:id`
* **Acceso:** `admin`, `editor`, `usuario`
* **Descripción:** Consulta el detalle de una comparativa por su ID.

#### `POST /api/comparativas`
* **Acceso:** `admin`, `editor`, `usuario`
* **Cuerpo (JSON):**
  ```json
  {
    "titulo": "Comparativa de Frameworks Web 2026",
    "urls": [
      "https://expressjs.com",
      "https://fastify.dev"
    ],
    "comparativa": "Express vs Fastify",
    "descripcion": "Análisis de rendimiento, ecosistema y facilidad de uso.",
    "categoria": "Desarrollo Backend",
    "contexto": "Evaluación para nueva arquitectura"
  }
  ```
* **Descripción:** Crea un nuevo análisis comparativo.

#### `PUT /api/comparativas/:id`
* **Acceso:** `admin`, `editor`, `usuario`
* **Descripción:** Actualiza campos de una comparativa existente.

#### `POST /api/comparativas/:id/urls`
* **Acceso:** `admin`, `editor`, `usuario`
* **Cuerpo (JSON):** `{ "url": "https://nestjs.com" }`
* **Descripción:** Añade una nueva URL al array de enlaces de la comparativa.

#### `DELETE /api/comparativas/:id/urls`
* **Acceso:** `admin`, `editor`, `usuario`
* **Cuerpo o Query:** `{ "url": "https://fastify.dev" }`
* **Descripción:** Remueve una URL del array de enlaces.

#### `DELETE /api/comparativas/:id`
* **Acceso:** `admin`, `editor`
* **Descripción:** Elimina un registro de comparativa por su ID.

---

### 🧠 Módulo de Gemini AI (`/api/gemini`)

#### `POST /api/gemini` (o `GET /api/gemini`)
* **Acceso:** `admin`, `editor`, `usuario`
* **Headers:** `Authorization: Bearer <token>`, opcionalmente `x-gemini-api-key`
* **Cuerpo (JSON):**
  ```json
  {
    "prompt": "¿Qué estrategia me recomiendas para clasificar estos repositorios?",
    "systemInstruction": "Eres un asistente técnico senior y conciso.",
    "context": "El repositorio contiene 50 artículos de investigación sobre machine learning.",
    "temperature": 0.7,
    "model": "gemini-3.6-flash"
  }
  ```
* **Respuesta (`200 OK`):**
  ```json
  {
    "success": true,
    "data": {
      "response": "Te recomiendo utilizar una taxonomía basada en...",
      "model": "gemini-3.6-flash",
      "usage": {
        "promptTokens": 35,
        "candidatesTokens": 120,
        "totalTokens": 155
      }
    }
  }
  ```

#### `GET /api/gemini/status`
* **Acceso:** `admin`, `editor`, `usuario`
* **Descripción:** Comprueba si la clave `GEMINI_API_KEY` está configurada en `.env`.

---

## ⚙️ Variables de Entorno

Copia el archivo `.env.example` a `.env`:
```bash
cp .env.example .env
```

| Variable | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `PORT` | Puerto de escucha en desarrollo local | `3000` |
| `NODE_ENV` | Entorno de ejecución | `development` / `production` |
| `DATABASE_URL` | Cadena de conexión a Neon PostgreSQL | `postgresql://user:pass@ep-...neon.tech/neondb?sslmode=require` |
| `HASH_SECRET` | Clave secreta para hashing HMAC de contraseñas y firma de tokens | `clave_secreta_super_segura_cambiar_en_prod` |
| `ADMIN_NAME` | Nombre inicial del usuario administrador | `Administrador` |
| `ADMIN_EMAIL` | Correo del administrador para inicialización | `admin@admin.com` |
| `ADMIN_PASSWORD` | Contraseña inicial del administrador | `admin123456` |
| `ADMIN_ROLE` | ID del rol asignado al administrador | `1` |
| `GEMINI_API_KEY` | API Key de Google Gemini | `AIzaSy...` |
| `GOOGLE_DRIVE_CLIENT_EMAIL` | Correo de la Service Account de Google Cloud | `service-account@proyecto.iam.gserviceaccount.com` |
| `GOOGLE_DRIVE_PRIVATE_KEY` | Clave privada RSA de la Service Account | `"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"` |
| `GOOGLE_DRIVE_FOLDER_ID` | ID de la carpeta compartida en Drive (opcional) | `1a2b3c4d5e6f...` |
| `GOOGLE_DRIVE_CLIENT_ID` | Client ID OAuth2 (Alternativa si no usas Service Account) | `...apps.googleusercontent.com` |
| `GOOGLE_DRIVE_CLIENT_SECRET`| Client Secret OAuth2 | `GOCSPX-...` |
| `GOOGLE_DRIVE_REFRESH_TOKEN`| Refresh Token OAuth2 | `1//04...` |

---

## 🚀 Instalación y Despliegue

### 1. Instalación de dependencias
```bash
npm install
```

### 2. Inicialización de la base de datos (Opcional, se ejecuta automáticamente al iniciar el servidor)
```bash
npm run db:init
```

### 3. Ejecución en desarrollo local (con hot-reload mediante `tsx`)
```bash
npm run dev
```
Servidor disponible en `http://localhost:3000`.

### 4. Compilación de TypeScript
```bash
npm run build
```

### 5. Despliegue en Vercel
1. Conecta el repositorio en el Dashboard de [Vercel](https://vercel.com).
2. Configura las variables de entorno en **Project Settings -> Environment Variables**.
3. Vercel detectará automáticamente `api/index.ts` y `vercel.json` y desplegará la API como Serverless Functions.
