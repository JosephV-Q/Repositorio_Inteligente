import type { TextChunk, ChunkOptions, PageData } from './types';

/**
 * Divide un texto extenso en fragmentos (chunks) optimizados para consumo
 * por Modelos de Lenguaje (LLMs), Embeddings o sistemas RAG.
 *
 * @param text Texto completo a fragmentar
 * @param options Configuración de tamaño, solapamiento y separación de párrafos
 * @returns Lista de fragmentos estructurados con metadatos
 */
export function chunkDocument(text: string, options: ChunkOptions = {}): TextChunk[] {
  const chunkSize = options.chunkSize || 1500;
  const chunkOverlap = Math.min(options.chunkOverlap || 200, Math.floor(chunkSize / 2));
  const preserveParagraphs = options.preserveParagraphs !== false;

  if (!text || text.trim().length === 0) {
    return [];
  }

  const chunks: TextChunk[] = [];
  const cleanText = text.trim();

  if (preserveParagraphs) {
    // Dividir por bloques de párrafos
    const rawParagraphs = cleanText.split(/\n\s*\n/);
    let currentChunkText = '';
    let chunkIndex = 0;

    for (const paragraph of rawParagraphs) {
      const trimmedPara = paragraph.trim();
      if (!trimmedPara) continue;

      if (currentChunkText.length + trimmedPara.length + 2 <= chunkSize) {
        currentChunkText += (currentChunkText ? '\n\n' : '') + trimmedPara;
      } else {
        if (currentChunkText) {
          chunks.push({
            index: chunkIndex++,
            text: currentChunkText,
            charCount: currentChunkText.length,
            approximateTokens: Math.ceil(currentChunkText.length / 4),
          });
        }

        // Si el párrafo individual excede el tamaño máximo, forzar corte interno
        if (trimmedPara.length > chunkSize) {
          let start = 0;
          while (start < trimmedPara.length) {
            const end = Math.min(start + chunkSize, trimmedPara.length);
            const slice = trimmedPara.slice(start, end).trim();
            if (slice) {
              chunks.push({
                index: chunkIndex++,
                text: slice,
                charCount: slice.length,
                approximateTokens: Math.ceil(slice.length / 4),
              });
            }
            start += chunkSize - chunkOverlap;
          }
          currentChunkText = '';
        } else {
          currentChunkText = trimmedPara;
        }
      }
    }

    if (currentChunkText) {
      chunks.push({
        index: chunkIndex++,
        text: currentChunkText,
        charCount: currentChunkText.length,
        approximateTokens: Math.ceil(currentChunkText.length / 4),
      });
    }

    return chunks;
  }

  // Fragmentación por desplazamiento de ventana deslizante
  let start = 0;
  let chunkIndex = 0;

  while (start < cleanText.length) {
    const end = Math.min(start + chunkSize, cleanText.length);
    const chunkSlice = cleanText.slice(start, end).trim();

    if (chunkSlice) {
      chunks.push({
        index: chunkIndex++,
        text: chunkSlice,
        charCount: chunkSlice.length,
        approximateTokens: Math.ceil(chunkSlice.length / 4),
      });
    }

    start += chunkSize - chunkOverlap;
  }

  return chunks;
}

/**
 * Fragmenta el texto manteniendo la asociación directa con el número de página de origen.
 */
export function chunkPages(pages: PageData[], options: ChunkOptions = {}): TextChunk[] {
  const result: TextChunk[] = [];
  let globalIndex = 0;

  for (const page of pages) {
    const pageChunks = chunkDocument(page.text, options);
    for (const chunk of pageChunks) {
      result.push({
        ...chunk,
        index: globalIndex++,
        pageNumber: page.pageNumber,
      });
    }
  }

  return result;
}
