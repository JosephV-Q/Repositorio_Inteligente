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
   * Por defecto: 'gemini-2.5-flash'
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
export async function askGemini(params: GeminiPromptRequest): Promise<GeminiPromptResponse> {
  const {
    prompt,
    systemInstruction,
    context,
    model = 'gemini-2.5-flash',
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

export default {
  askGemini,
  getGeminiClient,
  getGeminiApiKey
};
