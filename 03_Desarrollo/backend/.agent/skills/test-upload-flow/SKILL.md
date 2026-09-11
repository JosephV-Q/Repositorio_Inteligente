---
name: test-upload-flow
description: >-
  Use this skill whenever the user asks to test, verify, or check the file upload flow
  (Google Drive + Express backend + Neon PostgreSQL DB) or run the upload verification script.
---

# Verificación del Flujo de Subida de Archivos

Esta skill define el procedimiento y comandos para verificar de punta a punta el flujo de subida de archivos utilizando el cliente frontend [`ApiClient`](client/ApiClient.ts), el backend Express y Google Drive.

## Comando de Ejecución

Para ejecutar la verificación completa:

```bash
npm run test:upload
```

O directamente mediante `tsx`:

```bash
npx tsx scripts/test_upload_flow.ts
```

### Opciones y Parámetros

- **Conservar el registro en base de datos:**
  ```bash
  npm run test:upload -- --keep
  ```
- **Probar contra un servidor ya en ejecución (por ejemplo en el puerto 3000 o producción):**
  ```bash
  npm run test:upload -- --url http://localhost:3000
  ```

---

## Qué Hace el Script Internamente

El script [`scripts/test_upload_flow.ts`](scripts/test_upload_flow.ts) automatiza los 6 pasos del flujo:

1. **Servidor Backend:** Si no se pasa `--url`, levanta una instancia local en un puerto efímero.
2. **Autenticación (RBAC):** Solicita un token de sesión firmado mediante `/api/auth/test-token`.
3. **Comprobación de Google Drive:** Consulta `/api/repositorios/drive/status` para confirmar credenciales en `.env`.
4. **Archivo de Prueba:** Genera un archivo en memoria (`File` / `text/plain`).
5. **Subida con Cliente Oficial:** Ejecuta `api.subirArchivo(file, params)` del cliente `client/ApiClient.ts`:
   - Solicita enlace prefirmado a `/api/repositorios/upload-url`.
   - Envía el binario crudo mediante `HTTP PUT` directamente a Google Drive.
   - Registra el archivo y su `driveFileId` en Neon PostgreSQL (`/api/repositorios`).
6. **Validación y Limpieza:** Consulta el registro por ID en la BD y lo elimina si no se especificó `--keep`.

---

## Resolución de Problemas Conocidos

- **Error 403 `storageQuotaExceeded: Service Accounts do not have storage quota`:**
  - **Causa:** La carpeta `GOOGLE_DRIVE_FOLDER_ID` pertenece a una cuenta personal `@gmail.com`. Google no otorga cuota a Cuentas de Servicio en Drive personal.
  - **Solución:** Configurar en `.env` las variables de OAuth2 con Refresh Token:
    - `GOOGLE_DRIVE_CLIENT_ID`
    - `GOOGLE_DRIVE_CLIENT_SECRET`
    - `GOOGLE_DRIVE_REFRESH_TOKEN`
    *(Ver guía completa en `README_GOOGLE_DRIVE.md` > Método 2).*
