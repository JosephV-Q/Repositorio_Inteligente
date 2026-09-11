# ANÁLISIS 02 — Requisitos Funcionales, No Funcionales y Reglas de Negocio
## Sistema Inteligente de Gestión y Análisis Documental (SIGAD)

*Base: Análisis 01 — Problema, Objetivos y Alcance. Cada requisito aquí definido se traza en Análisis 05 y, en Diseño, contra arquitectura, datos y API.*

---

## 1. Requisitos funcionales (RF)

Numeración estable — usada en Historias de Usuario, Casos de Uso, Trazabilidad y Diseño.

| ID | Requisito | Módulo |
|---|---|---|
| RF-01 | El sistema debe permitir a un usuario autenticarse mediante usuario y contraseña. | Autenticación |
| RF-02 | El sistema debe restringir funcionalidades según el rol del usuario (Administrador / Usuario Gestor Documental). | Autenticación |
| RF-03 | El sistema debe permitir crear repositorios (carpetas) documentales. | Repositorios |
| RF-04 | El sistema debe permitir editar y eliminar repositorios (solo rol Administrador). | Repositorios |
| RF-05 | El sistema debe permitir cargar archivos en formato PDF, DOCX o TXT dentro de un repositorio. | Documentos |
| RF-06 | El sistema debe permitir consultar/listar los archivos de un repositorio. | Documentos |
| RF-07 | El sistema debe permitir descargar un archivo original. | Documentos |
| RF-08 | El sistema debe permitir eliminar un archivo. | Documentos |
| RF-09 | El sistema debe extraer automáticamente el contenido textual de cada documento cargado. | Procesamiento IA |
| RF-10 | El sistema debe clasificar automáticamente cada documento en al menos una de un mínimo de tres categorías. | Procesamiento IA |
| RF-11 | El sistema debe generar automáticamente un resumen por documento. | Procesamiento IA |
| RF-12 | El sistema debe extraer información relevante estructurada para al menos tres tipos de documento distintos. | Procesamiento IA |
| RF-13 | El sistema debe permitir buscar dentro del contenido documental (búsqueda semántica, no solo por nombre de archivo). | Búsqueda |
| RF-14 | El sistema debe permitir realizar consultas en lenguaje natural sobre los documentos de un repositorio y recibir una respuesta basada en su contenido. | Búsqueda / IA |
| RF-15 | El sistema debe mostrar un dashboard con indicadores del repositorio (总 documentos, por categoría, por estado, etc.). | Dashboard |
| RF-16 | El sistema debe registrar errores y el estado de procesamiento de cada documento. | Auditoría |

> Nota de alcance: RF-12 exige mínimo 3 tipos de documento con extracción estructurada; en Diseño 06 se define exactamente cuáles tres tipos se soportan y qué campos se extraen de cada uno, para evitar ambigüedad en Desarrollo.

## 2. Requisitos no funcionales (RNF)

| ID | Categoría | Requisito |
|---|---|---|
| RNF-01 | Rendimiento | El procesamiento IA completo (extracción + clasificación + resumen) de un documento de hasta 10 páginas no debe superar 60 segundos. |
| RNF-02 | Seguridad | La autenticación debe usar tokens de sesión firmados HMAC-SHA256; las contraseñas deben almacenarse mediante hash HMAC-SHA256 con secreto externo; las credenciales de IA, base de datos y almacenamiento deben residir en variables de entorno, nunca en el repositorio de código. |
| RNF-03 | Usabilidad | Las funciones principales (cargar documento, buscar, consultar en lenguaje natural) deben ser alcanzables en máximo 3 clics desde el dashboard. |
| RNF-04 | Disponibilidad | El sistema debe permanecer operativo durante las sesiones de demostración y sustentación; no se exige alta disponibilidad de nivel empresarial. |
| RNF-05 | Mantenibilidad | El código debe organizarse por capas/módulos independientes y documentarse (ver Desarrollo). |
| RNF-06 | Portabilidad | El despliegue debe ser reproducible mediante variables de entorno y scripts de configuración (ver Implementación). |
| RNF-07 | Compatibilidad | El sistema debe procesar correctamente archivos PDF, DOCX y TXT sin corrupción de contenido. |
| RNF-08 | Capacidad | El sistema debe rechazar archivos que superen el tamaño máximo permitido (ver RN-02). |
| RNF-09 | Resiliencia | Un fallo de procesamiento en un documento no debe afectar la disponibilidad del resto del sistema (ver RN-07). |

## 3. Reglas de negocio (RN)

| ID | Regla |
|---|---|
| RN-01 | los principales archivos aceptados son formato PDF, DOCX o TXT. |
| RN-02 | El tamaño máximo permitido por archivo es 20 MB. |
| RN-03 | Todo documento debe pertenecer obligatoriamente a un repositorio; no pueden existir documentos huérfanos. |
| RN-04 | Todo documento procesado exitosamente debe quedar asociado a al menos una categoría. |
| RN-05 | Solo usuarios autenticados pueden crear, consultar, cargar o eliminar información en el sistema. |
| RN-06 | Solo el rol Administrador puede eliminar repositorios y gestionar usuarios (crear/desactivar cuentas). |
| RN-07 | Un documento cuyo procesamiento IA falle debe quedar marcado con estado "Error" y visible como tal; el resto del sistema debe continuar operando con normalidad. |
| RN-08 | Las respuestas generadas ante consultas en lenguaje natural deben fundamentarse únicamente en el contenido indexado del repositorio consultado (no en conocimiento general del modelo de IA), para evitar respuestas no verificables. |

## 4. Estados de un documento (referenciado por RF-16, RF-17 y RN-07)

```
Cargado → En procesamiento → Procesado
                            → Error
```

Este ciclo de estados es la base del Diagrama de Actividad y del Diagrama de Secuencia de carga/procesamiento (Diseño 02) y del modelo de datos (Diseño 03).

---
*Todo requisito de esta lista debe verse reflejado, sin excepción, en al menos una Historia de Usuario (Análisis 03) y un Caso de Uso (Análisis 04). Ver verificación cruzada en Análisis 05.*
