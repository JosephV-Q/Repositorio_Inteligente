# DISEÑO 07 — Decisiones Tecnológicas y Diseño de Seguridad
## Sistema Inteligente de Gestión y Análisis Documental (SIGAD)

> **Decisión vigente verificada (2026-09-10):** el backend implementado es Node.js + Express + TypeScript, la IA es Google Gemini, los archivos se almacenan en Google Drive y la autenticación usa tokens HMAC-SHA256. Las tablas históricas de este documento se conservan como registro de alternativas, pero la selección operativa vigente es la descrita en la sección 1.5.

## 1. Comparación y selección de tecnologías

### 1.1 Backend

| Alternativa | Ventajas | Desventajas | Decisión |
|---|---|---|---|
| Node.js + Express | Mismo lenguaje que el frontend (JS/TS); buen soporte async | Ecosistema NLP/RAG/OCR menos maduro que Python | Descartada |
| **Node.js + Express + TypeScript** | Mismo lenguaje que el frontend, asincronía nativa, módulos por dominio y despliegue directo en Vercel | Requiere delegar extracción local y análisis IA a servicios/librerías específicas | **Seleccionada vigente** |

### 1.2 Base de datos / almacenamiento vectorial

| Alternativa | Ventajas | Desventajas | Decisión |
|---|---|---|---|
| Base vectorial dedicada (ChromaDB, Pinecone, Weaviate) | Optimizada específicamente para vectores | Infraestructura adicional a administrar; sincronización con la base relacional | Descartada para el alcance académico |
| **PostgreSQL + pgvector** | Un solo motor para datos relacionales y vectores; suficiente rendimiento para el volumen mínimo exigido (30 documentos de prueba); reduce puntos de fallo | Menor rendimiento que una base vectorial dedicada a gran escala (no aplica al alcance del proyecto) | **Seleccionada** |

### 1.3 Proveedor de IA

| Alternativa | Ventajas | Desventajas | Decisión |
|---|---|---|---|
| Modelos open-source locales (ej. Llama + sentence-transformers) | Sin costo por uso, sin dependencia externa | Requiere infraestructura de cómputo (GPU) no garantizada en el ambiente académico; calidad en español más variable | Descartada para este alcance |
| **Google Gemini** (`gemini-3.6-flash` + `gemini-embedding-001`) | SDK oficial `@google/genai`, generación y embeddings integrados, sin infraestructura propia | Dependencia de cuota y disponibilidad externa | **Seleccionada vigente** |

### 1.4 Almacenamiento de archivos

| Alternativa | Ventajas | Desventajas | Decisión |
|---|---|---|---|
| Object storage en la nube (S3/MinIO) | Escalable, desacoplado del servidor | Infraestructura y configuración adicional para un proyecto académico | Descartada para esta fase |
| **Google Drive API v3** con sesión resumible | Almacenamiento externo, persistente y con subida directa cliente→Drive | Depende de credenciales, cuota y CORS de Google | **Seleccionada vigente** |

## 2. Diseño básico de seguridad

| Aspecto | Diseño |
|---|---|
| Autenticación | Token de sesión propio: payload codificado y firma HMAC-SHA256 con `HASH_SECRET`; se transporta como Bearer token. |
| Almacenamiento de contraseñas | Hash HMAC-SHA256 con `HASH_SECRET` y comparación timing-safe; nunca se almacena texto plano. |
| Autorización | Middleware que valida el rol del usuario contra la ruta solicitada (RF-02, RN-06); rutas de Administrador rechazan con 403 a otros roles. |
| Gestión de credenciales externas | API key de Gemini, URL de Neon, credenciales OAuth2 de Drive y secretos de sesión únicamente en variables de entorno (`.env`), excluidas del control de versiones vía `.gitignore`. |
| Validación de archivos | Verificación de extensión y tipo MIME real del archivo (no solo la extensión) antes de almacenarlo, para evitar carga de archivos disfrazados (RN-01). |
| Límite de tamaño | Validación de tamaño en el propio endpoint antes de escribir a disco (RN-02). |
| Transporte | HTTPS obligatorio en el entorno de despliegue (documentado en Implementación). |
| Sanitización de entradas | Validación de payloads con Pydantic (backend) antes de tocar la base de datos, mitigando inyección. |
| Registro de accesos sensibles | Toda acción de eliminación (documento/repositorio) y toda consulta IA quedan registradas (RF-17, tabla `consulta_ia`), permitiendo auditoría. |

## 3. Resiliencia ante fallos del servicio de IA (mitigación de R-01)

- Reintentos con backoff exponencial (máx. 3 intentos) ante errores transitorios (timeouts, rate limit) del servicio de IA.
- Si tras los reintentos el servicio no responde, el documento se marca `estado = 'error'` con el detalle correspondiente (RN-07); el usuario puede reintentar el procesamiento manualmente desde el detalle del documento.
- Los módulos que no dependen de IA (autenticación, gestión de repositorios, listado/descarga de documentos) permanecen operativos aunque el servicio de IA esté caído.

---
*Con este documento se completa la fase de Diseño. Verificación de consistencia final: cada decisión aquí tomada implementa una necesidad concreta de Análisis 02 (RNF-02, RNF-05, RNF-07) y del flujo de Diseño 06 — ninguna tecnología fue elegida sin relación directa a un requisito.*
