import { extractPdfText, type PdfExtractionResult } from '../pdfExtractor';
import { extractDocxContent, type DocxExtractionResult } from '../docxExtractor';
import { validateFile, detectFileSignature, formatFileSize, type SupportedFileType } from '../fileUtils';
import type { UnifiedExtractionResult, ExtractionOptions, SupportedDocType } from './types';

/**
 * Cuenta el número de palabras en un texto de manera eficiente.
 */
export function countWords(text: string): number {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Herramienta principal (Facade): Extrae texto, metadatos y formato de cualquier
 * archivo PDF o DOCX directamente en el navegador del cliente.
 *
 * @param input Objeto File, Blob o ArrayBuffer del documento
 * @param options Opciones de extracción (progreso, cabeceras, nombre)
 * @returns Promesa con el resultado unificado de extracción
 */
export async function extractDocument(
  input: File | Blob | ArrayBuffer,
  options: ExtractionOptions = {}
): Promise<UnifiedExtractionResult> {
  const startTime = performance.now();
  const warnings: string[] = [];

  try {
    let arrayBuffer: ArrayBuffer;
    let fileName = options.fileName || 'documento';
    let fileSizeBytes = 0;
    let detectedType: SupportedDocType = 'unknown';

    // 1. Normalizar entrada a ArrayBuffer y obtener metadatos base
    if (input instanceof File) {
      fileName = input.name;
      fileSizeBytes = input.size;

      // Validación preventiva con magic bytes
      const validation = await validateFile(input);
      if (!validation.isValid) {
        return createErrorResult(
          fileName,
          validation.fileType,
          fileSizeBytes,
          validation.errorMessage || 'Archivo no válido para extracción.',
          performance.now() - startTime
        );
      }
      detectedType = validation.fileType;
      arrayBuffer = await input.arrayBuffer();
    } else if (input instanceof Blob) {
      fileSizeBytes = input.size;
      arrayBuffer = await input.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer.slice(0, 16));
      const sig = detectFileSignature(bytes);
      detectedType = sig;
    } else if (input instanceof ArrayBuffer) {
      arrayBuffer = input;
      fileSizeBytes = input.byteLength;
      const bytes = new Uint8Array(arrayBuffer.slice(0, 16));
      const sig = detectFileSignature(bytes);
      detectedType = sig;
    } else {
      throw new Error('Tipo de entrada inválido. Se esperaba File, Blob o ArrayBuffer.');
    }

    // Si no fue validado previamente por objeto File, verificar la firma binaria
    if (detectedType === 'doc-unsupported') {
      return createErrorResult(
        fileName,
        'doc-unsupported',
        fileSizeBytes,
        'El formato .DOC (Word 97-2003 OLE2) no es compatible en el navegador. Conviértalo a .DOCX o .PDF.',
        performance.now() - startTime
      );
    }

    if (detectedType === 'unknown') {
      return createErrorResult(
        fileName,
        'unknown',
        fileSizeBytes,
        'La firma binaria del archivo no corresponde a un PDF ni a un DOCX compatible.',
        performance.now() - startTime
      );
    }

    // 2. Extracción según el formato identificado
    if (detectedType === 'pdf') {
      const pdfRes: PdfExtractionResult = await extractPdfText(
        arrayBuffer,
        options.onPageProgress
      );

      if (pdfRes.warningMessage) {
        warnings.push(pdfRes.warningMessage);
      }

      // Reconstruir texto con o sin cabeceras de página
      let finalFullText = pdfRes.fullText;
      if (options.includePageHeaders === false) {
        finalFullText = pdfRes.pages.map((p) => p.text).join('\n\n').trim();
      }

      const durationMs = performance.now() - startTime;
      const charCount = finalFullText.length;
      const wordCount = countWords(finalFullText);

      return {
        success: true,
        text: finalFullText,
        metadata: {
          fileName,
          fileType: 'pdf',
          fileSizeBytes,
          fileSizeFormatted: formatFileSize(fileSizeBytes),
          charCount,
          wordCount,
          pageCount: pdfRes.totalPages,
          durationMs,
          isScannedOrEmpty: pdfRes.isScannedOrEmpty,
        },
        pages: pdfRes.pages,
        warnings,
      };
    }

    if (detectedType === 'docx') {
      const docxRes: DocxExtractionResult = await extractDocxContent(arrayBuffer);

      if (docxRes.messages && docxRes.messages.length > 0) {
        for (const msg of docxRes.messages) {
          warnings.push(`[${msg.type}] ${msg.message}`);
        }
      }

      const durationMs = performance.now() - startTime;
      const charCount = docxRes.totalChars;
      const wordCount = countWords(docxRes.rawText);

      return {
        success: true,
        text: docxRes.rawText,
        html: docxRes.html,
        metadata: {
          fileName,
          fileType: 'docx',
          fileSizeBytes,
          fileSizeFormatted: formatFileSize(fileSizeBytes),
          charCount,
          wordCount,
          durationMs,
        },
        warnings,
      };
    }

    if (detectedType === 'txt') {
      const textDecoder = new TextDecoder('utf-8');
      const text = textDecoder.decode(arrayBuffer).trim();
      const durationMs = performance.now() - startTime;
      const charCount = text.length;
      const wordCount = countWords(text);

      return {
        success: true,
        text,
        metadata: {
          fileName,
          fileType: 'txt',
          fileSizeBytes,
          fileSizeFormatted: formatFileSize(fileSizeBytes),
          charCount,
          wordCount,
          durationMs,
        },
        warnings,
      };
    }

    throw new Error(`Tipo de archivo no manejado: ${detectedType}`);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const durationMs = performance.now() - startTime;
    return createErrorResult(
      options.fileName || 'documento',
      'unknown',
      0,
      `Error durante la extracción: ${errorMsg}`,
      durationMs
    );
  }
}

function createErrorResult(
  fileName: string,
  fileType: SupportedFileType,
  fileSizeBytes: number,
  errorMessage: string,
  durationMs: number
): UnifiedExtractionResult {
  return {
    success: false,
    text: '',
    metadata: {
      fileName,
      fileType,
      fileSizeBytes,
      fileSizeFormatted: formatFileSize(fileSizeBytes),
      charCount: 0,
      wordCount: 0,
      durationMs,
    },
    warnings: [],
    errorMessage,
  };
}
