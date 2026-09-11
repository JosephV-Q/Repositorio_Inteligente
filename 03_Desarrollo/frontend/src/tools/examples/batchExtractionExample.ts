import { extractBatch } from '../batchExtractor';
import type { BatchExtractionResult } from '../types';

/**
 * Ejemplo 2: Procesamiento de múltiples documentos en lote (Batch).
 * Mantiene un límite de concurrencia para evitar saturación de memoria en el navegador.
 */
export async function runBatchExtractionExample(files: File[]): Promise<BatchExtractionResult> {
  console.log(`[Ejemplo 2] Procesando lote de ${files.length} archivos...`);

  const batchResult = await extractBatch(files, {
    // Máximo 2 documentos en paralelo para no congelar la UI
    concurrency: 2,
    // Callback global de progreso
    onProgress: (completed, total, currentFile) => {
      const percent = Math.round((completed / total) * 100);
      console.log(`[${percent}%] (${completed}/${total}) Finalizado: ${currentFile.name}`);
    },
    itemOptions: {
      includePageHeaders: true,
    },
  });

  console.log('📊 Resumen del Lote:');
  console.log(`- Archivos totales: ${batchResult.totalFiles}`);
  console.log(`- Procesados con éxito: ${batchResult.successCount}`);
  console.log(`- Fallidos: ${batchResult.failedCount}`);
  console.log(`- Tiempo total del lote: ${batchResult.durationMs.toFixed(2)} ms`);

  // Revisar errores individuales si los hubiera
  for (const item of batchResult.results) {
    if (item.error) {
      console.warn(`Archivo con error: ${item.file.name} -> ${item.error}`);
    } else if (item.result) {
      console.log(`Archivo OK: ${item.file.name} (${item.result.metadata.wordCount} palabras)`);
    }
  }

  return batchResult;
}
