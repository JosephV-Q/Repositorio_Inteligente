# 🤖 Guía de Integración para Agentes de IA: Extracción de Texto Client-Side (PDF & DOCX)

> **Propósito:** Esta guía técnica está diseñada para que cualquier modelo de lenguaje o agente de desarrollo de software (Claude, GPT, Gemini, Cursor, Copilot, etc.) pueda replicar e integrar con éxito la arquitectura de extracción de texto 100% *client-side* (PDF y DOCX) en cualquier otro proyecto web (React, Vue, Svelte, Next.js o Vanilla TS), sin caer en los errores comunes de configuración ni de workers.

---

## 1. 📌 Visión General y Principios de Diseño

El objetivo de esta arquitectura es extraer texto e información estructurada de archivos **PDF** y **DOCX** directamente en el navegador del usuario (**Zero-Server / 100% Client-Side**), garantizando:
1. **Privacidad estricta:** Ningún documento viaja por red ni toca un servidor backend.
2. **Interfaz no bloqueante:** El procesamiento pesado (parsing y descompresión de PDFs) corre en un **Web Worker** secundario.
3. **Validación robusta:** Detección de tipos de archivo por **Magic Bytes** (firmas binarias) para evitar falsificaciones de extensión y manejar formatos no compatibles (como el `.doc` binario antiguo).
4. **Resiliencia ante edge cases:** Detección automática de PDFs escaneados (sin capa de texto) y compatibilidad con JavaScript moderno mediante polyfills.

---

## 2. 📦 Dependencias Requeridas

Instalar en el proyecto destino las siguientes librerías:

```bash
npm install pdfjs-dist mammoth
```

Y si usas TypeScript:
```bash
npm install -D typescript @types/node
```

### Tabla de Compatibilidad y Roles:
| Dependencia | Rol en el Proyecto | Consideración Crítica |
|---|---|---|
| `pdfjs-dist` (v4+ a v6+) | Extracción de texto y estructura de PDFs | Requiere configurar el archivo del Web Worker (`workerSrc`) y polyfill para `toHex`. |
| `mammoth` (v1.x) | Extracción de texto plano y HTML de DOCX | Funciona con `ArrayBuffer`. Solo soporta `.docx` (OpenXML), **no** el `.doc` binario antiguo de Word 97-2003. |

---

## 3. 🧩 Módulos Core (Código Reutilizable Listo para Usar)

Para integrar esta funcionalidad en cualquier proyecto, crea los siguientes tres módulos desacoplados:

### Módulo A: `src/utils/fileValidator.ts` (Inspección Binaria / Magic Bytes)

> **Regla para la IA:** Nunca confíes únicamente en `file.type` (MIME) o en la extensión del nombre del archivo. Los usuarios suelen renombrar extensiones o subir archivos vacíos/corruptos.

