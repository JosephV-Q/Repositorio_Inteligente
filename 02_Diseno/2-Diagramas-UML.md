# DISEÑO 02 — Diagramas UML: Componentes, Despliegue y Secuencia
## Sistema Inteligente de Gestión y Análisis Documental (SIGAD)

*El Diagrama de Casos de Uso ya se presentó en Análisis 04 (sección 1) para mantenerlo junto a sus especificaciones; no se repite aquí. Este documento cubre Componentes, Despliegue y Secuencias de los flujos críticos.*

## 1. Diagrama de componentes

```mermaid
graph TB
    FE[Frontend SPA]

    subgraph API REST FastAPI
        AUTH[AuthModule]
        REPO[RepositoryModule]
        DOC[DocumentModule]
        PROC[ProcessingModule]
        SEARCH[SearchModule / RAG]
        DASH[DashboardModule]
        LOG[AuditModule]
    end

    DB[(PostgreSQL + pgvector)]
    FS[(Almacenamiento archivos)]
    IA[OpenAI API]

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
    DOC --> FS
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
        Backend[Proceso FastAPI - Uvicorn]
    end

    subgraph Servidor de base de datos
        Postgres[(PostgreSQL 15 + pgvector)]
    end

    subgraph Almacenamiento
        Files[(Directorio de archivos por repositorio)]
    end

    subgraph Nube externa
        OpenAI_API[OpenAI API]
    end

    Browser -->|HTTPS 443| Nginx
    Nginx --> FE_static
    Nginx -->|proxy /api| Backend
    Backend -->|TCP 5432| Postgres
    Backend -->|lectura/escritura| Files
    Backend -->|HTTPS 443| OpenAI_API
```

**Notas de despliegue** (se detallan en el documento de Implementación):
- Backend y Frontend pueden desplegarse en un único nodo para el alcance académico (contenedor o servidor único).
- Las credenciales de PostgreSQL y la API key de OpenAI se inyectan por variables de entorno (`.env`), nunca hardcodeadas (RNF-02).

## 3. Diagramas de secuencia — flujos principales

### 3.1 Secuencia: Carga y procesamiento de documento (CU-04 + CU-05)

```mermaid
sequenceDiagram
    actor Usuario
    participant FE as Frontend
    participant API as API (DocumentModule)
    participant PROC as ProcessingModule
    participant FS as Almacenamiento
    participant IA as OpenAI API
    participant DB as PostgreSQL

    Usuario->>FE: Selecciona archivo y repositorio
    FE->>API: POST /documentos (archivo, repositorio_id)
    API->>API: Validar formato (RN-01) y tamaño (RN-02)
    alt archivo inválido
        API-->>FE: 400 Error de validación
    else archivo válido
        API->>FS: Guardar archivo original
        API->>DB: Crear registro (estado = "Cargado")
        API-->>FE: 201 Documento creado
        API->>PROC: procesar_documento(documento_id) [async]
        PROC->>FS: Leer archivo
        PROC->>PROC: Extraer texto según formato (RF-09)
        PROC->>IA: Solicitar clasificación (RF-10)
        IA-->>PROC: Categoría
        PROC->>IA: Solicitar resumen (RF-11)
        IA-->>PROC: Resumen
        PROC->>IA: Solicitar extracción estructurada (RF-12)
        IA-->>PROC: Datos estructurados
        PROC->>IA: Generar embeddings por fragmento
        IA-->>PROC: Vectores
        PROC->>DB: Guardar resumen, categoría, datos, embeddings
        PROC->>DB: Actualizar estado = "Procesado"
        PROC->>DB: Registrar evento en bitácora (RF-17)
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
    participant IA as OpenAI API

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
