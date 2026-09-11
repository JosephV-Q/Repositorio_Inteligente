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
  const defaultModel = process.env.GEMINI_DEFAULT_MODEL || 'gemini-3.6-flash';
  const {
    availableCategories = [],
    originalFileName,
    model = defaultModel,
    apiKey
  } = options;

  const categoriesContext = availableCategories.length > 0
    ? `Categorías predefinidas disponibles en el sistema:\n${availableCategories.map((c) => `- "${c}"`).join('\n')}\nSi el contenido se ajusta a alguna de estas, selecciona la categoría exacta. Si no, sugiere una categoría breve y coherente.`
    : 'Identifica una categoría temática general coherente.';

  const systemInstruction = `Eres un especialista senior en análisis, catalogación y síntesis documental de alta precisión para un sistema de gestión documental inteligente.
Tu misión es analizar a fondo el texto del documento y generar una síntesis exhaustiva, rigurosa y de alto valor ejecutivo que refleje con total fidelidad el contenido, contexto y decisiones del texto.

CRITERIOS OBLIGATORIOS PARA EL RESUMEN:
1. CONTEXTUALIZACIÓN Y PROPÓSITO: Identifica claramente de qué tipo de documento se trata, qué entidad, autor o partes lo suscriben, la fecha o período de aplicación, y el objetivo central o problema que atiende.
2. PUNTOS CLAVE Y DESARROLLO TEMÁTICO: Sintetiza los temas nodales, antecedentes relevantes, discusiones o consideraciones técnicas/administrativas tratadas en el texto.
3. DATOS, CIFRAS, ACUERDOS Y COMPROMISOS: Extrae cifras específicas, montos económicos, plazos, artículos normativos, responsabilidades asignadas o resoluciones vinculantes.
4. CONCLUSIONES Y PRÓXIMOS PASOS: Explica el desenlace, dictamen final, recomendaciones o acciones de seguimiento establecidas.
5. FORMATO DE SALIDA DEL RESUMEN:
   - Debe ser una lista de 4 a 7 puntos clave sustanciales. Cada punto debe ser un párrafo desarrollado (2 a 4 oraciones informativas), NO frases cortas ni genéricas.
   - Cada punto debe comenzar con una etiqueta temática en negrita (ej: "**Contexto y Objeto:** ...", "**Diagnóstico y Antecedentes:** ...", "**Acuerdos y Cifras Clave:** ...", "**Conclusiones y Dictamen:** ...").
   - Prohibido utilizar frases genéricas de relleno como "el documento habla de varios puntos" o "se realizó un análisis estructural". Cada afirmación debe basarse en hechos del texto.

Debes responder ÚNICAMENTE con un objeto JSON estrictamente válido (sin bloques de código markdown, sin explicaciones antes o después) con la siguiente estructura:
{
  "nom_arch": "nombre_sugerido_del_archivo.pdf",
  "categoria": "Categoría asignada",
  "descripcion": "Descripción ejecutiva concisa del contenido del documento (2 a 3 oraciones)",
  "resumen": [
    "**Contexto y Objeto:** [Explicación detallada de origen, partes y propósito]",
    "**Diagnóstico y Puntos Clave:** [Temas principales y antecedentes]",
    "**Acuerdos, Cifras y Compromisos:** [Datos cuantificables, obligaciones o cláusulas]",
    "**Conclusiones y Próximos Pasos:** [Resoluciones finales y decisiones]"
  ],
  "palabras_clave": ["etiqueta1", "etiqueta2", "etiqueta3", "etiqueta4", "etiqueta5", "etiqueta6"],
  "contexto": "Ámbito institucional, legal o temático específico del texto"
}

${categoriesContext}`;

  // Enviar una ventana generosa de texto (hasta 90,000 caracteres) cubriendo inicio, desarrollo y final
  let textSample = rawText.trim();
  if (textSample.length > 90000) {
    const start = textSample.slice(0, 45000);
    const midPos = Math.floor(textSample.length / 2) - 15000;
    const middle = textSample.slice(midPos, midPos + 25000);
    const end = textSample.slice(-20000);
    textSample = `[SECCIÓN INICIAL]:\n${start}\n\n[SECCIÓN INTERMEDIA]:\n${middle}\n\n[SECCIÓN FINAL Y CONCLUSIONES]:\n${end}`;
  }

  const prompt = originalFileName
    ? `Nombre original del documento: "${originalFileName}"\n\nTexto del documento:\n${textSample}`
    : `Texto del documento:\n${textSample}`;

  let response = await askGemini({
    model,
    systemInstruction,
    prompt,
    temperature: 0.2,
    maxOutputTokens: 2048,
    apiKey
  });

  // Si el modelo principal falla, reintentar con modelo alternativo de alta capacidad
  if (!response.success) {
    const fallbackModel = model === 'gemini-3.8-flash' ? 'gemini-3.6-flash' : 'gemini-3.8-flash';
    response = await askGemini({
      model: fallbackModel,
      systemInstruction,
      prompt,
      temperature: 0.2,
      maxOutputTokens: 2048,
      apiKey
    });
  }

  // Si ambos fallaron (ej. corte de red o cuota excedida temporalmente), degradación elegante inteligente
  if (!response.success || !response.text) {
    const paragraphs = rawText
      .split(/\n\s*\n+/)
      .map((p) => p.replace(/\s+/g, ' ').trim())
      .filter((p) => p.length >= 60 && !p.startsWith('--- Página'));

    const fallbackSummary = paragraphs.length >= 3
      ? [
          `**Contexto Inicial:** ${paragraphs[0]}`,
          `**Desarrollo Central:** ${paragraphs[Math.floor(paragraphs.length / 2)]}`,
          `**Conclusión / Sección Final:** ${paragraphs[paragraphs.length - 1]}`
        ].join('\n')
      : (rawText.trim().slice(0, 1000) || 'Sin contenido de texto disponible para resumir.');

    return {
      nom_arch: originalFileName || 'documento_analizado.txt',
      categoria: availableCategories[0] || 'General',
      descripcion: paragraphs[0] ? paragraphs[0].slice(0, 250) : 'Documento procesado en modo de contingencia.',
      resumen: fallbackSummary,
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
    let finalResumen = '';
    if (Array.isArray(parsed.resumen)) {
      finalResumen = parsed.resumen.map((r: any) => String(r).trim()).filter(Boolean).join('\n');
    } else if (typeof parsed.resumen === 'string') {
      finalResumen = parsed.resumen.trim();
    } else {
      finalResumen = cleanJson.slice(0, 1500);
    }

    return {
      nom_arch: parsed.nom_arch || originalFileName || 'documento_analizado.txt',
      categoria: parsed.categoria || (availableCategories[0] ?? 'General'),
      descripcion: parsed.descripcion || 'Documento analizado e indexado con DocuHub AI.',
      resumen: finalResumen || rawText.slice(0, 1000),
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
