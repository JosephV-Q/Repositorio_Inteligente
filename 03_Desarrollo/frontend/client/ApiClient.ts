/**
 * ============================================================================
 * CLIENTE API TYPESCRIPT FRONTEND PARA SISTEMA DB_REPO
 * ============================================================================
 * 
 * Este cliente abstrae completamente la comunicación con el backend Express/Neon DB,
 * gestiona automáticamente los tokens de sesión, ofrece tipado estricto para todos los
 * modelos y DTOs, e implementa el flujo de subida directa a Google Drive.
 * 
 * Creado para ser consumido en React, Vue, Angular, Svelte, Next.js, Nuxt o Vanilla TS.
 */

// ============================================================================
// 1. MODELOS Y TIPOS DE DATOS DEL DOMINIO
// ============================================================================

export interface Usuario {
  id: number;
  nombre: string;
  gmail: string;
  password?: string;
  rol: number;
  nombre_rol?: string;
}

export interface CreateUsuarioDto {
  nombre: string;
  gmail: string;
  password: string;
  rol: number;
}

export interface UpdateUsuarioDto {
  nombre?: string;
  gmail?: string;
  password?: string;
  rol?: number;
}

export interface UsuarioFilters {
  id?: number;
  nombre?: string;
  gmail?: string;
  rol?: number;
  limit?: number;
  offset?: number;
}

export interface Rol {
  id_roles: number;
  nombre_rol: string;
  permisos_rol: string[] | Record<string, any>;
}

export interface CreateRolDto {
  nombre_rol: string;
  permisos_rol?: string[] | Record<string, any>;
}

export interface UpdateRolDto {
  nombre_rol?: string;
  permisos_rol?: string[] | Record<string, any>;
}

export interface RolFilters {
  id_roles?: number;
  nombre_rol?: string;
}

export interface Repositorio {
  id: number;
  nom_arch: string;
  ruta_arch: string;
  categoria: string | null;
  descripcion: string | null;
  resumen: string | null;
  palabras_clave: string[] | null;
  contexto: string | null;
}

export interface CreateRepositorioDto {
  nom_arch: string;
  ruta_arch?: string;
  driveFileId?: string;
  categoria?: string | null;
  descripcion?: string | null;
  resumen?: string | null;
  palabras_clave?: string[] | null;
  contexto?: string | null;
}

export interface UpdateRepositorioDto {
  nom_arch?: string;
  ruta_arch?: string;
  driveFileId?: string;
  categoria?: string | null;
  descripcion?: string | null;
  resumen?: string | null;
  palabras_clave?: string[] | null;
  contexto?: string | null;
}

export interface RepositorioFilters {
  id?: number;
  nom_arch?: string;
  categoria?: string;
  contexto?: string;
  palabra_clave?: string;
  limit?: number;
  offset?: number;
}

export interface Configuracion {
  id: number;
  categorias: string[];
  nom_institucion: string;
}

export interface CreateConfiguracionDto {
  nom_institucion: string;
  categorias?: string[];
}

export interface UpdateConfiguracionDto {
  nom_institucion?: string;
  categorias?: string[];
}

export interface ConfiguracionFilters {
  id?: number;
  nom_institucion?: string;
  categoria?: string;
  limit?: number;
  offset?: number;
}

export interface Comparativa {
  id: number;
  urls: string[];
  titulo: string;
  comparativa: string | null;
  descripcion: string | null;
  categoria: string | null;
  contexto: string | null;
}

export interface CreateComparativaDto {
  titulo: string;
  urls?: string[];
  comparativa?: string | null;
  descripcion?: string | null;
  categoria?: string | null;
  contexto?: string | null;
}

export interface UpdateComparativaDto {
  titulo?: string;
  urls?: string[];
  comparativa?: string | null;
  descripcion?: string | null;
  categoria?: string | null;
  contexto?: string | null;
}

export interface ComparativaFilters {
  id?: number;
  titulo?: string;
  categoria?: string;
  contexto?: string;
  url?: string;
  limit?: number;
  offset?: number;
}

export interface Invitacion {
  id: number;
  token: string;
  correo: string;
  rol: number;
}

export interface CreateInvitacionDto {
  correo: string;
  rol: number;
  token?: string;
}

export interface UpdateInvitacionDto {
  token?: string;
  correo?: string;
  rol?: number;
}

export interface InvitacionFilters {
  id?: number;
  token?: string;
  correo?: string;
  rol?: number;
  limit?: number;
  offset?: number;
}

// ============================================================================
// 2. DTOs DE AUTENTICACIÓN Y SERVICIOS AUXILIARES
// ============================================================================

export interface LoginCredentials {
  gmail: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  user: {
    id: number;
    nombre: string;
    gmail: string;
    rol: number;
    nombre_rol: string;
  };
}

export interface RegisterData {
  token: string;
  nombre: string;
  password: string;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  token: string;
  user: {
    id: number;
    nombre: string;
    gmail: string;
    rol: number;
    nombre_rol: string;
  };
}

export interface InvitationValidationResponse {
  success: boolean;
  valid: boolean;
  message?: string;
  error?: string;
  invitacion?: {
    correo: string;
    rol: number;
    nombre_rol: string;
  };
}

export interface CurrentUserResponse {
  success: boolean;
  user: {
    id: number;
    nombre: string;
    gmail: string;
    rol: number;
    nombre_rol: string;
    permisos?: string[] | Record<string, any>;
  };
}

export interface ValidateSessionResponse {
  success: boolean;
  valid: boolean;
  session?: {
    id: number;
    gmail: string;
    rol: number;
    iat?: number;
    exp?: number;
  };
  error?: string;
}

