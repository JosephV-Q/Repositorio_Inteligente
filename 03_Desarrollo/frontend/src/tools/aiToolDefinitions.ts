/**
 * Declaraciones de esquemas de funciones y herramientas (Function Calling / Tool Definitions)
 * compatibles con los principales SDKs de Inteligencia Artificial (OpenAI, Anthropic Claude,
 * Gemini y Vercel AI SDK).
 *
 * Permiten que un modelo LLM o Agente Autónomo invoque la extracción de documentos
 * como una herramienta (Tool Call).
 */

export const EXTRACT_DOCUMENT_TOOL_SCHEMA = {
  name: 'extract_document_content',
  description:
    'Extrae el texto completo, metadatos y contenido estructurado de un archivo de documento (PDF o DOCX) de manera local y segura.',
  parameters: {
    type: 'object',
    properties: {
      fileName: {
        type: 'string',
        description: 'Nombre o ruta del archivo con extensión (.pdf o .docx).',
      },
      chunkSize: {
        type: 'number',
        description:
          'Tamaño máximo en caracteres para fragmentar el texto (opcional, útil para embeddings o RAG).',
        default: 1500,
      },
      includePageHeaders: {
        type: 'boolean',
        description:
          'Indica si se deben incluir separadores de página como "--- Página X de Y ---".',
        default: true,
      },
    },
    required: ['fileName'],
  },
} as const;

export const CHUNK_DOCUMENT_TOOL_SCHEMA = {
  name: 'chunk_extracted_text',
  description:
    'Divide un texto largo de documento en fragmentos (chunks) con solapamiento optimizados para recuperación contextual (RAG) o contexto de LLM.',
  parameters: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'El texto del documento a fragmentar.',
      },
      chunkSize: {
        type: 'number',
        description: 'Cantidad máxima de caracteres por fragmento.',
        default: 1500,
      },
      chunkOverlap: {
        type: 'number',
        description: 'Cantidad de caracteres compartidos entre fragmentos consecutivos.',
        default: 200,
      },
    },
    required: ['text'],
  },
} as const;
