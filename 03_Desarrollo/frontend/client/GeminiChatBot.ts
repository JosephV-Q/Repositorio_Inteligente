import { ApiClient, api as defaultApiInstance } from './ApiClient.js';
import { Repositorio } from './models/Repositorio.js';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  status: 'pending' | 'sending' | 'sent' | 'error';
  error?: string;
  metadata?: Record<string, any>;
}

export type ChatBotStatus = 'idle' | 'sending' | 'thinking' | 'error';

export interface SendMessageOptions {
  context?: string | string[];
  extraContext?: string | string[];
  systemInstruction?: string;
  model?: string;
  temperature?: number;
  semanticSearch?: boolean;
  semanticOptions?: {
    categoria?: string;
    limit?: number;
    minSimilarity?: number;
    modo?: 'semantico' | 'hibrido' | 'texto';
  };
}

export interface GeminiChatBotOptions {
  client?: ApiClient;
  botName?: string;
  storageKey?: string;
  initialContext?: string | string[];
  defaultModel?: string;
  enableSemanticSearch?: boolean;
}

export type ChatBotListener = (messages: ChatMessage[], status: ChatBotStatus) => void;

export class GeminiChatBot {
  private client: ApiClient;
  private botName: string;
  private storageKey: string;
  private messages: ChatMessage[] = [];
  private status: ChatBotStatus = 'idle';
  private listeners: Set<ChatBotListener> = new Set();
  private userProfile: { nombre: string; rol: string } | null = null;
  private contextSnippets: string[] = [];
  private defaultModel: string;
  private enableSemanticSearch: boolean;

  constructor(options: GeminiChatBotOptions = {}) {
    this.client = options.client || defaultApiInstance;
    this.botName = options.botName || 'DocuHub AI';
    this.storageKey = options.storageKey || 'docuhub_gemini_chat_history';
    this.defaultModel = options.defaultModel || 'gemini-3.6-flash';
    this.enableSemanticSearch = options.enableSemanticSearch ?? true;

    if (options.initialContext) {
      this.setContext(options.initialContext);
    }

    this.loadHistory();
  }

  public getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  public getStatus(): ChatBotStatus {
    return this.status;
  }

  public setUserProfile(nombre: string, rol: string): void {
    this.userProfile = { nombre, rol };
  }

  public setContext(context: string | string[]): void {
    if (Array.isArray(context)) {
      this.contextSnippets = context.filter((c) => Boolean(c && c.trim()));
    } else if (typeof context === 'string' && context.trim().length > 0) {
      this.contextSnippets = [context.trim()];
    } else {
      this.contextSnippets = [];
    }
  }

  public addContext(snippet: string): void {
    if (snippet && snippet.trim().length > 0) {
      this.contextSnippets.push(snippet.trim());
    }
  }

  public subscribe(listener: ChatBotListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const currentMessages = this.getMessages();
    const currentStatus = this.status;
    this.listeners.forEach((listener) => {
      try {
        listener(currentMessages, currentStatus);
      } catch (err) {
        console.error('[GeminiChatBot] Error in subscriber listener:', err);
      }
    });
  }

  private setBotStatus(status: ChatBotStatus): void {
    this.status = status;
    this.notify();
  }

