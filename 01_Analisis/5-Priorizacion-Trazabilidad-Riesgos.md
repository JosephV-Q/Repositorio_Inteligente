# ANÁLISIS 05 — Priorización, Matriz de Trazabilidad Inicial y Análisis de Riesgos
## Sistema Inteligente de Gestión y Análisis Documental (SIGAD)

---

## 1. Priorización de requisitos (MoSCoW)

| Prioridad | RF incluidos | Justificación |
|---|---|---|
| **Must (obligatorio)** | RF-01, RF-02, RF-03, RF-05, RF-06, RF-09, RF-10, RF-11, RF-12, RF-13, RF-14, RF-16 | Son el mínimo funcional exigido por el enunciado del proyecto (autenticación, gestión documental básica y el flujo real de IA: extracción → clasificación → resumen → extracción estructurada → búsqueda → consulta natural). Sin ellos el proyecto no cumple el objetivo central. |
| **Should (importante)** | RF-04, RF-07, RF-08, RF-15, RF-17 | Mejoran la administración y la experiencia (eliminar/editar repositorios, descargar, dashboard, bitácora), pero el sistema puede demostrarse sin ellos en una primera iteración. |
| **Could (deseable)** | — | No se identifican funcionalidades "deseables" adicionales fuera del alcance definido, para evitar agregar funcionalidades solo por completitud (regla de trabajo del proyecto). |
| **Won't (fuera de esta versión)** | Funcionalidades listadas como exclusiones en Análisis 01 (versionado de documentos, multi-idioma, integración externa, etc.) | Explícitamente fuera del alcance mínimo del proyecto integrador. |

## 2. Matriz de trazabilidad inicial (RF → HU → CU)

| RF | Historia de Usuario | Caso de Uso |
|---|---|---|
| RF-01 | HU-01 | CU-01 |
| RF-02 | HU-01 | CU-01, CU-10 |
| RF-03 | HU-02 | CU-03 |
| RF-04 | HU-03 | CU-02 |
| RF-05 | HU-04 | CU-04 |
| RF-06 | HU-05 | CU-06 |
| RF-07 | HU-05 | CU-06 |
| RF-08 | HU-06 | CU-07 |
| RF-09 | HU-07 | CU-05 |
| RF-10 | HU-08 | CU-05 |
| RF-11 | HU-09 | CU-05 |
| RF-12 | HU-10 | CU-05 |
| RF-13 | HU-11 | CU-08 |
| RF-14 | HU-12 | CU-09 |
| RF-15 | HU-13 | CU-11 |
| RF-16 | HU-07 | CU-05 |
| RF-17 | HU-14 | CU-06 |

**Verificación de cobertura:** los 17 RF tienen al menos una HU y un CU asociados; los 14 HU y los 11 CU cubren la totalidad de los RF. No existe RF sin representación en Análisis 03 ni en Análisis 04.

> Esta matriz se extiende en Diseño con las columnas Arquitectura / Componente / Endpoint API, para completar la cadena RF → HU → CU → Arquitectura → Componente → API/Datos exigida en la verificación final del proyecto.

## 3. Análisis de riesgos del proyecto

| ID | Riesgo | Categoría | Probabilidad | Impacto | Estrategia de mitigación |
|---|---|---|---|---|---|
| R-01 | Límites de uso o costo del servicio de IA externo (rate limits, cuota agotada) | Técnico | Media | Alto | Usar Google Gemini mediante `@google/genai`, centralizar los modelos en variables de entorno, validar el estado del servicio y mostrar errores claros; documentar el consumo estimado en Implementación. |
| R-02 | Baja calidad de extracción de texto en PDFs escaneados o mal formateados | Técnico | Media | Medio | Delimitar el alcance a documentos con texto extraíble; documentar OCR como mejora futura si el tiempo lo permite (ver Diseño 06). |
| R-03 | Curva de aprendizaje del equipo con conceptos de RAG/embeddings/bases vectoriales | Recursos/Equipo | Alta | Medio | Seleccionar una arquitectura simple (pgvector sobre PostgreSQL, sin infraestructura adicional) y documentar el flujo IA con claridad (Diseño 06) antes de programar. |
| R-04 | Ampliación de alcance no planificada ("scope creep") por agregar funciones no exigidas | Alcance | Media | Medio | Ceñirse estrictamente al alcance de Análisis 01; toda funcionalidad adicional debe justificarse contra un RF existente. |
| R-05 | Documentos de prueba con datos personales reales sin autorización | Datos/Legal | Baja | Alto | Usar únicamente documentos de prueba sintéticos o anonimizados para el repositorio de 30 documentos exigido. |
| R-06 | Exposición accidental de credenciales/API keys en el repositorio Git | Seguridad | Media | Alto | Uso obligatorio de variables de entorno y archivo `.env` excluido por `.gitignore` (ver RNF-02 y Diseño 07). |
| R-07 | Cronograma académico ajustado frente a la extensión del proyecto (5 fases completas) | Cronograma | Alta | Medio | Priorización MoSCoW aplicada (sección 1) para asegurar el "Must" antes que cualquier mejora. |
| R-08 | Inconsistencia entre los distintos documentos (Análisis, Diseño) al ser producidos por integrantes distintos | Calidad documental | Media | Medio | Mantener numeración y terminología estables (este documento y Análisis 02–04 como fuente única de nombres/IDs); revisión de consistencia final (ver checklist del proyecto). |

---
*Con este documento se cierra la fase de Análisis. La fase de Diseño (documentos 06 a 12) debe partir únicamente de los RF, RN y CU aquí definidos, sin introducir nuevos requisitos.*
