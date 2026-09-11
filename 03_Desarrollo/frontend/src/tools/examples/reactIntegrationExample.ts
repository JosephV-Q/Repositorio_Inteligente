import { extractDocument } from '../documentExtractor';
import type { UnifiedExtractionResult } from '../types';

/**
 * Ejemplo 6: Patrón para Frameworks de UI React / Next.js / Vue.
 * Hook lógico independiente de estado para encapsular la extracción.
 */
export interface UseDocumentExtractorState {
  loading: boolean;
  progress: { current: number; total: number } | null;
  error: string | null;
  result: UnifiedExtractionResult | null;
}

export type StateListener = (state: UseDocumentExtractorState) => void;

export class DocumentExtractorController {
  private state: UseDocumentExtractorState = {
    loading: false,
    progress: null,
    error: null,
    result: null,
  };

  private listeners: Set<StateListener> = new Set();

  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private updateState(partial: Partial<UseDocumentExtractorState>): void {
    this.state = { ...this.state, ...partial };
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  public async processFile(file: File): Promise<UnifiedExtractionResult | null> {
    this.updateState({ loading: true, error: null, progress: null, result: null });

    try {
      const res = await extractDocument(file, {
        onPageProgress: (current, total) => {
          this.updateState({ progress: { current, total } });
        },
      });

      if (!res.success) {
        throw new Error(res.errorMessage || 'Error en la extracción.');
      }

      this.updateState({ result: res });
      return res;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.updateState({ error: errorMsg });
      return null;
    } finally {
      this.updateState({ loading: false, progress: null });
    }
  }

  public getState(): UseDocumentExtractorState {
    return this.state;
  }
}