export interface SubirArchivoParams {
  /**
   * Nombre personalizado para el archivo en el sistema. Si no se indica, toma `file.name`.
   */
  nom_arch?: string;

  /**
   * Categoría temática para clasificar el archivo (ej: 'Finanzas', 'Informes').
   */
  categoria?: string | null;

  /**
   * Descripción detallada del contenido del archivo.
   */
  descripcion?: string | null;

  /**
   * Resumen conciso generado o redactado.
   */
  resumen?: string | null;

  /**
   * Palabras clave o etiquetas para facilitar búsquedas.
   */
  palabras_clave?: string[] | null;

  /**
   * Contexto institucional, departamental o de auditoría.
   */
  contexto?: string | null;

  /**
   * ID opcional de una carpeta de Google Drive donde almacenar el archivo.
   */
  folderId?: string;

  /**
   * Callback opcional para monitorear el progreso de subida en tiempo real (0% a 100%).
   */
  onProgress?: (progressPercent: number, loadedBytes: number, totalBytes: number) => void;

  /**
   * Si es true, solo sube el archivo a Google Drive y NO lo registra en la tabla 'repositorios'.
   * Por defecto es false (sube a Drive y registra en la BD de forma transparente).
   */
  soloDrive?: boolean;
}

export interface SubirArchivoResult {
  success: boolean;
  driveFileId?: string;
  viewUrl: string;
  repositorio?: Repositorio;
}

export interface DriveUploadUrlRequest {
  fileName: string;
  mimeType?: string;
  fileSize?: number;
  folderId?: string;
}

export interface DriveUploadUrlResponse {
  success: boolean;
  message: string;
  uploadUrl: string;
  fileName: string;
  mimeType?: string;
  expiresInSeconds?: number;
  instructions?: Record<string, any>;
}

export interface DriveStatusResponse {
  service: string;
  configured: boolean;
  method?: string;
  defaultFolderId?: string;
}

export interface GeminiPromptRequest {
  prompt: string;
  systemInstruction?: string;
  context?: string;
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  apiKey?: string;
}

export interface GeminiPromptResponse {
  success: boolean;
  data: {
    response: string;
    model: string;
    usage?: Record<string, any>;
  };
  error?: string;
  details?: any;
}

export interface GeminiStatusResponse {
  service: string;
  configured: boolean;
  defaultModel: string;
  message: string;
}

export interface HealthResponse {
  status: string;
  uptime: number;
  timestamp: string;
  app: string;
}

export interface DbStatusResponse {
  status: string;
  provider: string;
  connected: boolean;
  time?: string;
  error?: string;
}

export interface SyncRolesResponse {
  success: boolean;
  message: string;
  rolesSynced: number;
  rolesConfiguredInFile: number;
  rolesInDb: number;
}

export interface GenericSuccessResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  [key: string]: any;
}

// ============================================================================
// 3. MANEJO DE ERRORES TIPADO
// ============================================================================

export class ApiClientError extends Error {
  public status: number;
  public details: any;
  public endpoint: string;

  constructor(message: string, status: number, endpoint: string, details?: any) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.endpoint = endpoint;
    this.details = details;
    Object.setPrototypeOf(this, ApiClientError.prototype);
  }
}

// ============================================================================
// 4. CONFIGURACIÓN DEL CLIENTE
// ============================================================================

export interface StorageAdapter {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
}

export interface ApiClientConfig {
  /**
   * URL base de la API backend.
   * Valor por defecto: 'https://db-repo.vercel.app'
   */
  baseUrl?: string;

  /**
   * Token de sesión inicial opcional.
   */
  token?: string;

  /**
   * Almacenamiento para persistencia automática de la sesión.
   * Por defecto intenta usar `window.localStorage` si está disponible.
   * Puedes pasar `null` para deshabilitar persistencia y usar solo memoria.
   */
  storage?: StorageAdapter | null;

  /**
   * Clave bajo la cual se guarda el token en el storage.
   * Por defecto: 'db_repo_session_token'
   */
  tokenStorageKey?: string;

  /**
   * Función opcional que se ejecuta cuando el backend responde 401 (No autorizado).
   * Muy útil para redirigir automáticamente al login en el frontend.
   */
  onUnauthorized?: () => void;

  /**
   * Headers personalizados adicionales a incluir en cada petición.
   */
  defaultHeaders?: Record<string, string>;
}

// ============================================================================
// 5. CLASE PRINCIPAL: ApiClient
// ============================================================================

export class ApiClient {
  public readonly baseUrl: string;
  private token: string | null = null;
  private readonly storage: StorageAdapter | null;
  private readonly tokenStorageKey: string;
  private readonly onUnauthorized?: () => void;
  private readonly defaultHeaders: Record<string, string>;

  constructor(config: ApiClientConfig = {}) {
    // 1. Configurar URL base (eliminando barra diagonal final si existe)
    const rawUrl = config.baseUrl || 'https://db-repo.vercel.app';
    this.baseUrl = rawUrl.replace(/\/+$/, '');

    this.tokenStorageKey = config.tokenStorageKey || 'db_repo_session_token';
    this.onUnauthorized = config.onUnauthorized;
    this.defaultHeaders = config.defaultHeaders || {};

    // 2. Determinar Storage Adapter seguro
    if (config.storage !== undefined) {
      this.storage = config.storage;
    } else if (typeof window !== 'undefined' && window.localStorage) {
      this.storage = window.localStorage;
    } else {
      this.storage = null;
    }

    // 3. Inicializar token (de parámetro o de storage)
    if (config.token) {
      this.setToken(config.token);
    } else if (this.storage) {
      try {
        const saved = this.storage.getItem(this.tokenStorageKey);
        if (typeof saved === 'string' && saved.trim().length > 0) {
          this.token = saved.trim();
        }
      } catch {
        // En entornos SSR o iframes restringidos, ignorar fallo de storage
        this.token = null;
      }
    }
  }

