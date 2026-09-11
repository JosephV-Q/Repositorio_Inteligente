# Despliegue 08 — Manual de usuario

## 1. Iniciar sesión

1. Abrir la URL del frontend.
2. Introducir correo y contraseña.
3. Pulsar **Iniciar sesión**.
4. El sistema habilita las opciones correspondientes al rol: `admin`, `editor`, `usuario` o `invitado`.

Si la sesión falla, revisar credenciales o solicitar una nueva invitación al administrador.

## 2. Registrar un usuario por invitación

El administrador crea una invitación con correo y rol. La persona abre el enlace, confirma que la invitación sea válida, completa nombre y contraseña y envía el registro. La invitación se consume una sola vez.

## 3. Cargar un documento

1. Abrir la sección de repositorios.
2. Seleccionar el repositorio destino.
3. Elegir un PDF, DOCX o TXT permitido.
4. Confirmar los metadatos: nombre, categoría, descripción, resumen, palabras clave y contexto cuando correspondan.
5. Esperar la subida directa a Google Drive y la confirmación del registro.

El archivo no se envía al servidor de la API; el navegador lo carga directamente en Drive.

## 4. Consultar y gestionar documentos

Usar el listado para filtrar por categoría, nombre o palabras clave. Abrir un registro para consultar sus metadatos y estado. Para descargar o visualizar el original, usar el enlace de Drive disponible. Eliminar solo después de confirmar que ya no se necesita el registro.

## 5. Análisis con IA

Enviar el texto extraído al análisis para obtener descripción, resumen, categoría, palabras clave y contexto. La respuesta depende de Gemini y puede tardar o fallar por cuota o red. No introducir información sensible innecesaria.

## 6. Comparativas

En la sección Comparativas registrar un título, URLs y contexto. Revisar la respuesta generada y tratarla como apoyo documental, no como sustituto de revisión humana.

## 7. Mensajes comunes

- **401:** iniciar sesión nuevamente.
- **403:** el rol no tiene permiso.
- **CORS al subir:** informar al administrador; suele indicar origen incorrecto en `FRONTEND_ORIGIN`.
- **IA no disponible:** esperar y reintentar; la base y las funciones no dependientes de IA pueden seguir disponibles.
- **Archivo no aceptado:** usar PDF, DOCX o TXT dentro del límite configurado.
