import { extractDocument } from './documentExtractor';
import type { BatchOptions, BatchExtractionResult, BatchItemResult } from './types';

/**
 * Herramienta de procesamiento por lotes (Batch Extractor).
 * Procesa múltiples archivos con control de concurrencia para evitar saturación de memoria.
 *
 * @param files Lista de archivos a procesar
 * @param options Opciones de lote (concurrencia, callbacks)
 * @returns Resumen y resultados individuales de cada archivo
 */
export async function extractBatch(
  files: File[],
  options: BatchOptions = {}
): Promise<BatchExtractionResult> {
  const startTime = performance.now();
  const totalFiles = files.length;
  const concurrency = Math.max(1, options.concurrency || 2);
  const results: BatchItemResult[] = new Array(totalFiles);

  let completedCount = 0;
  let currentIndex = 0;

  async function worker(): Promise<void> {
    while (currentIndex < totalFiles) {
      const idx = currentIndex++;
      const file = files[idx];

      try {
        const result = await extractDocument(file, options.itemOptions);
        results[idx] = {
          file,
          result,
          error: result.success ? undefined : result.errorMessage,
        };
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        results[idx] = {
          file,
          error: errMsg,
        };
      } finally {
        completedCount++;
        if (options.onProgress) {
          options.onProgress(completedCount, totalFiles, file);
        }
      }
    }
  }

  // Ejecutar workers concurrentes
  const workers = Array.from({ length: Math.min(concurrency, totalFiles) }, () => worker());
  await Promise.all(workers);

  const durationMs = performance.now() - startTime;
  const successCount = results.filter((r) => r.result?.success).length;
  const failedCount = totalFiles - successCount;

  return {
    totalFiles,
    successCount,
    failedCount,
    durationMs,
    results,
  };
}
