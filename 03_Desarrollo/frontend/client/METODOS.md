# 📖 Guía de Métodos del Cliente (db_repo)

Esta guía explica en lenguaje claro y sencillo todos los métodos disponibles en el cliente para interactuar con la API del sistema. 

El cliente permite dos estilos de uso:
1. **Funcional directo:** Mediante la instancia global `api` (`api.metodo()`).
2. **Orientado a objetos (Active-Record):** Mediante clases modelo (`Categoria`, `Repositorio`, `Comparativa`).

---

## 1. 🔐 Autenticación y Sesión

Controla el acceso al sistema, inicio de sesión y validación de usuarios.

| Método | ¿Qué hace? (Explicación simple) |
| :--- | :--- |
| `api.login({ gmail, password })` | Inicia sesión con correo y contraseña. Si es correcto, guarda automáticamente el token JWT para las siguientes peticiones. |
| `api.register({ gmail, password, nombre, rol_id })` | Registra una nueva cuenta de usuario en el sistema. |
| `api.getCurrentUser()` | Pregunta al servidor quién es el usuario conectado actualmente con base en su token. |
| `api.getSession()` | Alias de `getCurrentUser()`. Obtiene los datos del usuario y rol de la sesión actual. |
| `api.validateSession()` | Comprueba de forma rápida si el token actual sigue siendo válido y no ha expirado. |
| `api.validateInvitation(token)` | Revisa si un enlace de invitación enviado por correo es válido antes de mostrar el formulario de registro. |
| `api.setToken(token)` | Asigna manualmente un token JWT en memoria y en `localStorage`. |
| `api.getToken()` | Retorna el token actual que se está utilizando. |
| `api.clearToken()` | Cierra la sesión localmente borrando el token guardado. |

---

## 2. 📄 Repositorios y Documentos

Permite gestionar los archivos guardados, subirlos directo a Google Drive y analizarlos con Inteligencia Artificial.

| Método | ¿Qué hace? (Explicación simple) |
| :--- | :--- |
| `api.getRepositorios(filtros?)` | Trae la lista de documentos guardados. Permite filtrar por categoría, nombre de archivo o paginar (`limit`, `offset`). |
| `api.getRepositorioById(id)` | Obtiene toda la información y metadatos de un documento específico por su ID. |
| `api.createRepositorio(datos)` | Guarda manualmente un registro de documento en la base de datos (con su nombre, enlace, categoría, etc.). |
| `api.subirArchivo(file, params?)` | **Flujo estrella:** Pide permiso a Google Drive, sube el archivo binario directamente (sin saturar nuestro servidor) y registra el documento en la base de datos en un solo paso. Soporta barra de progreso `onProgress`. |
| `api.procesarTextoDocumento({ texto, ... })` | **Procesamiento con IA:** Envías solo el texto bruto de un documento. Gemini AI lo lee, extrae automáticamente el nombre sugerido, resumen, categoría, palabras clave, genera un vector matemático (embedding de 768 dimensiones) y lo guarda todo en la base de datos. |
| `api.buscarRepositorios(texto O params)` | **Búsqueda Inteligente (Semántica / Vectorial):** Busca documentos por su significado o temática en lenguaje natural. Utiliza los vectores embeddings de 768 dimensiones y similitud de coseno en Neon DB (pgvector). Devuelve los documentos más parecidos ordenados por su porcentaje de similitud (`similarity`). |
| `api.updateRepositorio(id, datos)` | Edita los metadatos de un archivo (como su descripción, categoría o palabras clave). |
| `api.deleteRepositorio(id)` | Elimina el registro del archivo en la base de datos. |
| `api.getDriveConfigStatus()` | Comprueba si la conexión con Google Drive (OAuth2) está funcionando correctamente. |

---

## 3. 🏷️ Categorías

Permite organizar los documentos en carpetas o etiquetas lógicas con actualización automática.

| Método | ¿Qué hace? (Explicación simple) |
| :--- | :--- |
| `api.getCategorias(busqueda?)` | Devuelve una lista con los nombres de todas las categorías activas en el sistema. Puedes pasar un texto para buscar coincidencias. |
| `api.getCategoriaDetalle(nombre)` | Te dice cuántos repositorios y cuántas comparativas están usando esa categoría en este momento. |
| `api.createCategoria(nombre)` | Agrega una nueva categoría al catálogo del sistema (no permite nombres duplicados). |
| `api.updateCategoria(nombreActual, nuevoNombre, actualizarDocs?)` | Cambia el nombre de una categoría. Por defecto, actualiza en cascada todos los documentos y comparativas que tenían el nombre viejo para que no queden huérfanos. |
| `api.deleteCategoria(nombre, reasignarA?)` | Borra la categoría del catálogo. Opcionalmente puedes indicar a qué otra categoría mover los documentos existentes (ej. `'General'`). |

