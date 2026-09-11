import { extractDocument } from '../documentExtractor';
import type { UnifiedExtractionResult } from '../types';

/**
 * Ejemplo 1: Extracción básica de un solo documento (PDF o DOCX indistintamente).
 * La función detecta automáticamente el formato por Magic Bytes y ejecuta el motor correspondiente.
 */
export async function runSingleExtractionExample(file: File): Promise<UnifiedExtractionResult> {
  console.log(`[Ejemplo 1] Iniciando extracción para: ${file.name}`);

  const result = await extractDocument(file, {
    // Callback para PDFs con múltiples páginas
    onPageProgress: (currentPage, totalPages) => {
      console.log(`Página procesada: ${currentPage} de ${totalPages}`);
    },
    // Incluir o excluir cabeceras de página
    includePageHeaders: true,
  });

  if (result.success) {
    console.log('✅ Extracción exitosa:');
    console.log(`- Tipo detectado: ${result.metadata.fileType}`);
    console.log(`- Total caracteres: ${result.metadata.charCount}`);
    console.log(`- Total palabras: ${result.metadata.wordCount}`);
    console.log(`- Duración: ${result.metadata.durationMs.toFixed(2)} ms`);

    if (result.metadata.pageCount) {
      console.log(`- Páginas en PDF: ${result.metadata.pageCount}`);
    }

    if (result.html) {
      console.log('- HTML enriquecido generado (DOCX)');
    }

    if (result.warnings.length > 0) {
      console.warn('⚠️ Advertencias emitidas durante el parseo:', result.warnings);
    }
  } else {
    console.error('❌ Error en la extracción:', result.errorMessage);
  }

  return result;
}
