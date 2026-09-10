# INSTRUCCIONES DE INTEGRACIÓN DE BACKEND PARA LA IA DEL FRONTEND

> **Destinatario**: Modelo de IA o Asistente de Desarrollo encargado de implementar la interfaz de usuario (React, Next.js, Vue, Nuxt, Svelte, Angular o Vanilla TypeScript).

Este documento contiene las directrices, especificaciones técnicas y ejemplos de código necesarios para integrar la interfaz con el backend Express + Neon PostgreSQL a través de la clase cliente [`ApiClient`](./ApiClient.ts).

---

## 1. Resumen de Arquitectura y Conexión

- El backend opera bajo arquitectura REST con base de datos Neon PostgreSQL.
- La clase [`ApiClient`](./ApiClient.ts) centraliza:
  1. Abstracción total de llamadas `fetch` con parseo JSON y tipado estricto de retornos y DTOs.
  2. Gestión de tokens de sesión (`localStorage` por defecto o en memoria).
  3. Inyección automática de `Authorization: Bearer <token>` y `x-session-token` en cada llamada.
  4. Redirección ante sesiones vencidas mediante el hook `onUnauthorized`.
  5. Flujo completo de subida directa a Google Drive sin saturar el backend.

### Inicialización recomendada:

```typescript
// src/services/api.ts (o la ruta en tu proyecto frontend)
import { ApiClient } from './client/ApiClient';

export const api = new ApiClient({
  baseUrl: import.meta.env.VITE_API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://db-repo.vercel.app',
  tokenStorageKey: 'db_repo_session_token',
  onUnauthorized: () => {
    // Redirigir a pantalla de login si el token expiró o es inválido
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }
});

export default api;
```

---

## 2. Flujos de Autenticación y Sesión

### A. Inicio de Sesión (Login)
```typescript
import { api } from './services/api';
import { ApiClientError } from './client/ApiClient';

try {
  const response = await api.login({
    gmail: 'usuario@dominio.com',
    password: 'password123'
  });
  console.log('Usuario:', response.user.nombre);
  console.log('Rol:', response.user.nombre_rol);
  // Redirigir al dashboard
} catch (err) {
  if (err instanceof ApiClientError) {
    alert(err.message); // Mensaje amigable del backend
  }
}
```

### B. Validación de Invitación y Registro de Cliente
1. El usuario llega con un enlace: `https://tu-app.com/registro?token=XYZ`
2. **Paso 1: Validar el token** para confirmar que sigue activo y obtener el correo:
```typescript
const { valid, invitacion } = await api.validateInvitation(token);
if (!valid || !invitacion) {
  // Mostrar pantalla de error: Enlace inválido o ya utilizado
  return;
}
// Pre-llenar campo de correo (solo lectura): invitacion.correo
// Mostrar rol que tendrá: invitacion.nombre_rol
```

3. **Paso 2: Registrar usuario**:
```typescript
const result = await api.register({
  token,
  nombre: 'Carlos Santana',
  password: 'PasswordSegura2026'
});
// El token queda guardado automáticamente y el usuario logueado
```

### C. Usuario Actual y Cerrar Sesión
```typescript
// Obtener perfil y rol del usuario logueado
const { user } = await api.getCurrentUser();

// Cerrar sesión
api.logout();
```

---

## 3. Subida de Archivos a Google Drive (Abstracción Total)

> [!IMPORTANT]
> **Arquitectura de Cero Carga en Servidor**: El archivo binario **NUNCA** se envía mediante multipart al backend de Express. El método `api.subirArchivo(...)` se encarga de todo internamente:
> 1. Pide la URL prefirmada a Google Drive.
> 2. Sube los bytes mediante un HTTP `PUT` directo a los servidores de Google Drive.
> 3. Registra el archivo y sus metadatos en la tabla `repositorios` de Neon DB.

### Uso en el Frontend:

```typescript
// En cualquier componente React / Vue / etc.
const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    // Opción 1: Subida rápida en 1 línea
    // const { repositorio } = await api.subirArchivo(file);

    // Opción 2: Subida completa con metadatos y barra de progreso
    const { repositorio, driveFileId, viewUrl } = await api.subirArchivo(file, {
      categoria: 'Finanzas',
      descripcion: 'Balance general consolidado 2026',
      resumen: 'Resumen financiero anual con métricas clave',
      palabras_clave: ['balance', '2026', 'finanzas'],
      contexto: 'Auditoría externa',
      onProgress: (percent, loadedBytes, totalBytes) => {
        console.log(`Progreso: ${percent}% (${loadedBytes}/${totalBytes} bytes)`);
        setProgress(percent);
      }
    });

    console.log('Archivo subido y registrado con éxito. ID:', repositorio?.id);
    console.log('Enlace Google Drive:', viewUrl);
  } catch (error) {
    console.error('Error al subir:', error);
  }
};
```