---

## 4. ⚖️ Comparativas

Permite comparar documentos, normativas o entidades y asociarles enlaces externos.

| Método | ¿Qué hace? (Explicación simple) |
| :--- | :--- |
| `api.getComparativas(filtros?)` | Lista todas las comparativas registradas con opción de filtrado. |
| `api.getComparativaById(id)` | Consulta los datos detallados de una comparativa específica. |
| `api.createComparativa(datos)` | Crea un nuevo registro de comparativa con su título, descripción, categoría y enlaces iniciales. |
| `api.updateComparativa(id, datos)` | Edita el título, descripción o contenido de una comparativa. |
| `api.buscarComparativas(texto O params)` | **Búsqueda Inteligente:** Busca comparativas por similitud semántica o coincidencias textuales. |
| `api.addUrlToComparativa(id, url)` | Añade un nuevo enlace web a la lista de referencias de la comparativa. |
| `api.removeUrlFromComparativa(id, url)` | Quita un enlace web específico de la comparativa. |
| `api.deleteComparativa(id)` | Borra la comparativa de la base de datos. |

---

## 5. 👥 Usuarios

Administra las cuentas de los usuarios del sistema.

| Método | ¿Qué hace? (Explicación simple) |
| :--- | :--- |
| `api.getUsuarios(filtros?)` | Lista los usuarios registrados en el sistema (requiere permisos de administrador). |
| `api.getUsuarioById(id)` | Obtiene los detalles y rol de un usuario en particular. |
| `api.getUsuarioByGmail(correo)` | Busca un usuario directamente por su dirección de correo electrónico. |
| `api.createUsuario(datos)` | Crea una nueva cuenta de usuario desde el panel de administración. |
| `api.updateUsuario(id, datos)` | Actualiza los datos generales de un usuario (nombre, correo, etc.). |
| `api.updateUsuarioRol(id, rolId)` | Cambia el nivel de acceso o rol asignado a un usuario (ej. de 'usuario' a 'editor'). |
| `api.deleteUsuario(id)` | Elimina a un usuario del sistema. |
| `api.checkDbStatus()` | Verifica el estado de la conexión a la base de datos de usuarios. |

---

## 6. 🛡️ Roles y Permisos (RBAC)

Define qué acciones tiene permitido realizar cada perfil de usuario.

| Método | ¿Qué hace? (Explicación simple) |
| :--- | :--- |
| `api.getRoles(filtros?)` | Lista todos los roles disponibles (ej. Administrador, Editor, Usuario). |
| `api.getRolById(id)` | Devuelve los detalles de un rol y la lista de rutas/permisos que tiene habilitadas. |
| `api.createRol(datos)` | Crea un nuevo tipo de rol en el sistema. |
| `api.updateRol(id, datos)` | Modifica el nombre o descripción de un rol existente. |
| `api.addPermisoToRol(id, permiso)` | Otorga una nueva ruta o permiso a un rol específico. |
| `api.deleteRol(id)` | Elimina un rol del sistema. |
| `api.syncRoles()` | Sincroniza y actualiza los roles y permisos del archivo de configuración con la base de datos Neon. |

---

## 7. ✉️ Invitaciones

Controla la incorporación de nuevos usuarios al sistema mediante invitaciones por correo.

| Método | ¿Qué hace? (Explicación simple) |
| :--- | :--- |
| `api.getInvitaciones(filtros?)` | Lista las invitaciones emitidas y su estado (pendiente, usada, etc.). |
| `api.getInvitacionById(id)` | Consulta el detalle de una invitación específica por su ID. |
| `api.getInvitacionByToken(token)` | Obtiene la información de una invitación a partir de su enlace/token seguro. |
| `api.createInvitacion({ correo, rol })` | Genera una invitación con un token único para que un usuario se registre con un rol específico. |
| `api.updateInvitacion(id, datos)` | Actualiza los datos de una invitación existente. |
| `api.updateInvitacionRol(id, rolId)` | Cambia el rol con el que se registrará el invitado. |
| `api.updateInvitacionCorreo(id, nuevoCorreo)` | Corrige o cambia el correo de destino de la invitación. |
| `api.deleteInvitacion(id)` | Cancela o revoca una invitación pendiente. |

