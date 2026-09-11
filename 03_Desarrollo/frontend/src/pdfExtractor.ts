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

// 2. Configuración del Worker en Vite
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

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
        pageStrings.push((item as any).str + ((item as any).hasEOL ? '\n' : ' '));
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
