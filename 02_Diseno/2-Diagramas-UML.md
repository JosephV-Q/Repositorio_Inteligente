# DISEÑO 02 — Diagramas UML: Componentes, Despliegue y Secuencia
## Sistema Inteligente de Gestión y Análisis Documental (SIGAD)

*El Diagrama de Casos de Uso ya se presentó en Análisis 04 (sección 1) para mantenerlo junto a sus especificaciones; no se repite aquí. Este documento cubre Componentes, Despliegue y Secuencias de los flujos críticos. Los diagramas se actualizan a la arquitectura implementada: Express, Neon, Gemini, Google Drive y Vercel.*

## 1. Diagrama de componentes

```mermaid
graph TB
    FE[Frontend SPA]

    subgraph API REST Express + TypeScript
        AUTH[AuthModule]
        REPO[RepositoryModule]
        DOC[DocumentModule]
        PROC[ProcessingModule]
        SEARCH[SearchModule / RAG]
        DASH[DashboardModule]
        LOG[AuditModule]
    end

    DB[(Neon PostgreSQL + pgvector)]
    DRIVE[(Google Drive API)]
    IA[Google Gemini API]

    FE --> AUTH
    FE --> REPO
    FE --> DOC
    FE --> SEARCH
    FE --> DASH

    DOC --> PROC
    PROC --> IA
    PROC --> DB
    PROC --> FS
    PROC --> LOG

    SEARCH --> IA
    SEARCH --> DB

    AUTH --> DB
    REPO --> DB
    DOC --> DB
    DOC --> DRIVE
    DASH --> DB
```

**Interfaces entre componentes (contratos internos):**
- `DocumentModule → ProcessingModule`: `procesar_documento(documento_id)` — invocado automáticamente tras una carga exitosa (CU-04 → CU-05).
- `ProcessingModule → AuditModule`: `registrar_evento(documento_id, tipo_evento, detalle)`.
- `SearchModule → ProcessingModule` (dato compartido, no llamada directa): reutiliza los embeddings ya generados por `ProcessingModule` y almacenados en `DB`.

## 2. Diagrama de despliegue

```mermaid
graph TB
    subgraph Equipo del usuario
        Browser[Navegador web]
    end

    subgraph Servidor de aplicación - Nodo único academico
        Nginx[Servidor web / reverse proxy]
        FE_static[Build estático React]
        Backend[Express en Vercel Serverless]
    end

    subgraph Servidor de base de datos
        Postgres[(Neon PostgreSQL + pgvector)]
    end

    subgraph Almacenamiento
        Drive[(Google Drive)]
    end

    subgraph Nube externa
        Gemini_API[Google Gemini API]
    end

    Browser -->|HTTPS| FE_static
    Browser -->|HTTPS /api| Backend
    Backend -->|TLS| Postgres
    Browser -->|PUT directo| Drive
    Backend -->|HTTPS| Gemini_API
```

**Notas de despliegue** (se detallan en el documento de Implementación):
- El backend se despliega como función serverless en Vercel y el frontend como build estático; no se requiere disco local persistente.
- Las credenciales de Neon, Gemini y Google Drive se inyectan por variables de entorno, nunca hardcodeadas (RNF-02).

## 3. Diagramas de secuencia — flujos principales

### 3.1 Secuencia: Carga y procesamiento de documento (CU-04 + CU-05)

```mermaid
sequenceDiagram
    actor Usuario
    participant FE as Frontend
    participant API as API (DocumentModule)
    participant PROC as ProcessingModule
    participant DRIVE as Google Drive
    participant IA as Google Gemini API
    participant DB as Neon PostgreSQL

    Usuario->>FE: Selecciona archivo y repositorio
    FE->>API: POST /api/repositorios/upload-url (metadatos)
    API->>DRIVE: Iniciar sesión resumible
    DRIVE-->>API: uploadUrl
    API-->>FE: URL de subida directa
    FE->>DRIVE: PUT archivo binario
    FE->>API: POST /api/repositorios (driveFileId, metadatos)
    API->>API: Validar datos (RN-01) y tamaño (RN-02)
    alt archivo inválido
        API-->>FE: 400 Error de validación
    else archivo válido
        API->>DRIVE: Confirmar referencia del archivo
        API->>DB: Crear registro y referencia Drive
        API-->>FE: 201 Documento creado
        API->>PROC: Analizar texto recibido
        PROC->>IA: Solicitar clasificación (RF-10)
        IA-->>PROC: Categoría
        PROC->>IA: Solicitar resumen (RF-11)
        IA-->>PROC: Resumen
        PROC->>IA: Solicitar extracción estructurada (RF-12)
        IA-->>PROC: Datos estructurados
        PROC->>IA: Generar embedding de 768 dimensiones
        IA-->>PROC: Vectores
        PROC->>DB: Guardar metadatos y embedding
    end
```

**Manejo de error (RN-07):** si cualquier paso dentro de `PROC` falla, se captura la excepción, se guarda `estado = "Error"` con el detalle en la bitácora (RF-16), y el flujo termina sin propagar el fallo al resto del sistema.

### 3.2 Secuencia: Consulta en lenguaje natural (CU-09, patrón RAG)

```mermaid
sequenceDiagram
    actor Usuario
    participant FE as Frontend
    participant API as API (SearchModule)
    participant DB as PostgreSQL (pgvector)
    participant IA as Google Gemini API

    Usuario->>FE: Escribe pregunta sobre un repositorio
    FE->>API: POST /repositorios/{id}/preguntar {pregunta}
    API->>IA: Generar embedding de la pregunta
    IA-->>API: Vector de la pregunta
    API->>DB: Búsqueda por similitud (top-k fragmentos, cosine)
    DB-->>API: Fragmentos más relevantes
    alt sin fragmentos relevantes
        API-->>FE: "No se encontró información en el repositorio"
    else con fragmentos relevantes
        API->>IA: Prompt = pregunta + fragmentos recuperados (contexto)
        IA-->>API: Respuesta basada en el contexto (RN-08)
        API-->>FE: Respuesta + referencias a documento(s) fuente
    end
```

### 3.3 Diagrama de actividad — ciclo de vida de un documento

```mermaid
flowchart LR
    A([Inicio]) --> B[Cargado]
    B --> C{Procesamiento IA}
    C -->|éxito| D[Procesado]
    C -->|falla| E[Error]
    D --> F([Disponible para búsqueda/consulta])
    E --> G([Visible con detalle del error])
```

---
*Estos diagramas deben ser consistentes entre sí: los componentes usados en 3.1 y 3.2 son exactamente los definidos en la sección 1; los estados usados en 3.3 son los definidos en Análisis 02, sección 4.*
