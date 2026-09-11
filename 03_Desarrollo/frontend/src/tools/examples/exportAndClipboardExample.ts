import { extractDocument } from '../documentExtractor';
import { copyToClipboard, downloadAsFile, formatAsMarkdown } from '../exportTools';

/**
 * Ejemplo 4: Exportación de resultados a archivos (.txt, .json, .md) y copiado al portapapeles.
 */
export async function runExportAndClipboardExample(file: File): Promise<void> {
  console.log(`[Ejemplo 4] Extracción y exportación para: ${file.name}`);

  const result = await extractDocument(file);
  if (!result.success) {
    console.error('No se pudo extraer:', result.errorMessage);
    return;
  }

  // 1. Copiar texto al portapapeles
  const copied = await copyToClipboard(result.text);
  console.log(copied ? '📋 Texto copiado al portapapeles con éxito.' : '⚠️ No se pudo copiar.');

  // 2. Generar informe en formato Markdown
  const markdownReport = formatAsMarkdown(result);
  console.log('Reporte Markdown generado (muestra inicial):');
  console.log(markdownReport.slice(0, 300) + '...\n');

  // 3. Descargar en formato Markdown (.md)
  downloadAsFile(markdownReport, file.name, 'md');

  // 4. Descargar en formato JSON con metadatos completos (.json)
  downloadAsFile(result, file.name, 'json');
}
