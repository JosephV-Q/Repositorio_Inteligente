# ANÁLISIS 03 — Historias de Usuario y Criterios de Aceptación
## Sistema Inteligente de Gestión y Análisis Documental (SIGAD)

*Cada historia referencia el/los RF que cubre (Análisis 02). Criterios de aceptación en formato Given/When/Then.*

---

### HU-01 — Inicio de sesión (RF-01, RF-02)
**Como** usuario registrado, **quiero** iniciar sesión con usuario y contraseña, **para** acceder a las funcionalidades correspondientes a mi rol.

- **Dado** que tengo credenciales válidas, **cuando** las ingreso, **entonces** el sistema me autentica y me redirige al dashboard.
- **Dado** que ingreso credenciales inválidas, **cuando** intento iniciar sesión, **entonces** el sistema muestra un mensaje de error sin revelar cuál dato es incorrecto.

### HU-02 — Crear repositorio (RF-03)
**Como** usuario autenticado, **quiero** crear un repositorio documental, **para** organizar mis documentos por proyecto o tema.

- **Dado** que estoy autenticado, **cuando** creo un repositorio con un nombre válido, **entonces** el sistema lo crea y lo muestra en mi lista de repositorios.
- **Dado** que intento crear un repositorio con nombre vacío, **cuando** confirmo, **entonces** el sistema rechaza la acción y muestra un mensaje de validación.

### HU-03 — Administrar repositorio (RF-04)
**Como** Administrador, **quiero** editar o eliminar un repositorio, **para** mantener organizada la estructura documental.

- **Dado** que soy Administrador, **cuando** elimino un repositorio, **entonces** el sistema solicita confirmación y, al aceptar, elimina el repositorio y sus documentos asociados.
- **Dado** que soy Usuario Gestor Documental, **cuando** intento eliminar un repositorio, **entonces** el sistema deniega la acción por permisos insuficientes.

### HU-04 — Cargar documento (RF-05)
**Como** usuario autenticado, **quiero** cargar un archivo PDF, DOCX o TXT a un repositorio, **para** que el sistema lo gestione y procese.

- **Dado** que selecciono un archivo válido (formato y tamaño permitidos), **cuando** lo cargo, **entonces** el sistema lo almacena con estado "Cargado" e inicia el procesamiento automáticamente.
- **Dado** que selecciono un archivo con formato no soportado, **cuando** intento cargarlo, **entonces** el sistema rechaza la carga y explica el motivo (RN-01).
- **Dado** que selecciono un archivo mayor a 20 MB, **cuando** intento cargarlo, **entonces** el sistema rechaza la carga (RN-02).

### HU-05 — Consultar y descargar documento (RF-06, RF-07)
**Como** usuario autenticado, **quiero** ver el listado de documentos de un repositorio y descargar el archivo original, **para** revisar su contenido completo cuando lo necesite.

- **Dado** que un repositorio tiene documentos, **cuando** lo abro, **entonces** veo el listado con nombre, estado, categoría y fecha de carga.
- **Dado** que selecciono "descargar" sobre un documento, **cuando** confirmo, **entonces** el sistema entrega el archivo original sin alteraciones.

### HU-06 — Eliminar documento (RF-08)
**Como** usuario autenticado, **quiero** eliminar un documento que ya no necesito, **para** mantener el repositorio ordenado.

- **Dado** que selecciono un documento, **cuando** confirmo su eliminación, **entonces** el sistema elimina el archivo, sus datos derivados (resumen, embeddings) y lo retira del listado.

### HU-07 — Procesamiento automático con IA (RF-09, RF-16)
**Como** usuario autenticado, **quiero** que cada documento cargado se procese automáticamente, **para** no tener que ejecutar pasos manuales de análisis.

- **Dado** que un documento está en estado "Cargado", **cuando** el sistema lo procesa, **entonces** extrae su contenido textual y cambia el estado a "Procesado".
- **Dado** que ocurre un error durante el procesamiento, **cuando** este falla, **entonces** el sistema marca el documento como "Error" y registra el detalle del fallo (RN-07).

### HU-08 — Clasificación automática (RF-10)
**Como** usuario autenticado, **quiero** que cada documento reciba una categoría automáticamente, **para** poder filtrar y organizar sin hacerlo manualmente.

- **Dado** que un documento fue procesado exitosamente, **cuando** finaliza el análisis, **entonces** el documento queda asociado a al menos una de las categorías definidas (RN-04).

### HU-09 — Resumen automático (RF-11)
**Como** usuario autenticado, **quiero** ver un resumen generado automáticamente de cada documento, **para** entender su contenido sin leerlo completo.

- **Dado** que un documento fue procesado, **cuando** abro su detalle, **entonces** veo un resumen generado por IA de máximo un párrafo.

### HU-10 — Extracción de información estructurada (RF-12)
**Como** usuario autenticado, **quiero** que el sistema extraiga datos clave según el tipo de documento, **para** obtener información puntual sin buscarla manualmente.

- **Dado** que un documento corresponde a uno de los tres tipos soportados (ver Diseño 06), **cuando** se procesa, **entonces** el sistema extrae y muestra los campos estructurados definidos para ese tipo.

### HU-11 — Búsqueda semántica (RF-13)
**Como** usuario autenticado, **quiero** buscar por significado dentro del contenido de los documentos, **para** encontrar información aunque no recuerde la palabra exacta usada en el texto.

- **Dado** que ingreso un término de búsqueda, **cuando** ejecuto la búsqueda, **entonces** el sistema devuelve los documentos más relevantes por similitud de contenido, no solo coincidencia literal.

### HU-12 — Consulta en lenguaje natural (RF-14)
**Como** usuario autenticado, **quiero** hacerle una pregunta en lenguaje natural al sistema sobre los documentos de un repositorio, **para** obtener una respuesta directa sin leer todos los archivos.

- **Dado** que un repositorio tiene documentos procesados, **cuando** formulo una pregunta, **entonces** el sistema responde basándose únicamente en el contenido indexado de ese repositorio (RN-08) e indica de qué documento(s) proviene la información.
- **Dado** que la pregunta no tiene relación con el contenido indexado, **cuando** el sistema no encuentra evidencia suficiente, **entonces** indica que no hay información disponible en lugar de inventar una respuesta.

### HU-13 — Dashboard de indicadores (RF-15)
**Como** usuario autenticado, **quiero** ver un dashboard con indicadores del repositorio, **para** tener una visión general del estado documental.

- **Dado** que accedo al dashboard, **cuando** se carga, **entonces** veo el total de documentos, la distribución por categoría y por estado (Cargado/Procesado/Error).

### HU-14 — Bitácora de eventos (RF-17)
**Como** Administrador, **quiero** ver el historial de eventos de un documento, **para** auditar qué ocurrió con él (carga, procesamiento, consultas, eliminación).

- **Dado** que abro el detalle de un documento, **cuando** reviso su bitácora, **entonces** veo la lista cronológica de eventos registrados.

---
*Cobertura: HU-01 a HU-14 cubren la totalidad de RF-01 a RF-17. Ver matriz completa en Análisis 05.*
