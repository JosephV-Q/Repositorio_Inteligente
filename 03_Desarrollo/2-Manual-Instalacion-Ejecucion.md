# Desarrollo 02 — Manual de instalación y ejecución

## 1. Prerrequisitos

- Node.js compatible con las versiones declaradas en los `package.json`.
- npm o pnpm.
- Una base Neon PostgreSQL con permisos para crear tablas y la extensión `vector`.
- Una clave de Google Gemini.
- Una cuenta de Google Drive configurada con OAuth2 y refresh token para el entorno verificado.
- Git y un navegador actualizado.

## 2. Instalación

Desde `03_Desarrollo/backend`:

```bash
pnpm install
pnpm build
```

Desde `03_Desarrollo/frontend`:

```bash
pnpm install
pnpm build
```

Si el equipo usa npm, los comandos equivalentes son `npm install`, `npm run build` y `npm run dev`.

## 3. Configuración local

Crear `03_Desarrollo/backend/.env` a partir de `.env.example` y completar, como mínimo:

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://...
GEMINI_API_KEY=...
HASH_SECRET=secreto-largo-local
ADMIN_NAME=Administrador
ADMIN_EMAIL=admin@admin.com
ADMIN_PASSWORD=...
ADMIN_ROLE=1
GOOGLE_DRIVE_CLIENT_ID=...
GOOGLE_DRIVE_CLIENT_SECRET=...
GOOGLE_DRIVE_REFRESH_TOKEN=...
GOOGLE_DRIVE_FOLDER_ID=...
FRONTEND_ORIGIN=http://localhost:5173
```

Nunca copiar valores reales en documentación ni en Git.

## 4. Ejecución

Terminal 1, backend:

```bash
cd 03_Desarrollo/backend
pnpm dev
```

La API queda disponible en `http://localhost:3000`. La inicialización crea las tablas, sincroniza roles y asegura el usuario administrador.

Terminal 2, frontend:

```bash
cd 03_Desarrollo/frontend
pnpm dev
```

Vite mostrará la URL local, normalmente `http://localhost:5173`.

## 5. Comprobaciones rápidas

```bash
curl http://localhost:3000/api/health
```

Después de configurar credenciales:

```bash
cd 03_Desarrollo/backend
pnpm test:api
pnpm test:gemini
pnpm test:upload
```

También se puede comprobar la compilación con `pnpm build` en cada aplicación.

## 6. Detención y limpieza

Detener cada proceso con `Ctrl+C`. Las pruebas de subida eliminan el registro de prueba por defecto; usar `--keep` solo cuando se necesite inspeccionarlo. Los archivos creados en Google Drive deben eliminarse manualmente si la prueba conserva el binario.
