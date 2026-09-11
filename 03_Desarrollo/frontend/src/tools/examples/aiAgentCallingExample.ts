import { EXTRACT_DOCUMENT_TOOL_SCHEMA, CHUNK_DOCUMENT_TOOL_SCHEMA } from '../aiToolDefinitions';
import { extractDocument } from '../documentExtractor';
import { chunkDocument } from '../textChunker';

/**
 * Ejemplo 5: Simulación de integración en Agentes Autónomos de IA
 * (OpenAI Assistants, Gemini Tools, LangChain, Vercel AI SDK o Anthropic Tool Use).
 */

// Repositorio en memoria o mock para resolver archivos en el entorno de la app
export type FileResolver = (fileName: string) => Promise<ArrayBuffer>;

export async function executeAiToolCall(
  toolName: string,
  args: Record<string, unknown>,
  fileResolver: FileResolver
): Promise<string> {
  console.log(`🤖 Agente invocando Tool: "${toolName}" con argumentos:`, args);

  switch (toolName) {
    case EXTRACT_DOCUMENT_TOOL_SCHEMA.name: {
      const fileName = String(args.fileName || '');
      const includePageHeaders = args.includePageHeaders !== false;
      const buffer = await fileResolver(fileName);

      const extraction = await extractDocument(buffer, {
        fileName,
        includePageHeaders,
      });

      if (!extraction.success) {
        return JSON.stringify({
          status: 'error',
          message: extraction.errorMessage,
        });
      }

      return JSON.stringify({
        status: 'success',
        metadata: extraction.metadata,
        textSample: extraction.text.slice(0, 1000),
        totalChars: extraction.metadata.charCount,
        fullText: extraction.text,
      });
    }

    case CHUNK_DOCUMENT_TOOL_SCHEMA.name: {
      const text = String(args.text || '');
      const chunkSize = Number(args.chunkSize || 1500);
      const chunkOverlap = Number(args.chunkOverlap || 200);

      const chunks = chunkDocument(text, { chunkSize, chunkOverlap });

      return JSON.stringify({
        status: 'success',
        totalChunks: chunks.length,
        chunks,
      });
    }

    default:
      return JSON.stringify({
        status: 'error',
        message: `Herramienta desconocida: ${toolName}`,
      });
  }
}
