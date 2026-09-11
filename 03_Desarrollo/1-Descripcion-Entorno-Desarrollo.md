# Desarrollo 01 — Descripción del entorno de desarrollo
## Sistema Inteligente de Gestión y Análisis Documental (SIGAD)

**Fecha de verificación:** 2026-09-10  
**Estado:** operativo y verificado de punta a punta.

## 1. Arquitectura de trabajo

El repositorio se organiza en dos aplicaciones:

- `03_Desarrollo/backend`: API REST modular con Node.js, Express y TypeScript. Puede ejecutarse como servidor HTTP local o como función serverless en Vercel.
- `03_Desarrollo/frontend`: SPA React + TypeScript construida con Vite. Incluye extracción local de PDF y DOCX mediante `pdfjs-dist` y `mammoth`.
- `Neon PostgreSQL`: base de datos serverless con `pgvector`, vectores de 768 dimensiones e índices HNSW.
- `Google Drive`: almacenamiento externo de los binarios. El navegador sube directamente mediante una sesión resumible; el backend solo coordina la URL y persiste metadatos.
- `Google Gemini`: generación de texto y embeddings mediante `@google/genai`.

## 2. Herramientas y versiones declaradas

| Área | Tecnología |
|---|---|
| Backend | Node.js, Express 4, TypeScript 5.4, `tsx` |
| Frontend | React 19, Vite 8, TypeScript 6 |
| Persistencia | Neon PostgreSQL serverless, `@neondatabase/serverless`, `pgvector` |
| IA | `@google/genai` 2.21, Gemini Flash y `gemini-embedding-001` |
| Calidad frontend | `oxlint` |
| Despliegue | Vercel Serverless Functions |
| Control de versiones | Git |

Las versiones concretas se controlan mediante `package.json` y los archivos lock del backend.

## 3. Estructura relevante

```text
03_Desarrollo/
├── backend/
│   ├── api/index.ts              # Entrada de Vercel
│   ├── src/app.ts                # Express y middlewares
│   ├── src/server.ts             # Servidor local
│   ├── src/controllers/          # Controladores HTTP
│   ├── src/modules/              # Consultas y persistencia
│   ├── src/db/                   # Cliente e inicialización Neon
│   ├── src/drive/                # Google Drive
│   ├── src/gemini/               # Gemini y embeddings
│   ├── src/middlewares/          # Sesión y RBAC
│   └── scripts/                  # Pruebas ejecutables
└── frontend/
    ├── src/                      # Aplicación React
    ├── client/                   # ApiClient y modelos
    └── public/
```

## 4. Flujo de trabajo del equipo

1. Crear o actualizar un archivo `.env` local a partir de `.env.example` sin subirlo a Git.
2. Instalar dependencias del backend y frontend con `pnpm install` o el gestor equivalente definido por el equipo.
3. Ejecutar la API y el frontend por separado.
4. Verificar tipos y lint antes de integrar cambios.
5. Ejecutar las pruebas de API, Gemini y subida antes de declarar una versión demostrable.

## 5. Convenciones de seguridad

- El token de sesión no es JWT: es un payload codificado con firma HMAC-SHA256.
- Las contraseñas se almacenan como hash HMAC-SHA256 usando `HASH_SECRET`.
- Los roles y permisos se definen en `src/config/roles.json` y se sincronizan con la tabla `roles`.
- No se almacenan binarios en el backend ni secretos en el repositorio.
- Los archivos `.env` están excluidos mediante `.gitignore`.

## 6. Limitaciones conocidas

La extracción de PDF/DOCX se realiza en el cliente y el backend recibe el texto para analizarlo. El alcance garantizado es texto extraíble; un PDF escaneado puede requerir OCR, que no forma parte de la implementación verificada. Las consultas y comparativas deben validarse contra los endpoints disponibles, porque el esquema actual no contiene todas las entidades del modelo conceptual original.
