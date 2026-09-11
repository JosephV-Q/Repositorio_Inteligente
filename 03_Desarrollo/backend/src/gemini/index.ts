import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Parámetros de entrada para interactuar con Gemini
 */
export interface GeminiPromptRequest {
  /**
   * Instrucciones directas de sistema para guiar el comportamiento, tono y rol del modelo
   * @example "Eres un asistente técnico experto en desarrollo backend con Node.js y PostgreSQL"
   */
  systemInstruction?: string;

  /**
   * Contexto adicional para la consulta (información previa, documentos, datos de la DB, etc.)
   * Puede ser un string largo o una lista de strings de contexto
   * @example "La base de datos actual contiene usuarios con roles de administrador y clientes"
   */
  context?: string | string[];

  /**
   * Mensaje principal, pregunta o instrucción del usuario (Obligatorio)
   * @example "¿Cómo puedo optimizar la consulta para listar repositorios?"
   */
  prompt: string;

  /**
   * Modelo de Gemini a emplear.
   * Por defecto: 'gemini-3.6-flash' (o el configurado en GEMINI_DEFAULT_MODEL)
   */
  model?: string;

  /**
   * Nivel de creatividad / aleatoriedad (0.0 a 2.0).
   * Por defecto: 0.7
   */
  temperature?: number;

  /**
   * Límite máximo de tokens generados en la respuesta
   */
  maxOutputTokens?: number;

  /**
   * API Key opcional si se desea sobrescribir la configurada en .env
   */
  apiKey?: string;
}

/**
 * Estructura de respuesta estandarizada devuelta por el módulo
 */
export interface GeminiPromptResponse {
  success: boolean;
  text: string;
  model: string;
  usage?: {
    promptTokens?: number;
    candidatesTokens?: number;
    totalTokens?: number;
  };
  error?: string;
}

let defaultClient: GoogleGenAI | null = null;

/**
 * Obtiene la API Key de Gemini desde variables de entorno
 */
export function getGeminiApiKey(customApiKey?: string): string {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error(
      'Gemini API Error: No se encontró GEMINI_API_KEY (o GOOGLE_API_KEY) en las variables de entorno (.env).'
    );
  }
  return apiKey;
}

/**
 * Obtiene o inicializa la instancia del cliente GoogleGenAI
 */
export function getGeminiClient(customApiKey?: string): GoogleGenAI {
  if (customApiKey) {
    return new GoogleGenAI({ apiKey: customApiKey });
  }
  if (!defaultClient) {
    const key = getGeminiApiKey();
    defaultClient = new GoogleGenAI({ apiKey: key });
  }
  return defaultClient;
}

/**
 * Función principal de abstracción para el consumo de Gemini
 * 
 * Recibe:
 * - `systemInstruction`: Reglas de sistema
 * - `context`: Contexto o datos de fondo
 * - `prompt`: Instrucción del usuario
 * 
 * @example
 * const res = await askGemini({
 *   systemInstruction: 'Eres un analista de datos',
 *   context: 'Lista de usuarios registrados: 100',
 *   prompt: 'Escribe un resumen ejecutivo breve'
 * });
 * console.log(res.text);
 */
/**
 * Mapeo de modelos obsoletos / deprecados a sus sustitutos vigentes recomendados por Google
 */
const DEPRECATED_MODELS_MAP: Record<string, string> = {
  'gemini-2.5': 'gemini-3.6-flash',
  'gemini-2.5-flash': 'gemini-3.6-flash',
  'gemini-2.5-flash-lite': 'gemini-3.5-flash-lite',
  'gemini-2.0-flash': 'gemini-3.6-flash',
  'gemini-1.5-flash': 'gemini-3.6-flash',
  'gemini-pro': 'gemini-3.6-flash'
};

export async function askGemini(params: GeminiPromptRequest): Promise<GeminiPromptResponse> {
  const defaultModel = process.env.GEMINI_DEFAULT_MODEL || 'gemini-3.6-flash';
  const rawModel = params.model || defaultModel;
  // Resolver modelo vigente si se envió uno deprecado
  const model = DEPRECATED_MODELS_MAP[rawModel] || rawModel;

  const {
    prompt,
    systemInstruction,
    context,
    temperature = 0.7,
    maxOutputTokens,
    apiKey
  } = params;

  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
    throw new Error('El campo "prompt" es obligatorio y debe ser un texto no vacío.');
  }

  // 1. Formateo y combinación del contexto con el prompt
  let fullPrompt = '';

  if (context) {
    const formattedContext = Array.isArray(context)
      ? context.filter(Boolean).join('\n---\n')
      : String(context);

    if (formattedContext.trim().length > 0) {
      fullPrompt += `[CONTEXTO Y DATOS DE ENTRADA]:\n${formattedContext.trim()}\n\n`;
    }
  }

  fullPrompt += `[SOLICITUD]:\n${prompt.trim()}`;

  // 2. Configuración de llamada para Gemini
  const config: Record<string, any> = {
    temperature
  };

  if (systemInstruction && systemInstruction.trim().length > 0) {
    config.systemInstruction = systemInstruction.trim();
  }

  if (typeof maxOutputTokens === 'number' && maxOutputTokens > 0) {
    config.maxOutputTokens = maxOutputTokens;
  }

  // 3. Ejecución de la consulta al modelo
  try {
    const ai = getGeminiClient(apiKey);
    const response = await ai.models.generateContent({
      model,
      contents: fullPrompt,
      config
    });

    const responseText = response.text || '';

    return {
      success: true,
      text: responseText,
      model,
      usage: response.usageMetadata
        ? {
            promptTokens: response.usageMetadata.promptTokenCount,
            candidatesTokens: response.usageMetadata.candidatesTokenCount,
            totalTokens: response.usageMetadata.totalTokenCount
          }
        : undefined
    };
  } catch (error: any) {
    return {
      success: false,
      text: '',
      model,
      error: error?.message || 'Error desconocido al invocar Gemini API'
    };
  }
}

