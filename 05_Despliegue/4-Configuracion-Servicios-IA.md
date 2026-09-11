# Despliegue 04 — Configuración de servicios de IA

## 1. Servicio utilizado

La integración usa `@google/genai` y la variable `GEMINI_API_KEY` (también se admite `GOOGLE_API_KEY`). El modelo generativo por defecto es `GEMINI_DEFAULT_MODEL` o `gemini-3.6-flash`. El modelo de embeddings es `GEMINI_EMBEDDING_MODEL` o `gemini-embedding-001`.

## 2. Embeddings

`generateEmbedding()` solicita una salida de 768 dimensiones. Esta dimensión debe coincidir con `vector(768)` e índices HNSW de Neon; cambiarla exige migración de base y revisión de consultas.

## 3. Configuración y prueba

```env
GEMINI_API_KEY=...
GEMINI_DEFAULT_MODEL=gemini-3.6-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
```

Validar con:

```bash
pnpm test:gemini
pnpm test:api
```

El endpoint `GET /api/gemini/status` permite comprobar configuración sin revelar la clave.

## 4. Flujo de análisis

El frontend extrae texto de PDF/DOCX/TXT y el backend recibe el texto en `/api/repositorios/procesar-texto` o en los servicios de análisis. Gemini devuelve metadatos como categoría, descripción, resumen, palabras clave y contexto. El embedding se genera por separado y se persiste en Neon.

## 5. Operación responsable

Controlar cuota, latencia y errores del proveedor. No enviar secretos ni datos innecesarios en prompts. Usar documentos anonimizados en pruebas. Si Gemini no está disponible, informar el error y mantener operativas las funciones no dependientes de IA.