```typescript
export type SupportedFileType = 'pdf' | 'docx' | 'doc-unsupported' | 'unknown';

export interface FileValidationResult {
  isValid: boolean;
  fileType: SupportedFileType;
  errorMessage?: string;
}

/**
 * Inspecciona los primeros bytes binarios (Magic Bytes) para identificar
 * el tipo real del archivo.
 */
export function detectFileSignature(bytes: Uint8Array): SupportedFileType {
  if (bytes.length >= 4) {
    // PDF: '%PDF' -> 0x25 0x50 0x44 0x46
    if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
      return 'pdf';
    }

    // DOCX: Archivo ZIP 'PK..' -> 0x50 0x4B (0x03 0x04 o 0x05 0x06)
    if (bytes[0] === 0x50 && bytes[1] === 0x4B && (bytes[2] === 0x03 || bytes[2] === 0x05)) {
      return 'docx';
    }
  }

  if (bytes.length >= 8) {
    // DOC Antiguo (Word 97-2003 OLE2 / Compound File): D0 CF 11 E0 A1 B1 1A E1
    if (
      bytes[0] === 0xd0 &&
      bytes[1] === 0xcf &&
      bytes[2] === 0x11 &&
      bytes[3] === 0xe0 &&
      bytes[4] === 0xa1 &&
      bytes[5] === 0xb1 &&
      bytes[6] === 0x1a &&
      bytes[7] === 0xe1
    ) {
      return 'doc-unsupported';
    }
  }

  return 'unknown';
}

/**
 * Valida tamaño, firma y compatibilidad antes de procesar el archivo.
 */
export async function validateFile(file: File): Promise<FileValidationResult> {
  if (file.size === 0) {
    return {
      isValid: false,
      fileType: 'unknown',
      errorMessage: `El archivo "${file.name}" está vacío (0 bytes).`,
    };
  }

  const extension = file.name.split('.').pop()?.toLowerCase() || '';

  // Interceptar .doc explícito antes de procesar
  if (extension === 'doc') {
    return {
      isValid: false,
      fileType: 'doc-unsupported',
      errorMessage:
        'El formato .DOC (Word 97-2003) es un formato binario propietario (OLE2) que no se puede procesar en el navegador. Por favor conviértelo a .DOCX o .PDF.',
    };
  }

  // Leer cabecera binaria (primeros 16 bytes)
  const headerBuffer = await file.slice(0, 16).arrayBuffer();
  const signature = detectFileSignature(new Uint8Array(headerBuffer));

  if (signature === 'doc-unsupported') {
    return {
      isValid: false,
      fileType: 'doc-unsupported',
      errorMessage:
        'El archivo contiene una firma binaria de Word 97-2003 (.doc). Debe ser guardado en formato moderno .docx.',
    };
  }

  if (extension === 'pdf' && signature !== 'pdf') {
    return {
      isValid: false,
      fileType: 'unknown',
      errorMessage: 'El archivo tiene extensión .pdf pero su cabecera no es un PDF válido.',
    };
  }

  if (extension === 'docx' && signature !== 'docx') {
    return {
      isValid: false,
      fileType: 'unknown',
      errorMessage: 'El archivo tiene extensión .docx pero no es un paquete OpenXML/ZIP válido.',
    };
  }

  if (signature === 'pdf' || signature === 'docx') {
    return { isValid: true, fileType: signature };
  }

  return {
    isValid: false,
    fileType: 'unknown',
    errorMessage: `Formato no compatible (.${extension}). Solo se admiten archivos .pdf y .docx.`,
  };
}
```

---

### Módulo B: `src/utils/docxExtractor.ts` (Extracción de DOCX)

> **Regla para la IA:** `mammoth` ofrece `extractRawText` (ideal para LLMs, embeddings o búsqueda) y `convertToHtml` (ideal para previsualización enriquecida). Ejecútalos en paralelo con `Promise.all`.

```typescript
import mammoth from 'mammoth';

export interface DocxMessage {
  type: string;
  message: string;
}

export interface DocxExtractionResult {
  rawText: string;
  html: string;
  totalChars: number;
  messages: DocxMessage[];
  durationMs: number;
}

/**
 * Extrae texto plano y HTML de un documento .docx en el navegador.
 */
export async function extractDocxContent(arrayBuffer: ArrayBuffer): Promise<DocxExtractionResult> {
  const startTime = performance.now();

  // Ejecutar extracción de texto y conversión a HTML en paralelo
  const [rawTextResult, htmlResult] = await Promise.all([
    mammoth.extractRawText({ arrayBuffer }),
    mammoth.convertToHtml({ arrayBuffer }),
  ]);

  const endTime = performance.now();

  const allMessages: DocxMessage[] = [
    ...(rawTextResult.messages || []),
    ...(htmlResult.messages || []),
  ];

  const rawText = (rawTextResult.value || '').trim();
  const html = (htmlResult.value || '').trim();

  return {
    rawText,
    html,
    totalChars: rawText.length,
    messages: allMessages,
    durationMs: endTime - startTime,
  };
}
```

---

### Módulo C: `src/utils/pdfExtractor.ts` (Extracción de PDF con Web Worker)

> **Regla para la IA:** PDF.js **debe** tener su Worker configurado. Además, las versiones recientes de `pdfjs-dist` esperan `Uint8Array.prototype.toHex` (ES2024), por lo que se debe incluir un polyfill defensivo para evitar que falle en entornos que no lo tengan.

