# Despliegue 06 — Proceso de instalación

## 1. Preparar servicios externos

1. Crear la base Neon y copiar su URL TLS.
2. Habilitar Google Drive API, configurar consentimiento OAuth2 y obtener refresh token.
3. Crear la carpeta destino y copiar su ID.
4. Crear una API key de Gemini y confirmar los modelos habilitados.
5. Crear los proyectos o sitios de Vercel para frontend y backend.

## 2. Instalar el backend

```bash
cd 03_Desarrollo/backend
pnpm install
pnpm build
```

Configurar las variables descritas en `5-Variables-Entorno-Configuracion-Segura.md`.

## 3. Inicializar datos

```bash
pnpm db:init
```

El proceso crea tablas e índices y sincroniza roles. Confirmar que no haya errores de permisos o extensión `vector`.

## 4. Instalar el frontend

```bash
cd 03_Desarrollo/frontend
pnpm install
pnpm build
```

Configurar la URL de la API según el mecanismo de configuración usado por la aplicación frontend. Verificar que el origen final coincida con `FRONTEND_ORIGIN`.

## 5. Aceptación de instalación

Ejecutar los healthchecks y las pruebas del backend. Abrir la SPA, iniciar sesión, verificar carga de un TXT sintético y confirmar el registro en Neon y el archivo en Drive.