  private loadHistory(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const saved = window.localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          this.messages = parsed;
        }
      }
    } catch {
      this.messages = [];
    }
  }

  private saveHistory(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.setItem(this.storageKey, JSON.stringify(this.messages.slice(-50)));
    } catch {
      // ignore storage errors
    }
  }

  public async getGeminiServiceStatus(): Promise<{ configured: boolean; message: string; defaultModel: string }> {
    try {
      const res = await this.client.request<{
        service?: string;
        configured: boolean;
        defaultModel: string;
        message: string;
      }>('/api/gemini', {
        method: 'GET'
      });
      return {
        configured: Boolean(res.configured),
        message: res.message || 'Servicio Gemini operativo',
        defaultModel: res.defaultModel || this.defaultModel
      };
    } catch (err: any) {
      return {
        configured: false,
        message: err?.message || 'No se pudo verificar el estado de Gemini AI.',
        defaultModel: this.defaultModel
      };
    }
  }

  public async sendMessage(text: string, options: SendMessageOptions = {}): Promise<ChatMessage> {
    if (!text || !text.trim()) {
      throw new Error('El mensaje no puede estar vacío.');
    }

    const trimmedText = text.trim();
    const userMsgId = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const assistantMsgId = `ast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    const userMessage: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: trimmedText,
      timestamp: Date.now(),
      status: 'sent'
    };

    const assistantMessage: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      status: 'sending'
    };

    this.messages.push(userMessage, assistantMessage);
    this.setBotStatus('thinking');
    this.saveHistory();

    try {
      let combinedContext = this.contextSnippets.join('\n---\n');
      if (options.context) {
        const extra = Array.isArray(options.context) ? options.context.join('\n') : options.context;
        combinedContext = combinedContext ? `${combinedContext}\n---\n${extra}` : extra;
      }
      if (options.extraContext) {
        const extra2 = Array.isArray(options.extraContext) ? options.extraContext.join('\n') : options.extraContext;
        combinedContext = combinedContext ? `${combinedContext}\n---\n${extra2}` : extra2;
      }

      // Búsqueda semántica automática en el repositorio institucional mediante Repositorio.buscar
      let matchedRepos: Array<Repositorio & { similarity?: number; matchType?: 'vector' | 'texto' | 'hibrido' }> = [];
      const shouldSearch = options.semanticSearch ?? this.enableSemanticSearch;

      if (shouldSearch && trimmedText.length >= 3) {
        try {
          matchedRepos = await Repositorio.buscar(trimmedText, {
            categoria: options.semanticOptions?.categoria,
            limit: options.semanticOptions?.limit || 4,
            modo: options.semanticOptions?.modo || 'hibrido',
            minSimilarity: options.semanticOptions?.minSimilarity ?? 0.15,
          }, this.client);
        } catch (searchErr) {
          console.warn('[GeminiChatBot] Error en Repositorio.buscar semántico:', searchErr);
        }
      }

      if (matchedRepos.length > 0) {
        const repoContext = matchedRepos.map((r, i) => {
          return `[DOCUMENTO REPOSITORIO #${i + 1}]:
- Título/Nombre: "${r.nom_arch}" (ID: ${r.id})
- Categoría: "${r.categoria || 'Sin categoría'}"
- Contexto: ${r.contexto || 'General'}
- Resumen/Puntos Clave: ${r.resumen || r.descripcion || 'Sin resumen registrado'}
- Palabras clave: ${Array.isArray(r.palabras_clave) ? r.palabras_clave.join(', ') : 'N/A'}
- Similitud semántica: ${r.similarity ? `${Math.round(r.similarity * 100)}%` : 'Coincidencia'}
- Enlace de consulta: ${r.ruta_arch || 'N/A'}`;
        }).join('\n\n');

        const semanticSection = `[DOCUMENTOS RELEVANTES RECUPERADOS MEDIANTE BÚSQUEDA SEMÁNTICA PGVECTOR]:\n${repoContext}`;
        combinedContext = combinedContext
          ? `${combinedContext}\n\n${semanticSection}`
          : semanticSection;

        assistantMessage.metadata = {
          ...assistantMessage.metadata,
          matchedDocuments: matchedRepos.map((r) => ({
            id: r.id,
            nom_arch: r.nom_arch,
            categoria: r.categoria,
            ruta_arch: r.ruta_arch,
            similarity: r.similarity,
            resumen: r.resumen,
            descripcion: r.descripcion
          }))
        };
      }

      let systemInstruction = options.systemInstruction;
      if (!systemInstruction) {
        systemInstruction = `Eres ${this.botName}, un asistente inteligente especializado en gestión y análisis documental institucional para el repositorio institucional.`;
        if (this.userProfile) {
          systemInstruction += ` Estás conversando con ${this.userProfile.nombre} (${this.userProfile.rol}).`;
        }
        systemInstruction += `\nCuentas con un motor integrado de búsqueda semántica con embeddings vectoriales (pgvector). Si en el contexto se incluyen documentos recuperados del repositorio, basa fielmente tus explicaciones en ellos, cita el título del archivo relevante entre comillas (ej. Según el archivo *"Plan Estratégico.pdf"*...), destaca los puntos clave o cifras correspondientes y responde con cortesía, claridad y estructura profesional en formato Markdown.`;
      }

      const res = await this.client.request<{
        success: boolean;
        data?: { response: string; model?: string; usage?: any };
        error?: string;
      }>('/api/gemini', {
        method: 'POST',
        body: {
          prompt: trimmedText,
          systemInstruction,
          context: combinedContext || undefined,
          model: options.model || this.defaultModel,
          temperature: options.temperature ?? 0.7
        }
      });

      const responseText = res?.data?.response || 'No se recibió contenido en la respuesta de Gemini.';

      assistantMessage.content = responseText;
      assistantMessage.status = 'sent';
      this.setBotStatus('idle');
      this.saveHistory();

      return assistantMessage;
    } catch (err: any) {
      assistantMessage.status = 'error';
      assistantMessage.error = err?.message || 'Error al comunicarse con Gemini AI.';
      assistantMessage.content = `⚠️ Lo siento, ocurrió un problema al procesar tu solicitud: ${assistantMessage.error}`;
      this.setBotStatus('error');
      this.saveHistory();
      return assistantMessage;
    }
  }

  public async retryLastMessage(): Promise<ChatMessage | null> {
    const lastUserIdx = [...this.messages].reverse().findIndex((m) => m.role === 'user');
    if (lastUserIdx === -1) return null;

    const actualIdx = this.messages.length - 1 - lastUserIdx;
    const userMsg = this.messages[actualIdx];

    // Eliminar el mensaje de error del asistente que le seguía si existe
    if (this.messages[actualIdx + 1] && this.messages[actualIdx + 1].role === 'assistant') {
      this.messages.splice(actualIdx + 1, 1);
    }
    // Eliminar también el mensaje de usuario original y volverlo a enviar
    this.messages.splice(actualIdx, 1);

    return this.sendMessage(userMsg.content);
  }

  public clearHistory(): void {
    this.messages = [];
    this.setBotStatus('idle');
    this.saveHistory();
  }

  public resetSession(): void {
    this.clearHistory();
    this.contextSnippets = [];
  }

  public deleteMessage(id: string): boolean {
    const prevLen = this.messages.length;
    this.messages = this.messages.filter((m) => m.id !== id);
    const deleted = this.messages.length < prevLen;
    if (deleted) {
      this.saveHistory();
      this.notify();
    }
    return deleted;
  }

  public exportTranscript(format: 'markdown' | 'text' | 'json' = 'markdown'): string {
    if (format === 'json') {
      return JSON.stringify(this.messages, null, 2);
    }

    if (format === 'text') {
      return this.messages
        .map((m) => `[${new Date(m.timestamp).toLocaleString()}] ${m.role.toUpperCase()}: ${m.content}`)
        .join('\n\n');
    }

    // Markdown
    let md = `# Historial de Conversación con ${this.botName}\n\n`;
    md += `*Exportado el: ${new Date().toLocaleString()}*\n\n---\n\n`;
    for (const msg of this.messages) {
      const author = msg.role === 'user' ? (this.userProfile?.nombre || 'Usuario') : this.botName;
      md += `### 👤 ${author} (${new Date(msg.timestamp).toLocaleTimeString()})\n\n`;
      md += `${msg.content}\n\n---\n\n`;
    }
    return md;
  }

  public getSuggestedPrompts(): string[] {
    return [
      '¿Qué documentos hay registrados en el repositorio?',
      '¿Cómo realizo una búsqueda semántica de archivos?',
      'Resume el contenido del documento seleccionado',
      '¿Qué requisitos técnicos tiene la extracción client-side?'
    ];
  }
}

export function createChatBot(options: GeminiChatBotOptions = {}): GeminiChatBot {
  return new GeminiChatBot(options);
}

export default GeminiChatBot;
