import type { UnifiedExtractionResult, ExportFormat } from './types';

/**
 * Copia una cadena de texto al portapapeles del sistema utilizando
 * la API moderna navigator.clipboard con fallback para entornos legados.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    // Fallback con elemento textarea temporal
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch {
    return false;
  }
}

/**
 * Genera y descarga un archivo en el navegador del usuario a partir de contenido en memoria.
 *
 * @param content Contenido de texto o estructura de datos
 * @param fileName Nombre base del archivo descargado
 * @param format Formato de salida ('txt' | 'json' | 'html' | 'md')
 */
export function downloadAsFile(
  content: string | object,
  fileName: string,
  format: ExportFormat = 'txt'
): void {
  let mimeType = 'text/plain;charset=utf-8';
  let stringContent = '';
  const cleanBaseName = fileName.replace(/\.[^/.]+$/, '');

  switch (format) {
    case 'json':
      mimeType = 'application/json;charset=utf-8';
      stringContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
      break;
    case 'html':
      mimeType = 'text/html;charset=utf-8';
      stringContent = typeof content === 'string' ? content : String(content);
      break;
    case 'md':
      mimeType = 'text/markdown;charset=utf-8';
      stringContent = typeof content === 'string' ? content : String(content);
      break;
    case 'txt':
    default:
      mimeType = 'text/plain;charset=utf-8';
      stringContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
      break;
  }

  const blob = new Blob([stringContent], { type: mimeType });
  const downloadUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = downloadUrl;
  anchor.download = `${cleanBaseName}_extraido.${format}`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  setTimeout(() => {
    URL.revokeObjectURL(downloadUrl);
  }, 100);
}

/**
 * Convierte el resultado unificado de extracción en un informe legible en Markdown.
 */
export function formatAsMarkdown(result: UnifiedExtractionResult): string {
  const { metadata, text, warnings } = result;

  let md = `# Extracción de Documento: ${metadata.fileName}\n\n`;
  md += `| Métrica | Valor |\n`;
  md += `|---|---|\n`;
  md += `| **Tipo de archivo** | ${metadata.fileType.toUpperCase()} |\n`;
  md += `| **Tamaño original** | ${metadata.fileSizeFormatted} |\n`;
  md += `| **Total Caracteres** | ${metadata.charCount.toLocaleString()} |\n`;
  md += `| **Total Palabras** | ${metadata.wordCount.toLocaleString()} |\n`;
  if (metadata.pageCount) {
    md += `| **Total Páginas** | ${metadata.pageCount} |\n`;
  }
  md += `| **Tiempo de extracción** | ${metadata.durationMs.toFixed(1)} ms |\n\n`;

  if (warnings.length > 0) {
    md += `> ⚠️ **Advertencias:**\n`;
    for (const w of warnings) {
      md += `> - ${w}\n`;
    }
    md += `\n---\n\n`;
  }

  md += `## Contenido Extraído\n\n`;
  md += text;

  return md;
}
