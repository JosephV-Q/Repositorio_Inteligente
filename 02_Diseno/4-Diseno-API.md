# DISEÑO 04 — Diseño de API y Servicios
## Sistema Inteligente de Gestión y Análisis Documental (SIGAD)

*API REST expuesta por el backend FastAPI (Diseño 01). Todas las rutas, salvo `/auth/login`, requieren cabecera `Authorization: Bearer <JWT>`. Formato de intercambio: JSON.*

## 1. Autenticación

| Método | Ruta | Descripción | RF |
|---|---|---|---|
| POST | `/auth/login` | Autentica usuario y devuelve JWT | RF-01 |
| GET | `/auth/me` | Devuelve datos del usuario autenticado (incluye rol) | RF-02 |

**POST /auth/login**
```json
// Request
{ "email": "usuario@correo.com", "password": "••••••" }
// Response 200
{ "token": "eyJhbGciOi...", "usuario": { "id": "uuid", "nombre": "...", "rol": "usuario" } }
// Response 401
{ "error": "Credenciales inválidas" }
```

## 2. Usuarios (solo Administrador)

| Método | Ruta | Descripción | RF |
|---|---|---|---|
| GET | `/usuarios` | Lista usuarios | RF-02 |
| POST | `/usuarios` | Crea usuario | RF-02 |
| PATCH | `/usuarios/{id}` | Edita/activa/desactiva usuario | RF-02 |

## 3. Repositorios

| Método | Ruta | Descripción | RF | Rol requerido |
|---|---|---|---|---|
| GET | `/repositorios` | Lista repositorios del usuario | RF-03 | Cualquiera autenticado |
| POST | `/repositorios` | Crea repositorio | RF-03 | Cualquiera autenticado |
| PATCH | `/repositorios/{id}` | Edita repositorio | RF-04 | Administrador |
| DELETE | `/repositorios/{id}` | Elimina repositorio y sus documentos | RF-04 | Administrador |

**POST /repositorios**
```json
// Request
{ "nombre": "Contratos 2026", "descripcion": "Repositorio de contratos vigentes" }
// Response 201
{ "id": "uuid", "nombre": "Contratos 2026", "fecha_creacion": "2026-09-08T10:00:00Z" }
// Response 400 (RN validación nombre vacío/duplicado)
{ "error": "El nombre del repositorio es obligatorio" }
```

## 4. Documentos

| Método | Ruta | Descripción | RF | Errores relevantes |
|---|---|---|---|---|
| POST | `/repositorios/{id}/documentos` | Carga archivo (multipart/form-data) | RF-05 | 400 formato inválido (RN-01), 413 tamaño excedido (RN-02) |
| GET | `/repositorios/{id}/documentos` | Lista documentos del repositorio | RF-06 | — |
| GET | `/documentos/{id}` | Detalle: estado, categoría, resumen, datos extraídos | RF-06, RF-11, RF-12 | 404 |
| GET | `/documentos/{id}/descargar` | Descarga el archivo original | RF-07 | 404 |
| DELETE | `/documentos/{id}` | Elimina documento y sus datos derivados | RF-08 | 404 |
| GET | `/documentos/{id}/bitacora` | Historial de eventos del documento | RF-17 | 404 |

**POST /repositorios/{id}/documentos**
```json
// Response 201
{
  "id": "uuid",
  "nombre_archivo": "contrato_arrendamiento.pdf",
  "estado": "cargado",
  "fecha_carga": "2026-09-08T10:05:00Z"
}
```

**GET /documentos/{id}** (documento procesado)
```json
{
  "id": "uuid",
  "nombre_archivo": "contrato_arrendamiento.pdf",
  "estado": "procesado",
  "categorias": [{ "nombre": "Contrato", "confianza": 0.94 }],
  "resumen": "Contrato de arrendamiento entre las partes X y Y por un plazo de 12 meses...",
  "extraccion": {
    "tipo_documento": "contrato",
    "datos": { "partes": ["X", "Y"], "fecha_inicio": "2026-01-01", "plazo_meses": 12 }
  }
}
```

## 5. Búsqueda y consulta en lenguaje natural

| Método | Ruta | Descripción | RF |
|---|---|---|---|
| GET | `/repositorios/{id}/buscar?q={texto}` | Búsqueda semántica de fragmentos | RF-13 |
| POST | `/repositorios/{id}/preguntar` | Consulta en lenguaje natural (RAG) | RF-14 |

**POST /repositorios/{id}/preguntar**
```json
// Request
{ "pregunta": "¿Cuál es el plazo del contrato de arrendamiento?" }
// Response 200
{
  "respuesta": "El plazo es de 12 meses, según el contrato de arrendamiento cargado el 08/09/2026.",
  "fuentes": [{ "documento_id": "uuid", "nombre_archivo": "contrato_arrendamiento.pdf" }]
}
// Response 200 (sin evidencia, RN-08)
{ "respuesta": "No se encontró información relacionada en este repositorio.", "fuentes": [] }
```

## 6. Dashboard

| Método | Ruta | Descripción | RF |
|---|---|---|---|
| GET | `/repositorios/{id}/dashboard` | Indicadores agregados | RF-15 |

```json
{
  "total_documentos": 42,
  "por_estado": { "cargado": 2, "procesando": 1, "procesado": 37, "error": 2 },
  "por_categoria": [{ "categoria": "Contrato", "cantidad": 15 }, { "categoria": "Factura", "cantidad": 20 }, { "categoria": "Informe", "cantidad": 7 }]
}
```

## 7. Códigos de error estándar (todas las rutas)

| Código | Significado | Casos de uso |
|---|---|---|
| 400 | Solicitud inválida (validación de negocio) | RN-01, RN-02, campos vacíos |
| 401 | No autenticado o token inválido/expirado | RF-01 |
| 403 | Autenticado pero sin permiso para la acción | RF-02, RN-06 |
| 404 | Recurso no encontrado | Cualquier `{id}` inexistente |
| 413 | Archivo excede el tamaño máximo | RN-02 |
| 422 | Error de procesamiento IA (ver estado "error" del documento) | RN-07 |
| 500 | Error interno no controlado | — |

---
*Estos contratos de API son la base para el Manual Técnico (fase Desarrollo) y para los casos de prueba (fase Pruebas).*
