# Despliegue 07 — Proceso de despliegue

## 1. Preparación

1. Revisar cambios Markdown, código compilable y variables necesarias.
2. Ejecutar `pnpm build` en backend y frontend.
3. Ejecutar `pnpm test:api`, `pnpm test:gemini` y `pnpm test:upload` en un ambiente controlado.
4. Confirmar que no existan secretos en Git.

## 2. Backend en Vercel

1. Importar el repositorio en Vercel y seleccionar el directorio `03_Desarrollo/backend`.
2. Configurar las variables de entorno para Preview y Production.
3. Usar el build `pnpm run vercel-build`.
4. Verificar que `vercel.json` redirija `/api/*` a `api/index.ts`.
5. Desplegar y comprobar `https://<dominio>/api/health`.

## 3. Frontend

1. Crear un proyecto Vercel para `03_Desarrollo/frontend` o publicar el directorio `dist` en el proveedor elegido.
2. Configurar la URL pública de la API.
3. Ejecutar el build de Vite.
4. Registrar el dominio resultante en `FRONTEND_ORIGIN` del backend.
5. Probar login y subida desde el navegador.

## 4. Verificación posterior

- Healthcheck 200.
- Login y RBAC.
- Estado de Neon, Gemini y Drive.
- Subida directa con `OPTIONS`/`PUT` sin error CORS.
- Registro de metadatos en Neon.
- Logs sin secretos.

## 5. Rollback

Vercel permite volver a una implementación anterior. Si se modificó el esquema de Neon, aplicar una migración compatible antes de volver atrás. No borrar datos de Drive o Neon como parte de un rollback de aplicación sin aprobación explícita.