---

## 8. ⚙️ Opciones de Configuración

Parámetros globales del sistema.

| Método | ¿Qué hace? (Explicación simple) |
| :--- | :--- |
| `api.getConfiguraciones(filtros?)` | Consulta los registros de configuración del sistema. |
| `api.getConfiguracionById(id)` | Consulta una configuración específica por ID. |
| `api.createConfiguracion(datos)` | Crea un nuevo bloque de configuraciones. |
| `api.updateConfiguracion(id, datos)` | Modifica las configuraciones globales. |
| `api.deleteConfiguracion(id)` | Borra un registro de configuración. |

---

## 9. 🤖 Inteligencia Artificial (Google Gemini)

Consultas inteligentes directas al modelo de lenguaje.

| Método | ¿Qué hace? (Explicación simple) |
| :--- | :--- |
| `api.askGemini({ prompt })` | Envía una pregunta o instrucción en lenguaje natural a Gemini y devuelve la respuesta generada. |
| `api.getGeminiStatus()` | Diagnostica si la clave de API de Gemini es válida y qué modelos están listos para responder. |

---

## 10. 🩺 Salud y Diagnóstico

Comprobaciones técnicas rápidas de conectividad.

| Método | ¿Qué hace? (Explicación simple) |
| :--- | :--- |
| `api.getHealth()` | Pregunta al servidor si está encendido, midiendo la conexión a la base de datos y memoria. |
| `api.getHello()` | Saludo básico para comprobar que el servicio web responde sin requerir login. |

---

## 11. 📦 Clases Modelo Orientadas a Objetos (`client/models`)

Si en lugar de llamar a `api.metodo()` prefieres trabajar con objetos que tienen sus propios métodos:

### Clase `Categoria`
- `Categoria.fetchAll(busqueda?)`: Descarga y devuelve una lista de objetos `Categoria`.
- `Categoria.fetchByName(nombre)`: Trae una categoría con el número de documentos que la usan.
- `Categoria.create(nombre)`: Crea la categoría y devuelve la nueva instancia.
- `categoria.rename(nuevoNombre, actualizarEnCascada?)`: Renombra la categoría actual y actualiza la BD.
- `categoria.delete(moverDocumentosA?)`: Borra la categoría actual y opcionalmente reasigna los archivos.
- `categoria.refresh()`: Vuelve a consultar la BD para refrescar las estadísticas de uso.

### Clase `Repositorio`
- `Repositorio.fetchAll(filtros?)`: Lista los documentos como instancias de `Repositorio`.
- `Repositorio.fetchById(id)`: Busca un documento por su identificador.
- `Repositorio.create(datos)`: Registra un nuevo documento.
- `Repositorio.subirArchivo(file, params?)`: Sube el archivo binario a Drive y lo registra.
- `Repositorio.procesarTexto({ texto, ... })`: Analiza el texto con IA, genera embeddings y retorna el objeto creado.
- `Repositorio.buscar('término', opciones?)`: **Búsqueda semántica:** Busca documentos conceptualmente parecidos y los devuelve con su puntuación `similarity` (0 a 1) y tipo de coincidencia.
- `repositorio.update(datos)`: Modifica las propiedades del documento y guarda los cambios en la BD.
- `repositorio.delete()`: Elimina este documento de la base de datos.
- `repositorio.refresh()`: Vuelve a cargar los datos más recientes desde el servidor.

### Clase `Comparativa`
- `Comparativa.fetchAll(filtros?)`: Trae la lista de comparativas en forma de objetos.
- `Comparativa.fetchById(id)`: Obtiene una comparativa por ID.
- `Comparativa.create(datos)`: Crea una nueva comparativa.
- `Comparativa.buscar('término', opciones?)`: Realiza búsqueda semántica o textual en comparativas.
- `comparativa.update(datos)`: Modifica sus campos (título, descripción, etc.).
- `comparativa.addUrl(url)`: Agrega una dirección web a sus enlaces de referencia.
- `comparativa.removeUrl(url)`: Quita un enlace web de la lista.
- `comparativa.delete()`: Elimina la comparativa de la base de datos.
