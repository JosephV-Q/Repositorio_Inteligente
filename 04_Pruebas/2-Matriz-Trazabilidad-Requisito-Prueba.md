# Pruebas 02 — Matriz de trazabilidad requisito-prueba

La matriz relaciona los requisitos de Análisis 02 con casos de prueba del plan. Los requisitos conceptuales que no tienen endpoint o persistencia completa deben quedar como **pendientes de verificación**, no como aprobados por inferencia.

| Requisito | Descripción resumida | Pruebas | Evidencia esperada | Estado documental |
|---|---|---|---|---|
| RF-01 | Autenticación | PT-02 | Login y sesión válida | Implementado |
| RF-02 | Restricción por rol | PT-03 | 401/403 y permisos por `roles.json` | Implementado |
| RF-03 | Crear repositorio | PT-11 | Registro en `repositorios` | Implementado parcial |
| RF-04 | Editar/eliminar repositorio | PT-11 | Respuestas de actualización/eliminación | Verificar en ambiente |
| RF-05 | Cargar PDF/DOCX/TXT | PT-10, PT-13 | Drive ID, MIME y metadatos | Implementado |
| RF-06 | Consultar/listar archivos | PT-11, PT-13 | Listado y detalle | Implementado |
| RF-07 | Descargar original | PT-10 | Enlace/metadato de Drive | Verificar en ambiente |
| RF-08 | Eliminar archivo | PT-10, PT-11 | Registro eliminado y limpieza | Implementado parcial |
| RF-09 | Extraer texto | PT-13 | Texto extraído por frontend | Implementado en cliente |
| RF-10 | Clasificar documento | PT-06, PT-13 | Categoría en análisis/metadatos | Implementado parcial |
| RF-11 | Generar resumen | PT-06, PT-13 | Resumen devuelto/persistido | Implementado parcial |
| RF-12 | Extracción estructurada | PT-06, PT-13 | Campos por tipo documental | Pendiente de evidencia específica |
| RF-13 | Búsqueda semántica | PT-08, PT-11 | Vector 768 y resultados relevantes | Verificar en ambiente |
| RF-14 | Consulta natural | PT-06, PT-13 | Respuesta con contexto documental | Verificar en ambiente |
| RF-15 | Dashboard | PT-13 | Indicadores por estado/categoría | Verificar en ambiente |
| RF-16 | Estado y errores | PT-14 | Error visible y servicio restante operativo | Parcial |
| RF-17 | Bitácora | PT-11, PT-14 | Eventos consultables | Pendiente de evidencia específica |
| RNF-01 | Procesamiento <= 60 s | PT-06, PT-13 | Tiempo medido por documento | Medir |
| RNF-02 | Seguridad | PT-02, PT-03, PT-09 | Token firmado, RBAC y secretos fuera del repo | Implementado |
| RNF-03 | Usabilidad | PT-13 | Flujo principal en máximo 3 clics | Medir con usuario |
| RNF-04 | Disponibilidad | PT-01, PT-14 | Health durante demostración | Implementado |
| RNF-05 | Mantenibilidad | PT-13, revisión | Estructura modular y build limpio | Implementado |
| RNF-06 | Portabilidad | PT-04, PT-09, despliegue | Reproducir con variables | Implementado |
| RNF-07 | Compatibilidad documental | PT-10, PT-13 | PDF, DOCX y TXT sin corrupción | Verificar |
| RNF-08 | Límite de tamaño | PT-13 | Archivo sobre límite rechazado | Verificar |
| RNF-09 | Resiliencia | PT-14 | Error IA aislado | Verificar |

## Criterio de cierre

La columna “Estado documental” no reemplaza la evidencia de ejecución. Para liberar una versión, cada requisito Must debe tener al menos un caso aprobado y los estados “parcial”, “verificar” o “pendiente” deben resolverse o aceptarse explícitamente.
