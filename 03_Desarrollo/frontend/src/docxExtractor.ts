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
