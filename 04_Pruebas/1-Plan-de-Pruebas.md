# Pruebas 01 — Plan de pruebas

## 1. Objetivo

Comprobar que SIGAD cumple los requisitos funcionales y no funcionales implementados, con énfasis en autenticación, RBAC, persistencia en Neon, subida directa a Google Drive e integración con Gemini.

## 2. Alcance

Incluye pruebas unitarias dirigidas a módulos, pruebas de integración HTTP, pruebas de servicios externos y una prueba extremo a extremo de subida. No incluye pruebas de OCR, alta disponibilidad empresarial ni carga masiva.

## 3. Ambientes

| Ambiente | Uso | Dependencias |
|---|---|---|
| Local | Desarrollo y diagnóstico | Node.js, `.env`, Neon, Gemini, Drive |
| Vercel | Validación de función serverless | Variables del proyecto, Neon, Gemini, Drive |
| Navegador | Validación del flujo de usuario | Frontend Vite/build y origen permitido |

## 4. Datos de prueba

Usar documentos sintéticos o anonimizados en PDF, DOCX y TXT. Incluir un archivo inválido, uno mayor a 20 MB si la interfaz lo permite, texto vacío y documentos con contenido suficiente para clasificación, resumen y embedding.

## 5. Casos principales

| ID | Caso | Resultado esperado |
|---|---|---|
| PT-01 | `GET /api/health` | Responde 200 y estado online. |
| PT-02 | Login válido e inválido | El válido devuelve sesión; el inválido devuelve error sin revelar cuál credencial falló. |
| PT-03 | RBAC por rol | Ruta permitida responde; ruta no autorizada devuelve 403. |
| PT-04 | Inicialización Neon | Se crean tablas, extensión vector, índices HNSW, roles y administrador. |
| PT-05 | Gemini status | Reporta API configurada y modelo por defecto. |
| PT-06 | Consulta Gemini | Devuelve respuesta y modelo usado. |
| PT-07 | Fallback de modelo | Un modelo obsoleto conocido se remapea sin error 502. |
| PT-08 | Embedding | Se genera vector de 768 dimensiones. |
| PT-09 | Drive status | Reporta credenciales y método configurados sin exponer secretos. |
| PT-10 | Subida E2E | URL resumible, PUT directo, registro Neon y consulta posterior funcionan. |
| PT-11 | Metadatos y categorías | Crear, consultar, actualizar y filtrar conserva los campos esperados. |
| PT-12 | Comparativa | Crear y consultar comparativa/URLs responde según el contrato implementado. |
| PT-13 | Frontend | La SPA inicia, carga documentos permitidos y muestra errores de API. |
| PT-14 | Resiliencia | Un error de IA se informa y no impide health, autenticación o consulta de estado. |

## 6. Criterios de entrada y salida

**Entrada:** dependencias instaladas, `.env` completo, base accesible y datos de prueba disponibles.  
**Salida:** todos los casos críticos PT-01 a PT-10 aprobados, sin secretos expuestos, y defectos documentados con severidad y evidencia.

## 7. Ejecución y evidencia

```bash
cd 03_Desarrollo/backend
pnpm test:api
pnpm test:gemini
pnpm test:upload
```

Registrar fecha, commit, ambiente, resultado, latencia relevante, identificadores de prueba y evidencia de respuesta. Nunca guardar tokens, claves o contraseñas en la evidencia.

## 8. Riesgos y límites

Las pruebas que llaman a Gemini o Drive consumen cuota y dependen de red. La prueba E2E puede crear un archivo real; revisar la limpieza. Un resultado verde demuestra integración con el entorno configurado, no disponibilidad permanente de los proveedores.