```typescript
import * as pdfjsLib from 'pdfjs-dist';

// 1. Polyfill defensivo para ES2024 Uint8Array.prototype.toHex
if (typeof Uint8Array !== 'undefined' && !('toHex' in Uint8Array.prototype)) {
  // @ts-expect-error Polyfill para navegadores sin soporte nativo de toHex
  Uint8Array.prototype.toHex = function () {
    return Array.from(this as Uint8Array)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  };
}

// 2. Configuración del Worker según el Bundler
// Opción Vite (Recomendada):
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

// Opción Webpack 5 / Next.js / ESM Estándar (Alternativa si no usas Vite):
// pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
//   'pdfjs-dist/build/pdf.worker.min.mjs',
//   import.meta.url
// ).toString();

// Opción CDN Fallback (si el bundler tiene problemas con workers locales):
// pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export interface PageResult {
  pageNumber: number;
  text: string;
  charCount: number;
}

export interface PdfExtractionResult {
  totalPages: number;
  pages: PageResult[];
  fullText: string;
  totalChars: number;
  isScannedOrEmpty: boolean;
  warningMessage?: string;
  durationMs: number;
}

export type PdfProgressCallback = (currentPage: number, totalPages: number) => void;

/**
 * Extrae texto página a página reconstruyendo saltos de línea y detectando documentos escaneados.
 */
export async function extractPdfText(
  arrayBuffer: ArrayBuffer,
  onProgress?: PdfProgressCallback
): Promise<PdfExtractionResult> {
  const startTime = performance.now();

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    useSystemFonts: true,
  });

  const pdfDocument = await loadingTask.promise;
  const totalPages = pdfDocument.numPages;

  const pages: PageResult[] = [];
  let combinedText = '';
  let nonWhitespaceChars = 0;

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = await pdfDocument.getPage(pageNum);
    const textContent = await page.getTextContent();

    // Reconstrucción del texto de la página respetando los saltos de línea (hasEOL)
    const pageStrings: string[] = [];
    for (const item of textContent.items) {
      if ('str' in item) {
        pageStrings.push(item.str + (item.hasEOL ? '\n' : ' '));
      }
    }

    const rawPageText = pageStrings.join('').replace(/[ \t]+/g, ' ').replace(/\n /g, '\n').trim();
    const pageCharCount = rawPageText.replace(/\s/g, '').length;
    nonWhitespaceChars += pageCharCount;

    pages.push({
      pageNumber: pageNum,
      text: rawPageText,
      charCount: rawPageText.length,
    });

    combinedText += `--- Página ${pageNum} de ${totalPages} ---\n${rawPageText}\n\n`;

    if (onProgress) {
      onProgress(pageNum, totalPages);
    }
  }

  const endTime = performance.now();

  // Heurística de detección de PDF escaneado (sin texto vectorial)
  const isScannedOrEmpty = totalPages > 0 && nonWhitespaceChars < Math.max(10, totalPages * 2);

  return {
    totalPages,
    pages,
    fullText: combinedText.trim(),
    totalChars: combinedText.trim().length,
    isScannedOrEmpty,
    warningMessage: isScannedOrEmpty
      ? 'Este documento parece ser una imagen escaneada o no contiene texto digital seleccionable.'
      : undefined,
    durationMs: endTime - startTime,
  };
}
```

---

## 4. 🚨 Trampas Críticas (Lo que las IAs suelen romper)

Cualquier IA que implemente esto debe tener en cuenta estas 5 trampas técnicas:

### ⚠️ Trampa 1: El Web Worker de PDF.js
- **Error típico:** `Setting up fake worker failed: "Cannot read properties of undefined (reading 'Worker')"` o errores de CORS si se intenta cargar un worker desde un CDN en dominios con políticas estrictas.
- **Solución correcta:** 
  - En **Vite**: Usar la sintaxis nativa `import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';`. Vite emite el worker en un chunk estático independiente.
  - En **Next.js / Webpack**: Importar con `new URL('...', import.meta.url)`.

### ⚠️ Trampa 2: `toHex is not a function`
- **Error típico:** `TypeError: Uint8Array.prototype.toHex is not a function` al invocar `pdfjsLib.getDocument`.
- **Causa:** `pdfjs-dist` (versiones 4.x en adelante) utiliza métodos de la especificación ECMAScript 2024 que aún no están disponibles en todos los navegadores o entornos de prueba.
- **Solución correcta:** Incluir el polyfill presentado arriba antes de la inicialización de `pdfjsLib`.

