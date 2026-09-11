import { extractDocument } from '../documentExtractor';
import { chunkDocument, chunkPages } from '../textChunker';
import type { TextChunk } from '../types';

export interface DocumentChunkPayload {
  chunkIndex: number;
  fileName: string;
  pageNumber?: number;
  content: string;
  charCount: number;
  estimatedTokens: number;
}

/**
 * Ejemplo 3: Extracción y fragmentación (Chunking) para pipelines de RAG
 * (Retrieval-Augmented Generation), vector databases (Pinecone, Chroma) o prompts de LLM.
 */
export async function runRagChunkingExample(file: File): Promise<DocumentChunkPayload[]> {
  console.log(`[Ejemplo 3] Extrayendo y particionando: ${file.name}`);

  const extraction = await extractDocument(file);
  if (!extraction.success) {
    throw new Error(`Falló la extracción: ${extraction.errorMessage}`);
  }

  let rawChunks: TextChunk[] = [];

  // Si es un PDF y tenemos las páginas separadas, podemos fragmentar manteniendo el número de página
  if (extraction.pages && extraction.pages.length > 0) {
    rawChunks = chunkPages(extraction.pages, {
      chunkSize: 1200,
      chunkOverlap: 200,
      preserveParagraphs: true,
    });
  } else {
    // Si es DOCX o texto continuo
    rawChunks = chunkDocument(extraction.text, {
      chunkSize: 1200,
      chunkOverlap: 200,
      preserveParagraphs: true,
    });
  }

  // Preparar payloads listos para inserción en base vectorial
  const payloads: DocumentChunkPayload[] = rawChunks.map((chunk) => ({
    chunkIndex: chunk.index,
    fileName: extraction.metadata.fileName,
    pageNumber: chunk.pageNumber,
    content: chunk.text,
    charCount: chunk.charCount,
    estimatedTokens: chunk.approximateTokens,
  }));

  console.log(`✅ Generados ${payloads.length} fragmentos optimizados para búsqueda vectorial.`);
  if (payloads.length > 0) {
    console.log('Muestra del primer chunk:', payloads[0]);
  }

  return payloads;
}
