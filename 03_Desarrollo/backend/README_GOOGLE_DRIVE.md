# 📁 Guía de Configuración: Google Drive (Cuenta Personal o Corporativa)

Esta guía detalla paso a paso cómo conectar el backend a **tu propia cuenta de Google Drive** para almacenar archivos mediante **enlaces prefirmados de subida directa (Resumable Upload Sessions)**.

---

## 🎯 ¿Por qué este enfoque?

* **Privacidad y Control Total:** Los archivos se almacenan en tu propio espacio de Google Drive (personal o de organización).
* **Cero Carga en el Servidor:** El archivo binario viaja directamente desde el navegador/cliente hacia los servidores de Google Drive. **No pasa por la memoria ni por el ancho de banda del backend**, evitando cuellos de botella y el límite de payload de 4.5 MB en funciones serverless de Vercel.

---

## 🛠️ Paso 0: Habilitar Google Drive API en Google Cloud Console

1. Ingresa a [Google Cloud Console](https://console.cloud.google.com/).
2. Inicia sesión con la cuenta de Google que desees utilizar (tu Gmail personal o cuenta de Google Workspace).
3. Crea un nuevo proyecto (ej: `Proyecto-Repositorio-Drive`) o selecciona uno existente.
4. En el menú de navegación, ve a **APIs y servicios** > **Biblioteca**.
5. Busca **Google Drive API** y haz clic en **Habilitar**.

---

## 🚀 Método 1 (Recomendado): Cuenta de Servicio + Carpeta Compartida

Este método es el más robusto para servidores y APIs porque **las credenciales nunca expiran** y se delega el almacenamiento en una carpeta de tu Google Drive personal.

### 1.1 Crear la Cuenta de Servicio (Service Account)
1. En Google Cloud Console, ve a **IAM y administración** > **Cuentas de servicio**.
2. Haz clic en **Crear cuenta de servicio**.
3. Asigna un nombre (ej: `drive-uploader`) y haz clic en **Crear y continuar**.
4. *(Opcional)* En rol puedes dejarlo sin rol o asignar **Proyecto > Navegador**, luego haz clic en **Listo**.
5. En la lista, haz clic sobre la cuenta de servicio recién creada.
6. Ve a la pestaña **Claves** (Keys) > **Agregar clave** > **Crear clave nueva**.
7. Selecciona el tipo **JSON** y haz clic en **Crear**. Se descargará un archivo `.json` a tu computadora.

### 1.2 Compartir tu Carpeta Personal de Google Drive
1. Abre tu [Google Drive Personal](https://drive.google.com/) en el navegador con tu cuenta habitual.
2. Crea una nueva carpeta donde se guardarán los archivos (ej: `Archivos_API_Repo`).
3. Haz clic derecho sobre la carpeta > **Compartir** > **Compartir**.
4. En el campo de añadir personas, pega el correo de la cuenta de servicio que creaste (lo encuentras en el JSON en el campo `"client_email"`, ej: `drive-uploader@tu-proyecto.iam.gserviceaccount.com`).
5. Asígnale el rol de **Editor** y desmarca la casilla "Notificar a las personas" (es una cuenta técnica). Haz clic en **Compartir**.

### 1.3 Obtener el ID de la Carpeta
Abre la carpeta creada en tu Google Drive personal. La URL en tu navegador se verá así:
```
https://drive.google.com/drive/folders/1a2b3c4d5e6f7g8h9i0jKLMNOP
```
El valor final (`1a2b3c4d5e6f7g8h9i0jKLMNOP`) es tu `GOOGLE_DRIVE_FOLDER_ID`.

### 1.4 Configurar el archivo `.env`
Abre el archivo `.env` de tu proyecto y configura las variables extraídas del archivo `.json` descargado:

```env
# Correo de la Service Account
GOOGLE_DRIVE_CLIENT_EMAIL=drive-uploader@tu-proyecto.iam.gserviceaccount.com

# Clave privada (incluyendo cabeceras -----BEGIN PRIVATE KEY----- y -----END PRIVATE KEY-----)
GOOGLE_DRIVE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"

# ID de la carpeta compartida en tu Drive personal
GOOGLE_DRIVE_FOLDER_ID=1a2b3c4d5e6f7g8h9i0jKLMNOP
```

> **Alternativa en una sola línea:** También puedes pegar todo el contenido del JSON como una cadena en la variable `GOOGLE_SERVICE_ACCOUNT_KEY`:
> ```env
> GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'
> GOOGLE_DRIVE_FOLDER_ID=1a2b3c4d5e6f7g8h9i0jKLMNOP
> ```

---

## 🔑 Método 2: OAuth 2.0 con Refresh Token de tu Cuenta Personal

Utiliza este método si prefieres que la API actúe directamente bajo el usuario de tu cuenta personal de Google (sin usar Cuenta de Servicio).

### 2.1 Configurar Pantalla de Consentimiento
1. En Google Cloud Console, ve a **APIs y servicios** > **Pantalla de consentimiento de OAuth**.
2. Selecciona **Externo** y haz clic en **Crear**.
3. Ingresa el nombre de la app (ej: `Mi API Drive`) y tu correo de contacto.
4. En **Permisos** (Scopes), haz clic en **Agregar o quitar permisos**, busca y selecciona:
   * `https://www.googleapis.com/auth/drive`
5. En **Usuarios de prueba**, añade tu propio correo de Gmail personal y guarda los cambios.

### 2.2 Crear Credenciales OAuth 2.0
1. Ve a **APIs y servicios** > **Credenciales** > **Crear credenciales** > **ID de cliente de OAuth**.
2. Tipo de aplicación: selecciona **Aplicación web**.
3. Nombre: `Cliente Drive API`.
4. En **URI de redireccionamiento autorizados**, añade:
   * `https://developers.google.com/oauthplayground`
5. Haz clic en **Crear**. Guarda el **Client ID** y el **Client Secret**.

### 2.3 Obtener el Refresh Token
1. Entra a [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground).
2. Haz clic en el ícono de engranaje ⚙️ (arriba a la derecha):
   * Marca la casilla **Use your own OAuth credentials**.
   * Pega tu **OAuth Client ID** y tu **OAuth Client Secret**.
3. En la columna izquierda (**Step 1: Select & authorize APIs**):
   * En el campo de texto ingresa: `https://www.googleapis.com/auth/drive`
   * Haz clic en **Authorize APIs**.
4. Inicia sesión con tu cuenta personal de Google y autoriza los permisos.
5. En **Step 2: Exchange authorization code for tokens**:
   * Haz clic en el botón azul **Exchange authorization code for tokens**.
6. Copia el valor de **Refresh token**.

### 2.4 Configurar el archivo `.env`
```env
GOOGLE_DRIVE_CLIENT_ID=tu_client_id.apps.googleusercontent.com
GOOGLE_DRIVE_CLIENT_SECRET=tu_client_secret
GOOGLE_DRIVE_REFRESH_TOKEN=tu_refresh_token
GOOGLE_DRIVE_FOLDER_ID=id_de_carpeta_en_tu_drive_personal # Opcional
```

---

## 🧪 Comprobar la Configuración

### 1. Verificar el Estado del Servicio
Haz una petición a la API con tu token de sesión:
```http
GET /api/repositorios/drive/status
Authorization: Bearer <tu_token_de_sesion>
```
**Respuesta esperada:**
```json
{
  "service": "Google Drive Storage (Cuenta Común)",
  "configured": true,
  "method": "Service Account (Cuenta de Servicio)",
  "defaultFolderId": "1a2b3c4d5e6f7g8h9i0jKLMNOP"
}
```

---

## 💻 Ejemplo Práctico de Subida Directa desde el Frontend

### Paso 1: Pedir el enlace prefirmado a tu backend
```javascript
const res = await fetch('http://localhost:3000/api/repositorios/upload-url', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${sessionToken}`
  },
  body: JSON.stringify({
    fileName: file.name,
    mimeType: file.type,
    fileSize: file.size
  })
});

const { uploadUrl } = await res.json();
```

### Paso 2: Subir el archivo directamente a Google Drive (vía PUT)
```javascript
const uploadRes = await fetch(uploadUrl, {
  method: 'PUT',
  headers: {
    'Content-Type': file.type
  },
  body: file // File o Blob binario
});

const driveFile = await uploadRes.json();
console.log('ID del archivo en tu Google Drive:', driveFile.id);
```

### Paso 3: Registrar el archivo en tu base de datos
```javascript
await fetch('http://localhost:3000/api/repositorios', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${sessionToken}`
  },
  body: JSON.stringify({
    nom_arch: file.name,
    driveFileId: driveFile.id,
    categoria: 'Documentos',
    descripcion: 'Subido desde mi aplicación',
    palabras_clave: ['personal', 'drive', '2026']
  })
});
```

El archivo quedará guardado y visible en tu carpeta personal de Google Drive, consumiendo tu propia cuota de almacenamiento sin sobrecargar los servidores de tu API.