  // ==========================================================================
  // GESTIÓN DEL TOKEN Y SESIÓN
  // ==========================================================================

  /**
   * Obtiene el token de sesión actual en memoria.
   */
  public getToken(): string | null {
    return this.token;
  }

  /**
   * Establece un token de sesión y lo persiste en el storage si está habilitado.
   */
  public setToken(token: string): void {
    this.token = token.trim();
    if (this.storage) {
      try {
        this.storage.setItem(this.tokenStorageKey, this.token);
      } catch (err) {
        console.warn('[ApiClient] No se pudo persistir el token en storage:', err);
      }
    }
  }

  /**
   * Elimina el token de sesión en memoria y en el storage.
   */
  public clearToken(): void {
    this.token = null;
    if (this.storage) {
      try {
        this.storage.removeItem(this.tokenStorageKey);
      } catch (err) {
        console.warn('[ApiClient] No se pudo remover el token de storage:', err);
      }
    }
  }

  /**
   * Verifica si existe un token de sesión configurado.
   */
  public isAuthenticated(): boolean {
    return Boolean(this.token && this.token.length > 0);
  }

  // ==========================================================================
  // MOTOR DE COMUNICACIÓN HTTP CENTRALIZADO
  // ==========================================================================

  /**
   * Realiza una llamada HTTP al backend con manejo unificado de headers,
   * tokens de autorización, parseo de JSON y control de excepciones.
   */
  public async request<T = any>(
    path: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
      body?: any;
      query?: Record<string, any>;
      headers?: Record<string, string>;
      skipAuth?: boolean;
    } = {}
  ): Promise<T> {
    const {
      method = 'GET',
      body,
      query,
      headers: customHeaders = {},
      skipAuth = false
    } = options;

    // Normalizar ruta para asegurar que empiece con '/'
    const cleanPath = path.startsWith('/') ? path : `/${path}`;

    // Construir Query String
    let queryString = '';
    if (query && Object.keys(query).length > 0) {
      const searchParams = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null && v !== '') {
          if (Array.isArray(v)) {
            v.forEach(item => searchParams.append(k, String(item)));
          } else {
            searchParams.append(k, String(v));
          }
        }
      }
      const qs = searchParams.toString();
      if (qs) {
        queryString = `?${qs}`;
      }
    }

    const fullUrl = `${this.baseUrl}${cleanPath}${queryString}`;

    // Configurar Headers
    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...customHeaders
    };

    if (body !== undefined && !(typeof FormData !== 'undefined' && body instanceof FormData) && !(typeof Blob !== 'undefined' && body instanceof Blob)) {
      if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
    }

    // Inyectar Token si está disponible y no se saltó explícitamente
    if (!skipAuth && this.token) {
      if (!headers['Authorization']) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }
      if (!headers['x-session-token']) {
        headers['x-session-token'] = this.token;
      }
    }

    // Configurar Fetch Request
    const fetchOptions: RequestInit = {
      method,
      headers
    };

    if (body !== undefined) {
      if (
        typeof body === 'object' &&
        !(typeof FormData !== 'undefined' && body instanceof FormData) &&
        !(typeof Blob !== 'undefined' && body instanceof Blob)
      ) {
        fetchOptions.body = JSON.stringify(body);
      } else {
        fetchOptions.body = body;
      }
    }

    let response: Response;
    try {
      response = await fetch(fullUrl, fetchOptions);
    } catch (networkError: any) {
      throw new ApiClientError(
        `Error de red al conectar con el backend (${networkError?.message || 'Host inalcanzable'}): ${fullUrl}`,
        0,
        cleanPath,
        networkError
      );
    }

    // Manejo de códigos 401 Unauthorized
    if (response.status === 401) {
      if (this.onUnauthorized) {
        try {
          this.onUnauthorized();
        } catch (callbackErr) {
          console.error('[ApiClient] Error en callback onUnauthorized:', callbackErr);
        }
      }
    }

    // Parsear respuesta JSON o texto
    let responseData: any = null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        responseData = await response.json();
      } catch {
        responseData = null;
      }
    } else {
      try {
        responseData = await response.text();
      } catch {
        responseData = null;
      }
    }

    // Si la respuesta HTTP no fue exitosa (status >= 400), lanzar ApiClientError tipado
    if (!response.ok) {
      const errorMessage =
        (responseData && (responseData.error || responseData.message)) ||
        `Error HTTP ${response.status}: ${response.statusText}`;

      throw new ApiClientError(errorMessage, response.status, cleanPath, responseData);
    }

    return responseData as T;
  }

  // ==========================================================================
  // 6. MÉTODOS DE AUTENTICACIÓN Y SESIÓN (/api/auth)
  // ==========================================================================

  /**
   * Inicia sesión con correo y contraseña.
   * Guarda automáticamente el token obtenido para las llamadas subsiguientes.
   */
  public async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const result = await this.request<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: credentials,
      skipAuth: true
    });

    if (result.token) {
      this.setToken(result.token);
    }

    return result;
  }

  /**
   * Registra una nueva cuenta usando el token de invitación y una contraseña.
   * Guarda automáticamente el token de sesión generado al registrarse.
   */
  public async register(data: RegisterData): Promise<RegisterResponse> {
    const result = await this.request<RegisterResponse>('/api/auth/register', {
      method: 'POST',
      body: data,
      skipAuth: true
    });

    if (result.token) {
      this.setToken(result.token);
    }

    return result;
  }

  /**
   * Valida un enlace o token de invitación para el formulario de registro del cliente.
   * Retorna el correo asignado y el nombre de rol validado contra la base de datos.
   */
  public async validateInvitation(token: string): Promise<InvitationValidationResponse> {
    return this.request<InvitationValidationResponse>(`/api/auth/invitacion/${encodeURIComponent(token)}`, {
      method: 'GET',
      skipAuth: true
    });
  }

  /**
   * Obtiene la información del usuario en sesión actual (/api/auth/me).
   */
  public async getCurrentUser(): Promise<CurrentUserResponse> {
    return this.request<CurrentUserResponse>('/api/auth/me', {
      method: 'GET'
    });
  }

  /**
   * Alias de `getCurrentUser()` (/api/auth/session).
   */
  public async getSession(): Promise<CurrentUserResponse> {
    return this.request<CurrentUserResponse>('/api/auth/session', {
      method: 'GET'
    });
  }

  /**
   * Valida la firma criptográfica y expiración del token actual.
   */
  public async validateSession(): Promise<ValidateSessionResponse> {
    return this.request<ValidateSessionResponse>('/api/auth/validate-session', {
      method: 'POST'
    });
  }

  /**
   * Genera un token de prueba con fines de desarrollo y pruebas.
   */
  public async getTestToken(query?: { rol?: number | string; id?: number; gmail?: string }): Promise<{
    success: boolean;
    token: string;
    user: any;
  }> {
    return this.request('/api/auth/test-token', {
      method: 'GET',
      query
    });
  }

  /**
   * Cierra sesión localmente limpiando el token de memoria y almacenamiento.
   */
  public logout(): void {
    this.clearToken();
  }

  // ==========================================================================
  // 7. MÉTODOS DE USUARIOS (/api/usuarios)
  // ==========================================================================

  /**
   * Lista usuarios con filtros opcionales (nombre, gmail, rol, limit, offset).
   */
  public async getUsuarios(filters?: UsuarioFilters): Promise<Usuario[]> {
    return this.request<Usuario[]>('/api/usuarios', {
      method: 'GET',
      query: filters
    });
  }

  /**
   * Obtiene un usuario por su ID primario.
   */
  public async getUsuarioById(id: number): Promise<Usuario> {
    return this.request<Usuario>(`/api/usuarios/${id}`, {
      method: 'GET'
    });
  }

  /**
   * Busca un usuario específico por su dirección de correo (gmail).
   */
  public async getUsuarioByGmail(gmail: string): Promise<Usuario> {
    return this.request<Usuario>(`/api/usuarios/buscar/gmail/${encodeURIComponent(gmail)}`, {
      method: 'GET'
    });
  }

  /**
   * Crea un nuevo usuario manualmente (requiere privilegios de admin o editor).
   */
  public async createUsuario(data: CreateUsuarioDto): Promise<Usuario> {
    return this.request<Usuario>('/api/usuarios', {
      method: 'POST',
      body: data
    });
  }

  /**
   * Actualiza los datos de un usuario por ID.
   */
  public async updateUsuario(id: number, data: UpdateUsuarioDto): Promise<Usuario> {
    return this.request<Usuario>(`/api/usuarios/${id}`, {
      method: 'PUT',
      body: data
    });
  }

  /**
   * Actualiza únicamente el rol de un usuario.
   */
  public async updateUsuarioRol(id: number, rol: number): Promise<Usuario> {
    return this.request<Usuario>(`/api/usuarios/${id}/rol`, {
      method: 'PATCH',
      body: { rol }
    });
  }

  /**
   * Elimina un usuario por ID.
   */
  public async deleteUsuario(id: number): Promise<GenericSuccessResponse> {
    return this.request<GenericSuccessResponse>(`/api/usuarios/${id}`, {
      method: 'DELETE'
    });
  }

  /**
   * Comprueba el estado de la conexión a la base de datos Neon DB.
   */
  public async checkDbStatus(): Promise<DbStatusResponse> {
    return this.request<DbStatusResponse>('/api/usuarios/db-status', {
      method: 'GET'
    });
  }

  // ==========================================================================
  // 8. MÉTODOS DE ROLES (/api/roles)
  // ==========================================================================

  /**
   * Consulta todos los roles registrados o filtra por nombre.
   */
  public async getRoles(filters?: RolFilters): Promise<Rol[]> {
    return this.request<Rol[]>('/api/roles', {
      method: 'GET',
      query: filters
    });
  }

  /**
   * Obtiene la definición de un rol por su ID.
   */
  public async getRolById(id: number): Promise<Rol> {
    return this.request<Rol>(`/api/roles/${id}`, {
      method: 'GET'
    });
  }

  /**
   * Crea un nuevo rol en la base de datos.
   */
  public async createRol(data: CreateRolDto): Promise<Rol> {
    return this.request<Rol>('/api/roles', {
      method: 'POST',
      body: data
    });
  }

  /**
   * Actualiza un rol existente por ID.
   */
  public async updateRol(id: number, data: UpdateRolDto): Promise<Rol> {
    return this.request<Rol>(`/api/roles/${id}`, {
      method: 'PUT',
      body: data
    });
  }

  /**
   * Añade una ruta o permiso a la lista de permisos de un rol.
   */
  public async addPermisoToRol(id: number, permiso: string): Promise<Rol> {
    return this.request<Rol>(`/api/roles/${id}/permisos`, {
      method: 'POST',
      body: { permiso }
    });
  }

  /**
   * Elimina un rol por su ID.
   */
  public async deleteRol(id: number): Promise<GenericSuccessResponse> {
    return this.request<GenericSuccessResponse>(`/api/roles/${id}`, {
      method: 'DELETE'
    });
  }

  /**
   * Sincroniza la tabla de roles con el archivo `roles.json` del backend.
   */
  public async syncRoles(): Promise<SyncRolesResponse> {
    return this.request<SyncRolesResponse>('/api/roles/sync', {
      method: 'POST'
    });
  }

  // ==========================================================================
  // 9. MÉTODOS DE INVITACIONES (/api/invitaciones)
  // ==========================================================================

  /**
   * Lista todas las invitaciones generadas con filtros opcionales.
   */
  public async getInvitaciones(filters?: InvitacionFilters): Promise<Invitacion[]> {
    return this.request<Invitacion[]>('/api/invitaciones', {
      method: 'GET',
      query: filters
    });
  }

  /**
   * Obtiene una invitación por su ID primario.
   */
  public async getInvitacionById(id: number): Promise<Invitacion> {
    return this.request<Invitacion>(`/api/invitaciones/${id}`, {
      method: 'GET'
    });
  }

  /**
   * Valida y obtiene una invitación por su token único.
   */
  public async getInvitacionByToken(token: string): Promise<Invitacion> {
    return this.request<Invitacion>(`/api/invitaciones/token/${encodeURIComponent(token)}`, {
      method: 'GET',
      skipAuth: true
    });
  }

  /**
   * Crea una nueva invitación para un usuario especificando correo y rol.
   */
  public async createInvitacion(data: CreateInvitacionDto): Promise<Invitacion> {
    return this.request<Invitacion>('/api/invitaciones', {
      method: 'POST',
      body: data
    });
  }

  /**
   * Actualiza una invitación existente por ID.
   */
  public async updateInvitacion(id: number, data: UpdateInvitacionDto): Promise<Invitacion> {
    return this.request<Invitacion>(`/api/invitaciones/${id}`, {
      method: 'PUT',
      body: data
    });
  }

  /**
   * Modifica el rol asignado a una invitación existente.
   */
  public async updateInvitacionRol(id: number, rol: number): Promise<Invitacion> {
    return this.request<Invitacion>(`/api/invitaciones/${id}/rol`, {
      method: 'PATCH',
      body: { rol }
    });
  }

  /**
   * Modifica el correo asociado a una invitación.
   */
  public async updateInvitacionCorreo(id: number, correo: string): Promise<Invitacion> {
    return this.request<Invitacion>(`/api/invitaciones/${id}/correo`, {
      method: 'PATCH',
      body: { correo }
    });
  }

  /**
   * Elimina o invalida una invitación por ID.
   */
  public async deleteInvitacion(id: number): Promise<GenericSuccessResponse> {
    return this.request<GenericSuccessResponse>(`/api/invitaciones/${id}`, {
      method: 'DELETE'
    });
  }

  // ==========================================================================
  // 10. MÉTODOS DE REPOSITORIOS Y GOOGLE DRIVE (/api/repositorios)
  // ==========================================================================

  /**
   * Consulta los registros de repositorios con filtros opcionales.
   */
  public async getRepositorios(filters?: RepositorioFilters): Promise<Repositorio[]> {
    return this.request<Repositorio[]>('/api/repositorios', {
      method: 'GET',
      query: filters
    });
  }

  /**
   * Obtiene los metadatos de un repositorio por ID.
   */
  public async getRepositorioById(id: number): Promise<Repositorio> {
    return this.request<Repositorio>(`/api/repositorios/${id}`, {
      method: 'GET'
    });
  }

  /**
   * Registra un nuevo repositorio en la base de datos.
   */
  public async createRepositorio(data: CreateRepositorioDto): Promise<Repositorio> {
    return this.request<Repositorio>('/api/repositorios', {
      method: 'POST',
      body: data
    });
  }

  /**
   * Actualiza los metadatos de un repositorio existente por ID.
   */
  public async updateRepositorio(id: number, data: UpdateRepositorioDto): Promise<Repositorio> {
    return this.request<Repositorio>(`/api/repositorios/${id}`, {
      method: 'PUT',
      body: data
    });
  }

  /**
   * Elimina un registro de repositorio por ID.
   */
  public async deleteRepositorio(id: number): Promise<GenericSuccessResponse> {
    return this.request<GenericSuccessResponse>(`/api/repositorios/${id}`, {
      method: 'DELETE'
    });
  }

  /**
   * Comprueba el estado de la integración con Google Drive (cuenta común).
   */
  public async getDriveConfigStatus(): Promise<DriveStatusResponse> {
    return this.request<DriveStatusResponse>('/api/repositorios/drive/status', {
      method: 'GET'
    });
  }

  /**
   * MÉTODO DE SUBIDA TODO EN UNO (ABSTRACCIÓN TOTAL):
   * Sube un archivo directamente a Google Drive y lo registra en la base de datos Neon DB.
   * 
   * Internamente se encarga de:
   * 1. Solicitar el enlace prefirmado a Google Drive sin que intervenga el desarrollador.
   * 2. Enviar el archivo binario mediante HTTP PUT directamente a los servidores de Google Drive.
   * 3. Registrar el archivo y sus metadatos en la tabla 'repositorios' de la base de datos.
   * 
   * @param file Objeto File (obtenido de un <input type="file">), Blob o Buffer
   * @param params Metadatos opcionales (categoria, descripcion, resumen, etc.) y onProgress
   * 
   * @example
   * ```ts
   * // Subida simple con 1 sola línea:
   * const { repositorio, viewUrl } = await api.subirArchivo(file);
   * 
   * // Subida con metadatos y barra de progreso:
   * const { repositorio } = await api.subirArchivo(file, {
   *   categoria: 'Finanzas',
   *   descripcion: 'Informe anual 2026',
   *   onProgress: (percent) => setProgress(percent)
   * });
   * ```
   */
  public async subirArchivo(
    file: { name?: string; size?: number; type?: string } & any,
    params: SubirArchivoParams = {}
  ): Promise<SubirArchivoResult> {
    const fileName = params.nom_arch || file?.name || 'archivo_sin_nombre';
    const mimeType = file?.type || 'application/octet-stream';
    const fileSize = typeof file?.size === 'number' ? file.size : undefined;

    // 1. Requerir internamente el enlace prefirmado
    const presigned = await this.solicitarUrlSubidaInterna({
      fileName,
      mimeType,
      fileSize,
      folderId: params.folderId
    });

    // 2. Subir internamente el archivo de forma directa a Google Drive
    const uploadResult = await this.enviarArchivoADriveInterno(presigned.uploadUrl, file, {
      mimeType,
      onProgress: params.onProgress
    });

    const fileId = uploadResult.driveFileId;
    const viewUrl = fileId
      ? `https://drive.google.com/file/d/${fileId}/view`
      : presigned.uploadUrl;

    // 3. Si se especificó 'soloDrive: true', no registrar en base de datos
    if (params.soloDrive) {
      return {
        success: true,
        driveFileId: fileId,
        viewUrl
      };
    }

    // 4. Registrar automáticamente en la base de datos
    const repositorio = await this.createRepositorio({
      nom_arch: fileName,
      driveFileId: fileId,
      ruta_arch: viewUrl,
      categoria: params.categoria ?? null,
      descripcion: params.descripcion ?? null,
      resumen: params.resumen ?? null,
      palabras_clave: params.palabras_clave ?? null,
      contexto: params.contexto ?? null
    });

    return {
      success: true,
      driveFileId: fileId,
      viewUrl,
      repositorio
    };
  }

  /**
   * Alias en inglés para `subirArchivo`.
   */
  public async uploadFile(
    file: { name?: string; size?: number; type?: string } & any,
    params?: SubirArchivoParams
  ): Promise<SubirArchivoResult> {
    return this.subirArchivo(file, params);
  }

  /**
   * Alias de compatibilidad previa.
   */
  public async uploadAndRegisterFile(
    file: { name?: string; size?: number; type?: string } & any,
    metadata: {
      categoria?: string | null;
      descripcion?: string | null;
      resumen?: string | null;
      palabras_clave?: string[] | null;
      contexto?: string | null;
      folderId?: string;
    } = {},
    options: {
      onProgress?: (progressPercent: number, loadedBytes: number, totalBytes: number) => void;
    } = {}
  ): Promise<{ repositorio: Repositorio; uploadUrl: string; driveFileId?: string }> {
    const res = await this.subirArchivo(file, {
      ...metadata,
      onProgress: options.onProgress
    });
    return {
      repositorio: res.repositorio!,
      uploadUrl: res.viewUrl,
      driveFileId: res.driveFileId
    };
  }

  // --------------------------------------------------------------------------
  // MÉTODOS PRIVADOS PARA LA SUBIDA DIRECTA A GOOGLE DRIVE
  // --------------------------------------------------------------------------

  /**
   * [INTERNO / PRIVADO] Solicita al backend el enlace prefirmado de Google Drive.
   */
  private async solicitarUrlSubidaInterna(data: DriveUploadUrlRequest): Promise<DriveUploadUrlResponse> {
    return this.request<DriveUploadUrlResponse>('/api/repositorios/upload-url', {
      method: 'POST',
      body: data
    });
  }

  /**
   * [INTERNO / PRIVADO] Realiza el PUT binario directamente a los servidores de Google Drive.
   */
  private async enviarArchivoADriveInterno(
    uploadUrl: string,
    file: any,
    options: {
      mimeType?: string;
      onProgress?: (progressPercent: number, loadedBytes: number, totalBytes: number) => void;
    } = {}
  ): Promise<{ ok: boolean; status: number; driveFileId?: string }> {
    const mimeType = options.mimeType || file?.type || 'application/octet-stream';

    // Seguimiento en navegadores mediante XMLHttpRequest
    if (typeof window !== 'undefined' && typeof XMLHttpRequest !== 'undefined' && options.onProgress) {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl, true);
        xhr.setRequestHeader('Content-Type', mimeType);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            options.onProgress!(percent, event.loaded, event.total);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            let fileId: string | undefined;
            try {
              const resJson = JSON.parse(xhr.responseText);
              fileId = resJson.id;
            } catch {
              // Google Drive resumable upload retorna 200/201 con el JSON del archivo
            }
            resolve({ ok: true, status: xhr.status, driveFileId: fileId });
          } else {
            reject(
              new ApiClientError(
                `Fallo en la subida a Google Drive (HTTP ${xhr.status}): ${xhr.statusText}`,
                xhr.status,
                uploadUrl,
                xhr.responseText
              )
            );
          }
        };

        xhr.onerror = () => {
          reject(new ApiClientError('Error de red al subir archivo a Google Drive', 0, uploadUrl));
        };

        xhr.send(file);
      });
    }

    // Fetch universal
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': mimeType
      },
      body: file
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new ApiClientError(
        `Error al subir archivo a Google Drive (HTTP ${response.status}): ${response.statusText}`,
        response.status,
        uploadUrl,
        errText
      );
    }

    let fileId: string | undefined;
    try {
      const data = await response.json();
      fileId = data?.id;
    } catch {
      // Ignorar si la respuesta no es JSON
    }

    return { ok: true, status: response.status, driveFileId: fileId };
  }

  // ==========================================================================
  // 11. MÉTODOS DE CONFIGURACIÓN (/api/configuracion)
  // ==========================================================================

  /**
   * Consulta las configuraciones del sistema con filtros opcionales.
   */
  public async getConfiguraciones(filters?: ConfiguracionFilters): Promise<Configuracion[]> {
    return this.request<Configuracion[]>('/api/configuracion', {
      method: 'GET',
      query: filters
    });
  }

  /**
   * Obtiene un registro de configuración por su ID.
   */
  public async getConfiguracionById(id: number): Promise<Configuracion> {
    return this.request<Configuracion>(`/api/configuracion/${id}`, {
      method: 'GET'
    });
  }

  /**
   * Crea una nueva configuración institucional.
   */
  public async createConfiguracion(data: CreateConfiguracionDto): Promise<Configuracion> {
    return this.request<Configuracion>('/api/configuracion', {
      method: 'POST',
      body: data
    });
  }

  /**
   * Actualiza una configuración existente por ID.
   */
  public async updateConfiguracion(id: number, data: UpdateConfiguracionDto): Promise<Configuracion> {
    return this.request<Configuracion>(`/api/configuracion/${id}`, {
      method: 'PUT',
      body: data
    });
  }

  /**
   * Añade una categoría al array de categorías de una configuración.
   */
  public async addCategoriaToConfig(id: number, categoria: string): Promise<Configuracion> {
    return this.request<Configuracion>(`/api/configuracion/${id}/categorias`, {
      method: 'POST',
      body: { categoria }
    });
  }

  /**
   * Elimina una categoría del array de categorías de una configuración.
   */
  public async removeCategoriaFromConfig(id: number, categoria: string): Promise<Configuracion> {
    return this.request<Configuracion>(
      `/api/configuracion/${id}/categorias/${encodeURIComponent(categoria)}`,
      {
        method: 'DELETE'
      }
    );
  }

  /**
   * Elimina un registro de configuración por ID.
   */
  public async deleteConfiguracion(id: number): Promise<GenericSuccessResponse> {
    return this.request<GenericSuccessResponse>(`/api/configuracion/${id}`, {
      method: 'DELETE'
    });
  }

  // ==========================================================================
  // 12. MÉTODOS DE COMPARATIVAS (/api/comparativas)
  // ==========================================================================

  /**
   * Consulta comparativas registradas con filtros opcionales.
   */
  public async getComparativas(filters?: ComparativaFilters): Promise<Comparativa[]> {
    return this.request<Comparativa[]>('/api/comparativas', {
      method: 'GET',
      query: filters
    });
  }

  /**
   * Obtiene una comparativa específica por ID.
   */
  public async getComparativaById(id: number): Promise<Comparativa> {
    return this.request<Comparativa>(`/api/comparativas/${id}`, {
      method: 'GET'
    });
  }

  /**
   * Registra una nueva comparativa.
   */
  public async createComparativa(data: CreateComparativaDto): Promise<Comparativa> {
    return this.request<Comparativa>('/api/comparativas', {
      method: 'POST',
      body: data
    });
  }

  /**
   * Actualiza una comparativa existente por ID.
   */
  public async updateComparativa(id: number, data: UpdateComparativaDto): Promise<Comparativa> {
    return this.request<Comparativa>(`/api/comparativas/${id}`, {
      method: 'PUT',
      body: data
    });
  }

  /**
   * Añade una URL a la lista de URLs de una comparativa.
   */
  public async addUrlToComparativa(id: number, url: string): Promise<Comparativa> {
    return this.request<Comparativa>(`/api/comparativas/${id}/urls`, {
      method: 'POST',
      body: { url }
    });
  }

  /**
   * Remueve una URL de la lista de URLs de una comparativa.
   */
  public async removeUrlFromComparativa(id: number, url: string): Promise<Comparativa> {
    return this.request<Comparativa>(`/api/comparativas/${id}/urls`, {
      method: 'DELETE',
      body: { url }
    });
  }

  /**
   * Elimina un registro de comparativa por ID.
   */
  public async deleteComparativa(id: number): Promise<GenericSuccessResponse> {
    return this.request<GenericSuccessResponse>(`/api/comparativas/${id}`, {
      method: 'DELETE'
    });
  }

  // ==========================================================================
  // 13. MÉTODOS DE GEMINI AI (/api/gemini)
  // ==========================================================================

  /**
   * Envía un prompt a la API de Google Gemini AI a través del backend.
   */
  public async askGemini(request: GeminiPromptRequest): Promise<GeminiPromptResponse> {
    return this.request<GeminiPromptResponse>('/api/gemini', {
      method: 'POST',
      body: request
    });
  }

  /**
   * Comprueba el estado de configuración de Google Gemini AI.
   */
  public async getGeminiStatus(): Promise<GeminiStatusResponse> {
    return this.request<GeminiStatusResponse>('/api/gemini/status', {
      method: 'GET'
    });
  }

  // ==========================================================================
  // 14. MÉTODOS DE SALUD Y DIAGNÓSTICO (/api/health, /api/hello)
  // ==========================================================================

  /**
   * Comprueba la salud general del servidor backend.
   */
  public async getHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>('/api/health', {
      method: 'GET',
      skipAuth: true
    });
  }

  /**
   * Endpoint de bienvenida y verificación rápida.
   */
  public async getHello(): Promise<{ message: string; timestamp: string }> {
    return this.request<{ message: string; timestamp: string }>('/api/hello', {
      method: 'GET',
      skipAuth: true
    });
  }
}

