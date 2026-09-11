# DISEÑO 06 — Diseño de la Integración con IA y Flujo de Procesamiento Documental
## Sistema Inteligente de Gestión y Análisis Documental (SIGAD)

*Este documento responde directamente al requisito central del proyecto: demostrar el flujo real archivo → extracción → procesamiento IA → análisis → almacenamiento → búsqueda/consulta → respuesta (no un CRUD con un botón "IA"). La implementación vigente usa Google Gemini; el código actual recibe texto y metadatos para el análisis, y genera embeddings de 768 dimensiones en Neon.*

## 1. Técnica seleccionada: RAG (Retrieval-Augmented Generation)

**Alternativas evaluadas:**

| Alternativa | Descripción | Decisión |
|---|---|---|
| Fine-tuning de un modelo propio | Reentrenar un modelo con los documentos de la empresa | Descartada: alto costo, tiempo y datos de entrenamiento fuera del alcance académico. |
| Búsqueda por palabras clave (full-text search clásico) | Índices invertidos tipo `tsvector` | Descartada como único mecanismo: no resuelve búsqueda semántica ni preguntas en lenguaje natural (RF-13, RF-14 lo exigen explícitamente). |
| **RAG con embeddings + base vectorial** | Recuperar fragmentos relevantes por similitud semántica y usarlos como contexto para que un LLM genere la respuesta | **Seleccionada.** Es el estándar actual para "preguntar sobre documentos propios" sin reentrenar modelos, y permite trazabilidad (la respuesta cita su fuente), cumpliendo RN-08. |

## 2. Componentes técnicos del flujo IA

| Etapa | Técnica/herramienta | Justificación |
|---|---|---|
| Extracción de texto | Extractores del frontend (`pdfjs-dist`, `mammoth`) y texto directo para TXT | El cliente prepara el contenido y el backend recibe el texto para su análisis. |
| División en fragmentos (chunking) | Fragmentos de ~500–800 tokens con solapamiento de ~100 tokens | Balance entre contexto suficiente para el LLM y precisión de la búsqueda semántica. |
| Embeddings | `gemini-embedding-001` mediante `@google/genai`, salida de 768 dimensiones | Coincide con `vector(768)` e índice HNSW de Neon. |
| Almacenamiento vectorial | `pgvector` sobre PostgreSQL (tabla `fragmento`, Diseño 03) | Un solo motor de datos (ver Diseño 07). |
| Clasificación | `gemini-3.6-flash` (o modelo configurado) con categorías disponibles | El backend centraliza la selección y remapea modelos obsoletos conocidos. |
| Resumen | Prompt de resumen a Gemini sobre el texto recibido | Se conserva la salida en los metadatos del repositorio. |
| Extracción estructurada | Prompt de análisis a Gemini con salida JSON esperada (`nom_arch`, `categoria`, `descripcion`, `resumen`, `palabras_clave`, `contexto`) | Mantiene metadatos estructurados en el registro de `repositorios`; la validación final depende del controlador y del módulo de persistencia. |
| Generación de respuesta | Gemini mediante `/api/gemini`, con contexto documental enviado por el cliente o servicio | El contexto debe limitarse al repositorio consultado para cumplir RN-08. |

## 3. Tres tipos de documento con extracción estructurada (cumplimiento de RF-12)

Para evitar ambigüedad en Desarrollo, se fijan los tres tipos mínimos y sus campos:

| Tipo de documento | Campos extraídos |
|---|---|
| Contrato | partes involucradas, fecha de inicio, plazo/vigencia, objeto del contrato |
| Factura | número de factura, fecha de emisión, valor total, emisor/receptor |
| Informe / reporte | título, autor(es) (si consta), fecha, tema principal, conclusiones clave |

Estas tres categorías coinciden con las tres categorías mínimas de clasificación exigidas (RF-10), evitando inconsistencia entre "categoría" y "tipo de documento".

## 4. Flujo completo (trazabilidad archivo → respuesta)

```mermaid
flowchart LR
    A[Archivo cargado] --> B[Extracción de texto]
    B --> C[División en fragmentos]
    C --> D[Generación de embeddings]
    D --> E[(Almacenamiento vectorial - pgvector)]
    B --> F[Clasificación IA]
    B --> G[Resumen IA]
    B --> H[Extracción estructurada IA]
    F --> I[(Base de datos relacional)]
    G --> I
    H --> I
    E --> J[Búsqueda semántica]
    J --> K[Recuperación de fragmentos relevantes]
    K --> L[Generación de respuesta con LLM - contexto acotado]
    L --> M[Respuesta al usuario con referencia a documento fuente]
```

Este diagrama es la referencia obligatoria para verificar, en la sustentación, que el flujo real de IA está implementado y no simulado.

## 5. Limitaciones reconocidas y su tratamiento

- **PDFs escaneados (sin texto extraíble):** fuera del alcance mínimo garantizado; se documenta como mejora futura mediante OCR (`pytesseract`) si el cronograma lo permite (ver R-02 en Análisis 05). El sistema debe detectar este caso y marcar el documento como "Error" con detalle explicativo, no fallar silenciosamente.
- **Costo/límite de la API de IA:** mitigado seleccionando modelos económicos y documentando manejo de reintentos (Diseño 07, sección de resiliencia).
- **Alucinación del modelo:** mitigada por RN-08 (respuesta restringida al contexto recuperado) y por mostrar siempre la(s) fuente(s) documental(es).

---
*Este documento es insumo directo para el Manual Técnico de la fase Desarrollo (implementación del `ProcessingModule` y `SearchModule`).*
