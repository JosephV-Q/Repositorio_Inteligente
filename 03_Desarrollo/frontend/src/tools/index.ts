/**
 * Toolkit Unificado de Extracción y Procesamiento de Documentos Client-Side
 * Compatible con Vanilla JS/TS, React, Vue, Svelte, Next.js y Agentes de IA.
 */

// Tipos universales
export type * from './types';

// Fachada principal de extracción
export { extractDocument, countWords } from './documentExtractor';

// Procesamiento concurrente por lotes
export { extractBatch } from './batchExtractor';

// Fragmentación de texto (Chunking) para RAG y LLMs
export { chunkDocument, chunkPages } from './textChunker';

// Herramientas de exportación y portapapeles
export { copyToClipboard, downloadAsFile, formatAsMarkdown } from './exportTools';

// Esquemas de Function Calling para Agentes de IA
export { EXTRACT_DOCUMENT_TOOL_SCHEMA, CHUNK_DOCUMENT_TOOL_SCHEMA } from './aiToolDefinitions';

// Extractores base de bajo nivel
export { extractPdfText, type PdfExtractionResult } from '../pdfExtractor';
export { extractDocxContent, type DocxExtractionResult } from '../docxExtractor';
export { validateFile, detectFileSignature, formatFileSize, type SupportedFileType } from '../fileUtils';

// Módulo de ejemplos listos para transferir
export * as examples from './examples';