/**
 * Genera un vector embedding de 768 dimensiones para un texto utilizando Gemini
 */
export async function generateEmbedding(
  text: string,
  options: {
    model?: string;
    outputDimensionality?: number;
    apiKey?: string;
  } = {}
): Promise<number[]> {
  const {
    model = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001',
    outputDimensionality = 768,
    apiKey
  } = options;

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('No se puede generar embedding de un texto vacío.');
  }

  const ai = getGeminiClient(apiKey);
  const response: any = await ai.models.embedContent({
    model,
    contents: text.trim(),
    config: {
      outputDimensionality
    }
  });

  const values = response.embeddings?.[0]?.values;
  if (!values || !Array.isArray(values)) {
    throw new Error('La API de Gemini no retornó un vector embedding válido.');
  }

  return values;
}

export interface DocumentAnalysisResult {
  nom_arch?: string;
  categoria?: string;
  descripcion: string;
  resumen: string;
  palabras_clave: string[];
  contexto: string;
}

/**
 * Analiza el texto bruto de un documento usando Gemini y extrae metadatos estructurados
 */
export async function analyzeDocumentText(
  rawText: string,
  options: {
    availableCategories?: string[];
    originalFileName?: string;
    model?: string;
    apiKey?: string;
  } = {}
): Promise<DocumentAnalysisResult> {
  const {
    availableCategories = [],
    originalFileName,
    model = 'gemini-flash-latest',
    apiKey
  } = options;

  const categoriesContext = availableCategories.length > 0
    ? `Categorías predefinidas disponibles en el sistema:\n${availableCategories.map((c) => `- "${c}"`).join('\n')}\nSi el contenido se ajusta a alguna de estas, selecciona la categoría exacta. Si no, sugiere una categoría breve y coherente.`
    : 'Identifica una categoría temática general coherente.';

  const systemInstruction = `Eres un asistente de catalogación y análisis de documentos.
Tu tarea es analizar el texto suministrado y extraer sus metadatos principales.
Debes responder ÚNICAMENTE con un objeto JSON estrictamente válido (sin bloques de código markdown, sin explicaciones antes o después) con la siguiente estructura:
{
  "nom_arch": "nombre_sugerido_del_archivo.pdf",
  "categoria": "Categoría asignada",
  "descripcion": "Descripción breve y concisa del contenido (máximo 3 oraciones)",
  "resumen": "Resumen ejecutivo detallado y estructurado de las ideas, hechos y conclusiones principales del documento",
  "palabras_clave": ["etiqueta1", "etiqueta2", "etiqueta3", "etiqueta4", "etiqueta5"],
  "contexto": "Ámbito o contexto institucional/temático del texto"
}

${categoriesContext}`;

  const prompt = originalFileName
    ? `Nombre original del documento: "${originalFileName}"\n\nTexto del documento:\n${rawText.slice(0, 30000)}`
    : `Texto del documento:\n${rawText.slice(0, 30000)}`;

  let response = await askGemini({
    model,
    systemInstruction,
    prompt,
    temperature: 0.2,
    apiKey
  });

  // Si el modelo principal está ocupado (503) o falla, reintentar con modelo alternativo
  if (!response.success) {
    const fallbackModel = model === 'gemini-flash-latest' ? 'gemini-3.8-flash' : 'gemini-flash-latest';
    response = await askGemini({
      model: fallbackModel,
      systemInstruction,
      prompt,
      temperature: 0.2,
      apiKey
    });
  }

  // Si ambos fallaron (ej. corte de red o cuota excedida temporalmente), degradación elegante
  if (!response.success || !response.text) {
    const snippet = rawText.trim().slice(0, 500);
    return {
      nom_arch: originalFileName || 'documento_analizado.txt',
      categoria: availableCategories[0] || 'General',
      descripcion: snippet.slice(0, 200) || 'Documento procesado en modo de contingencia.',
      resumen: snippet || 'Sin resumen disponible.',
      palabras_clave: [],
      contexto: 'General'
    };
  }

  let cleanJson = response.text.trim();
  if (cleanJson.startsWith('```')) {
    cleanJson = cleanJson.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```$/, '').trim();
  }

  try {
    const parsed = JSON.parse(cleanJson);
    return {
      nom_arch: parsed.nom_arch || originalFileName || 'documento_analizado.txt',
      categoria: parsed.categoria || (availableCategories[0] ?? 'General'),
      descripcion: parsed.descripcion || 'Documento procesado automáticamente por IA.',
      resumen: parsed.resumen || rawText.slice(0, 500),
      palabras_clave: Array.isArray(parsed.palabras_clave) ? parsed.palabras_clave.map(String) : [],
      contexto: parsed.contexto || 'General'
    };
  } catch {
    return {
      nom_arch: originalFileName || 'documento_analizado.txt',
      categoria: availableCategories[0] || 'General',
      descripcion: cleanJson.slice(0, 300),
      resumen: cleanJson,
      palabras_clave: [],
      contexto: 'General'
    };
  }
}

export default {
  askGemini,
  getGeminiClient,
  getGeminiApiKey,
  generateEmbedding,
  analyzeDocumentText
};