// Instancia singleton por defecto para uso inmediato en el frontend
export const api = new ApiClient();

export default ApiClient;

// ============================================================================
// 15. PROMPT DE INSTRUCCIONES PARA LA IA DEL FRONTEND
// ============================================================================

/**
 * Copia y pega este prompt a cualquier modelo de IA que construya o mantenga el frontend.
 */
export const FRONTEND_AI_PROMPT = `
# INSTRUCCIONES DE INTEGRACIÓN DE BACKEND PARA LA IA DEL FRONTEND

Eres un desarrollador Frontend experto encargado de integrar la interfaz de usuario con el backend de db_repo utilizando la clase cliente 'ApiClient'.

## 1. Arquitectura y Conexión
- La clase 'ApiClient' (ubicada en './client/ApiClient' o importada desde la carpeta 'client') abstrae todas las llamadas HTTP (fetch), tipado de modelos, y gestión del token de sesión.
- URL Base por defecto: 'https://db-repo.vercel.app'. Si el entorno tiene una variable pública (ej: import.meta.env.VITE_API_URL o process.env.NEXT_PUBLIC_API_URL), inicializa el cliente con:
  \`\`\`ts
  import { ApiClient } from './client/ApiClient';
  export const api = new ApiClient({
    baseUrl: import.meta.env.VITE_API_URL || 'https://db-repo.vercel.app',
    onUnauthorized: () => {
      // Redirigir al usuario al /login si el token expiró o es inválido
      window.location.href = '/login';
    }
  });
  \`\`\`

## 2. Gestión de Sesión y Autenticación
- **Inicio de Sesión**:
  Llama a \`await api.login({ gmail, password })\`. El token se guardará automáticamente en localStorage y se enviará en los headers 'Authorization: Bearer <token>' de cada petición.
- **Registro de Cliente por Invitación**:
  1. En la pantalla '/registro?token=XYZ', valida el token primero con \`const inv = await api.validateInvitation(token)\`. Si es inválido, muestra un mensaje amigable.
  2. Si es válido, muestra el formulario solicitando nombre y contraseña, y llama a \`await api.register({ token, nombre, password })\`. La sesión iniciará automáticamente.
- **Usuario Actual**:
  Usa \`await api.getCurrentUser()\` para obtener el usuario autenticado, su rol y sus permisos.
- **Cerrar Sesión**:
  Llama a \`api.logout()\`.

## 3. Subida Directa a Google Drive (Abstracción Total en 1 Línea)
- ¡El archivo binario NUNCA se sube mediante multipart al backend! Se sube directamente a los servidores de Google Drive.
- La clase cliente abstrae toda la complejidad: pide internamente el enlace prefirmado, sube el archivo a Google Drive y lo registra en la base de datos Neon DB con el método \`api.subirArchivo(file, params)\`:
  \`\`\`ts
  // Subida básica sin configuración:
  const { repositorio, viewUrl } = await api.subirArchivo(file);

  // Subida con metadatos y seguimiento de progreso:
  const { repositorio, driveFileId, viewUrl } = await api.subirArchivo(file, {
    categoria: 'Informes',
    descripcion: 'Informe trimestral 2026',
    resumen: 'Resumen ejecutivo de operaciones...',
    palabras_clave: ['finanzas', '2026', 'auditoria'],
    contexto: 'Auditoría interna',
    onProgress: (percent) => setUploadProgress(percent)
  });
  \`\`\`

## 4. Consumo de Modelos (CRUDs)
- **Repositorios**: \`api.getRepositorios({ categoria, limit, offset })\`, \`api.updateRepositorio(id, data)\`, \`api.deleteRepositorio(id)\`.
- **Usuarios**: \`api.getUsuarios()\`, \`api.createUsuario(data)\`, \`api.updateUsuarioRol(id, rolId)\`, \`api.deleteUsuario(id)\`.
- **Roles**: \`api.getRoles()\`, \`api.syncRoles()\`.
- **Invitaciones**: \`api.createInvitacion({ correo, rol })\`, \`api.getInvitaciones()\`, \`api.deleteInvitacion(id)\`.
- **Configuraciones**: \`api.getConfiguraciones()\`, \`api.addCategoriaToConfig(id, 'Nueva')\`.
- **Comparativas**: \`api.getComparativas()\`, \`api.createComparativa(data)\`.
- **Gemini AI**: \`const res = await api.askGemini({ prompt: 'Analiza este resumen: ...' })\`.

## 5. Manejo de Errores
- Todas las peticiones fallidas lanzan \`ApiClientError\`.
- Puedes capturarlo así:
  \`\`\`ts
  import { ApiClientError } from './client/ApiClient';
  try {
    await api.login({ gmail, password });
  } catch (error) {
    if (error instanceof ApiClientError) {
      console.error(error.status, error.message, error.details);
      alert(error.message);
    }
  }
  \`\`\`
`.trim();
