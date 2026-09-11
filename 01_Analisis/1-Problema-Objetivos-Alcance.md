# ANÁLISIS 01 — Descripción del Problema, Objetivos y Alcance
## Sistema Inteligente de Gestión y Análisis Documental (SIGAD)
Proyecto Integrador — Desarrollo de Aplicaciones Empresariales — UTS

---

## 1. Contexto empresarial

Una organización cuenta con un repositorio de archivos (carpetas compartidas, unidades de red, etc.) que almacena documentos de forma pasiva: solo se guardan y se buscan manualmente por nombre de archivo. No existe ninguna capacidad de comprender, clasificar ni consultar el contenido de esos documentos. A medida que el volumen crece, encontrar información específica dentro del contenido (no solo del nombre del archivo) se vuelve costoso en tiempo y propenso a error humano.

## 2. Identificación de la necesidad y oportunidad de negocio

**Necesidad:** convertir un repositorio de almacenamiento pasivo en un repositorio inteligente que permita encontrar, comprender y consultar información contenida *dentro* de los documentos, no solo sus metadatos (nombre, fecha, tipo).

**Oportunidad:** aplicar procesamiento de lenguaje natural (NLP) e Inteligencia Artificial generativa para automatizar tareas hoy manuales: clasificar documentos, resumirlos, extraer datos relevantes y responder preguntas sobre su contenido en lenguaje natural.

## 3. Objetivo general

Diseñar, desarrollar, probar, documentar e implementar una aplicación web que gestione un repositorio documental y aplique Inteligencia Artificial para convertir información documental no estructurada en información útil y consultable para la empresa.

## 4. Objetivos específicos

1. Implementar un módulo de autenticación y control de acceso por rol (Administrador / Usuario gestor documental).
2. Implementar la gestión completa de repositorios y archivos (crear, cargar, consultar, descargar, eliminar).
3. Implementar un flujo real de procesamiento con IA: extracción de contenido → análisis (clasificación, resumen, extracción de información) → almacenamiento de resultados.
4. Implementar búsqueda semántica y consulta en lenguaje natural sobre el contenido documental (enfoque RAG).
5. Implementar un dashboard con indicadores del repositorio.
6. Registrar errores y estados de procesamiento para garantizar trazabilidad operativa.

## 5. Alcance

### 5.1 Incluido en el alcance (mínimo funcional exigido)

- Autenticación y control básico de usuarios por rol.
- Creación y administración de repositorios/carpetas.
- Carga, consulta, descarga y eliminación de archivos.
- Soporte para PDF, DOCX y TXT.
- Procesamiento automático de documentos mediante IA (extracción de contenido).
- Clasificación automática en mínimo tres categorías.
- Generación de resumen por documento.
- Extracción de información relevante de mínimo tres tipos de documento.
- Búsqueda dentro del contenido documental (búsqueda semántica).
- Consulta mediante lenguaje natural sobre los documentos (chat con contexto documental — RAG).
- Dashboard con indicadores del repositorio.
- Registro de errores y estados de procesamiento.

### 5.2 Exclusiones explícitas (fuera de alcance)

- Soporte para formatos distintos a PDF, DOCX y TXT (ej. hojas de cálculo, imágenes sueltas, correo electrónico).
- Edición del contenido de los documentos dentro de la plataforma (el sistema es de gestión y análisis, no un editor de documentos).
- Alta disponibilidad empresarial, balanceo de carga o infraestructura multi-región (se documenta el diseño pensando en ello, pero no se implementa en el ambiente académico).
- Integración con sistemas externos de la empresa (ERP, CRM, correo corporativo).
- Control de versiones de documentos (histórico de versiones de un mismo archivo).
- Firma electrónica o validación legal de documentos.
- Internacionalización (multi-idioma de interfaz); el sistema se documenta y opera en español.


## 6. Actores y usuarios del sistema

| Actor | Tipo | Descripción |
|---|---|---|
| Administrador | Humano (rol interno) | Gestiona el repositorio, usuarios y tiene acceso completo al sistema, incluida la eliminación de repositorios. |
| Usuario Gestor Documental | Humano (rol interno) | Carga, consulta, descarga documentos; realiza búsquedas y consultas en lenguaje natural sobre los repositorios a los que tiene acceso. |
|Lector Documental | Humano (rol interno) |  solo tiene la capacidad de leer los documentos| 
| Servicio de IA | Sistema externo (actor secundario) | Proveedor de modelos de lenguaje y embeddings (ver Diseño 06 y 07) que procesa el contenido documental bajo solicitud del backend. |

## 7. Perfiles de usuario (personas)

**Administrador — "Camila, líder documental"**
Responsable de organizar la información de su área. Necesita crear las categorias por proyecto/tema, controlar quién accede y confiar en que el contenido cargado se procesa correctamente.

**Usuario Gestor Documental — "Andrés, analista"**
Consume información de los documentos en su día a día. Necesita encontrar rápidamente un dato dentro de un documento sin tener que abrir y leer archivo por archivo, y prefiere preguntar en lenguaje natural antes que buscar por palabra clave exacta.

**Usuario Lector - "Jhon Lopez"**
Solo es encargado de leer la información que es compartida en el repositorio. Puede buscar los documentos, chatear con la IA y visualizar los documentos del repositorio, esos son sus unicos permisos. 

---
*Este documento es la base de los Requisitos Funcionales y No Funcionales (Análisis 02), las Historias de Usuario (Análisis 03) y los Casos de Uso (Análisis 04). Ningún requisito posterior debe contradecir el alcance aquí definido.*