---

## 4. Guía de Métodos Disponibles en `ApiClient`

| Módulo | Método | Descripción |
| :--- | :--- | :--- |
| **Auth** | `api.login({ gmail, password })` | Inicia sesión y almacena token |
| | `api.register({ token, nombre, password })` | Registra cliente con enlace de invitación |
| | `api.validateInvitation(token)` | Verifica estado del token de invitación |
| | `api.getCurrentUser()` | Obtiene usuario actual y sus roles/permisos |
| | `api.validateSession()` | Valida firma del token |
| | `api.logout()` | Limpia el token y almacenamiento |
| **Usuarios** | `api.getUsuarios(filters?)` | Lista usuarios (`?nombre=&rol=&limit=`) |
| | `api.getUsuarioById(id)` | Consulta usuario por ID |
| | `api.getUsuarioByGmail(gmail)` | Busca usuario por su correo |
| | `api.createUsuario(data)` | Crea usuario manualmente (admin) |
| | `api.updateUsuario(id, data)` | Actualiza usuario |
| | `api.updateUsuarioRol(id, rol)` | Cambia el rol de un usuario |
| | `api.deleteUsuario(id)` | Elimina un usuario |
| | `api.checkDbStatus()` | Verifica conexión a Neon DB |
| **Roles** | `api.getRoles(filters?)` | Lista roles y sus permisos |
| | `api.getRolById(id)` | Consulta detalle de rol |
| | `api.createRol(data)` | Crea nuevo rol |
| | `api.updateRol(id, data)` | Actualiza permisos/nombre de rol |
| | `api.addPermisoToRol(id, permiso)` | Agrega ruta a permisos |
| | `api.deleteRol(id)` | Elimina un rol |
| | `api.syncRoles()` | Sincroniza tabla con `roles.json` |
| **Invitaciones** | `api.getInvitaciones(filters?)` | Lista invitaciones activas |
| | `api.createInvitacion({ correo, rol })` | Crea enlace de invitación para un rol |
| | `api.getInvitacionById(id)` | Consulta invitación por ID |
| | `api.updateInvitacionRol(id, rol)` | Modifica rol de la invitación |
| | `api.deleteInvitacion(id)` | Invalida/elimina invitación |
| **Repositorios / Drive** | `api.subirArchivo(file, params?)` | **Todo en uno**: pide URL, sube a Drive y registra en BD |
| | `api.getRepositorios(filters?)` | Lista repositorios con filtros |
| | `api.getRepositorioById(id)` | Consulta repositorio por ID |
| | `api.createRepositorio(data)` | Registra repositorio en BD manualmente |
| | `api.updateRepositorio(id, data)` | Modifica metadatos de archivo |
| | `api.deleteRepositorio(id)` | Elimina registro de repositorio |
| | `api.getDriveConfigStatus()` | Verifica estado de Google Drive |
| **Configuración** | `api.getConfiguraciones(filters?)` | Lista configuraciones institucionales |
| | `api.createConfiguracion(data)` | Crea configuración con categorías |
| | `api.addCategoriaToConfig(id, cat)` | Agrega una categoría al array |
| | `api.removeCategoriaFromConfig(id, cat)` | Quita una categoría del array |
| | `api.deleteConfiguracion(id)` | Elimina configuración |
| **Comparativas** | `api.getComparativas(filters?)` | Lista comparativas registradas |
| | `api.createComparativa(data)` | Crea comparativa con array de URLs |
| | `api.addUrlToComparativa(id, url)` | Agrega una URL al array |
| | `api.removeUrlFromComparativa(id, url)` | Quita una URL del array |
| | `api.deleteComparativa(id)` | Elimina comparativa |
| **Gemini AI** | `api.askGemini({ prompt, context, ... })` | Consulta IA Gemini mediante backend |
| | `api.getGeminiStatus()` | Estado del servicio Gemini AI |
| **Salud** | `api.getHealth()` | Healthcheck del backend |

---

## 5. Control de Errores Tipado

Cuando cualquier petición falla (código HTTP 400, 401, 403, 404, 500, etc.) o hay pérdida de conexión a internet, se lanza una excepción de tipo [`ApiClientError`](./ApiClient.ts):

```typescript
import { ApiClientError } from './client/ApiClient';

try {
  await api.createUsuario({ ... });
} catch (error) {
  if (error instanceof ApiClientError) {
    console.error('Código HTTP:', error.status);
    console.error('Endpoint fallido:', error.endpoint);
    console.error('Mensaje amigable:', error.message);
    console.error('Detalles del backend:', error.details);
    
    if (error.status === 403) {
      toast.error('No tienes permisos suficientes para realizar esta acción.');
    } else {
      toast.error(error.message);
    }
  } else {
    console.error('Error no controlado:', error);
  }
}
```