### ⚠️ Trampa 3: Texto de PDF compactado en una sola línea
- **Error típico:** Concatenar los `item.str` directamente (`textContent.items.map(i => i.str).join('')`), lo cual pega palabras y elimina párrafos.
- **Solución correcta:** Evaluar el flag booleano `item.hasEOL` proporcionado por PDF.js:
  ```typescript
  item.str + (item.hasEOL ? '\n' : ' ')
  ```

### ⚠️ Trampa 4: Confundir `.doc` con `.docx`
- **Error típico:** Tratar de procesar archivos `.doc` con `mammoth`. Mammoth arrojará: `Could not find main document part` o `Can't find end of central directory : is this a zipfile?`.
- **Causa:** `.doc` es un formato binario estructurado OLE2 (Compound File), mientras que `.docx` es un paquete ZIP con XMLs abiertos.
- **Solución correcta:** Validar Magic Bytes y alertar al usuario antes de enviar el buffer a `mammoth`.

### ⚠️ Trampa 5: Intentar ejecutar en SSR (Server-Side Rendering)
- **Error típico:** `window is not defined` o `DOMParser is not defined` al compilar en Next.js o Nuxt.
- **Solución correcta:** Encapsular la ejecución únicamente en el cliente (ej. dentro de `useEffect` en React, `onMounted` en Vue, o dynamic import con `ssr: false`).

---

## 5. 🛠️ Toolkit Modular de Implementación (`src/tools/`)

Para máxima facilidad de adopción, todo el sistema de conversión se encuentra recopilado y expuesto a través del directorio `src/tools/`:

| Módulo | Función / Tool | Propósito |
|---|---|---|
| [`documentExtractor.ts`](file:///C:/Users/tsurematsu/Desktop/lab-extraccion-texto/src/tools/documentExtractor.ts) | `extractDocument(input, options)` | **Fachada unificada**: Recibe `File`, `Blob` o `ArrayBuffer`, valida por magic bytes, rutea a PDF o DOCX y devuelve texto, HTML, conteo de palabras y métricas estructuradas. |
| [`batchExtractor.ts`](file:///C:/Users/tsurematsu/Desktop/lab-extraccion-texto/src/tools/batchExtractor.ts) | `extractBatch(files, options)` | **Procesamiento por lote**: Procesa múltiples archivos con límite de concurrencia para proteger la memoria del navegador y aísla fallos individuales. |
| [`textChunker.ts`](file:///C:/Users/tsurematsu/Desktop/lab-extraccion-texto/src/tools/textChunker.ts) | `chunkDocument(text, options)`<br>`chunkPages(pages, options)` | **Preparador para IA / RAG**: Divide el texto en fragmentos con solapamiento (*overlap*), preservación de párrafos y conteo aproximado de tokens. |
| [`exportTools.ts`](file:///C:/Users/tsurematsu/Desktop/lab-extraccion-texto/src/tools/exportTools.ts) | `downloadAsFile(content, name, format)`<br>`copyToClipboard(text)`<br>`formatAsMarkdown(result)` | **Utilidades de salida**: Exporta a `.txt`, `.json`, `.html` o `.md`, genera descargas directas y copia al portapapeles con fallback. |
| [`aiToolDefinitions.ts`](file:///C:/Users/tsurematsu/Desktop/lab-extraccion-texto/src/tools/aiToolDefinitions.ts) | `EXTRACT_DOCUMENT_TOOL_SCHEMA`<br>`CHUNK_DOCUMENT_TOOL_SCHEMA` | **Esquemas JSON Function Calling**: Compatibles con OpenAI, Gemini, Claude y Vercel AI SDK para que agentes invoquen la herramienta. |
| [`index.ts`](file:///C:/Users/tsurematsu/Desktop/lab-extraccion-texto/src/tools/index.ts) | Barrel Export | Exporta todas las herramientas, tipos e interfaces con un solo `import { ... } from './tools'`. |

### Ejemplo Rápido de Uso del Toolkit:

```typescript
import { 
  extractDocument, 
  extractBatch, 
  chunkDocument, 
  downloadAsFile 
} from './tools';

// 1. Extraer un único documento (PDF o DOCX indistintamente)
const result = await extractDocument(file, {
  onPageProgress: (current, total) => console.log(`Procesando página ${current}/${total}`)
});

if (result.success) {
  console.log(`Extraídas ${result.metadata.wordCount} palabras en ${result.metadata.durationMs}ms`);
  
  // 2. Fragmentar para un modelo LLM o base vectorial (RAG)
  const chunks = chunkDocument(result.text, { chunkSize: 1000, chunkOverlap: 150 });
  console.log(`Generados ${chunks.length} chunks listos para embeddings.`);

  // 3. Descargar el reporte completo
  downloadAsFile(result, file.name, 'json');
}

// 4. O procesar un lote completo de archivos con concurrencia máxima de 2
const batch = await extractBatch(fileList, {
  concurrency: 2,
  onProgress: (done, total, current) => console.log(`[${done}/${total}] Procesado ${current.name}`)
});
```

---

## 6. 💡 Ejemplo de Integración en React (Custom Hook)

Si el proyecto destino utiliza React, esta es la forma canónica de consumir las herramientas:

```tsx
// useDocumentExtractor.ts
import { useState, useCallback } from 'react';
import { extractDocument, type UnifiedExtractionResult } from './tools';

export function useDocumentExtractor() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UnifiedExtractionResult | null>(null);

  const processFile = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    setProgress(null);
    setResult(null);

    try {
      const res = await extractDocument(file, {
        onPageProgress: (cur, tot) => setProgress({ current: cur, total: tot })
      });

      if (!res.success) {
        throw new Error(res.errorMessage || 'Error en la extracción.');
      }

      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Error procesando el documento.');
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }, []);

  return { processFile, loading, progress, error, result };
}
```

---

## 7. 📝 Prompt Maestro para Pasar a Otra IA

Copia y pega el siguiente bloque a cualquier otra IA para encomendarle la integración en tu proyecto:

````markdown
Actúa como un Desarrollador Frontend Senior experto en procesamiento client-side de documentos.

Quiero implementar extracción de texto 100% en el navegador (sin llamadas a backend) para archivos PDF y DOCX en este proyecto.

Sigue rigurosamente estas especificaciones técnicas tomadas de la arquitectura de referencia:

1. **Dependencias:**
   - Usa `pdfjs-dist` para PDFs y `mammoth` para DOCX.
2. **Validación de Archivos y Magic Bytes:**
   - Nunca confíes únicamente en extensiones de archivo o MIME types.
   - Lee los primeros 16 bytes de cada archivo para verificar la firma binaria real:
     - PDF: `%PDF` (`0x25 0x50 0x44 0x46`)
     - DOCX: `PK..` (`0x50 0x4B 0x03 0x04`)
     - DOC antiguo: `0xD0 0xCF 0x11 0xE0 0xA1 0xB1 0x1A 0xE1` (Intercéptalo y explica al usuario que los archivos .doc antiguos de Word 97-2003 son binarios OLE2 y no son compatibles en el navegador; debe convertirlos a .docx o .pdf).
3. **Manejo de PDF (pdfjs-dist):**
   - Configura el Web Worker de forma segura para nuestro bundler (ej. con `?url` en Vite o `new URL(..., import.meta.url)`).
   - Incluye el polyfill para `Uint8Array.prototype.toHex` para prevenir errores de compatibilidad en navegadores.
   - Itera página por página usando `page.getTextContent()`.
   - Reconstruye el texto respetando los saltos de línea con `item.hasEOL`.
   - Incluye detección heurística de PDFs escaneados: si el conteo de caracteres no vacíos es extremadamente bajo (< 10 caracteres o < 2 por página), emite una advertencia de "PDF escaneado sin capa de texto seleccionable".
   - Soporta un callback de progreso `(currentPage, totalPages)`.
4. **Manejo de DOCX (mammoth):**
   - Ejecuta en paralelo tanto `mammoth.extractRawText({ arrayBuffer })` como `mammoth.convertToHtml({ arrayBuffer })`.
   - Devuelve tanto el texto plano como el HTML enriquecido junto con las advertencias del parser.
5. **Métricas:**
   - Mide el tiempo de extracción con `performance.now()`.
6. **Desacoplamiento:**
   - Separa la lógica en utilidades puras de TypeScript (`fileValidator.ts`, `pdfExtractor.ts`, `docxExtractor.ts`) antes de conectarlas a la UI o hooks del framework actual.
````
