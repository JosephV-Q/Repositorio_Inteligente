export type SupportedDocType = 'pdf' | 'docx' | 'txt' | 'unknown' | 'doc-unsupported';

export interface DocumentMetadata {
  fileName: string;
  fileType: SupportedDocType;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  charCount: number;
  wordCount: number;
  pageCount?: number;
  durationMs: number;
  isScannedOrEmpty?: boolean;
}

export interface PageData {
  pageNumber: number;
  text: string;
  charCount: number;
}

export interface UnifiedExtractionResult {
  success: boolean;
  text: string;
  html?: string;
  metadata: DocumentMetadata;
  pages?: PageData[];
  warnings: string[];
  errorMessage?: string;
}

export interface ExtractionOptions {
  /** Callback para monitorear el progreso de extracción página por página (principalmente PDF) */
  onPageProgress?: (currentPage: number, totalPages: number) => void;
  /** Si es true, incluye los saltos de cabecera '--- Página X de Y ---' en el texto unificado */
  includePageHeaders?: boolean;
  /** Nombre opcional del archivo en caso de pasar directamente un ArrayBuffer sin File */
  fileName?: string;
}

export interface TextChunk {
  index: number;
  text: string;
  charCount: number;
  approximateTokens: number;
  pageNumber?: number;
}

export interface ChunkOptions {
  /** Tamaño máximo objetivo por fragmento en caracteres (por defecto 1500) */
  chunkSize?: number;
  /** Superposición entre fragmentos en caracteres (por defecto 200) */
  chunkOverlap?: number;
  /** Si debe intentar dividir por saltos de párrafo '\n\n' en vez de cortar arbitrariamente */
  preserveParagraphs?: boolean;
}

export interface BatchItemResult {
  file: File;
  result?: UnifiedExtractionResult;
  error?: string;
}

export interface BatchExtractionResult {
  totalFiles: number;
  successCount: number;
  failedCount: number;
  durationMs: number;
  results: BatchItemResult[];
}

export interface BatchOptions {
  /** Número máximo de archivos a procesar concurrentemente (por defecto: 2 para evitar picos de memoria) */
  concurrency?: number;
  /** Callback global de progreso: (completados, total, archivoActual) */
  onProgress?: (completed: number, total: number, currentFile: File) => void;
  /** Opciones individuales de extracción para cada archivo */
  itemOptions?: ExtractionOptions;
}

export type ExportFormat = 'txt' | 'json' | 'html' | 'md';
