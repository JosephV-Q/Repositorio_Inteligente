import { Request, Response } from 'express';
import { askGemini, GeminiPromptRequest } from '../gemini/index.js';

export async function handleGeminiPrompt(req: Request, res: Response): Promise<void> {
  try {
    const source = req.method === 'POST' ? req.body : req.query;

    const {
      prompt,
      systemInstruction,
      context,
      model,
      temperature,
      maxOutputTokens,
      apiKey: bodyApiKey
    } = source;

    const apiKey = bodyApiKey || req.headers['x-gemini-api-key'];

    // Validación básica y amigable
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      res.status(400).json({
        success: false,
        error: 'El campo "prompt" es obligatorio.',
        example: {
          prompt: '¿Cómo funciona una base de datos relacional?',
          systemInstruction: 'Eres un profesor de ingeniería de software paciente y conciso.',
          context: 'El usuario está aprendiendo SQL por primera vez.'
        }
      });
      return;
    }

    const requestOptions: GeminiPromptRequest = {
      prompt: String(prompt),
      systemInstruction: systemInstruction ? String(systemInstruction) : undefined,
      context: context ?? undefined,
      model: model ? String(model) : undefined,
      temperature: temperature !== undefined ? Number(temperature) : undefined,
      maxOutputTokens: maxOutputTokens !== undefined ? Number(maxOutputTokens) : undefined,
      apiKey: apiKey ? String(apiKey) : undefined
    };

    const result = await askGemini(requestOptions);

    if (!result.success) {
      res.status(502).json({
        success: false,
        error: 'Error en la respuesta de Gemini API',
        details: result.error
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        response: result.text,
        model: result.model,
        usage: result.usage
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor al procesar la solicitud de Gemini',
      message: error?.message || 'Error desconocido'
    });
  }
}

export async function getGeminiStatus(req: Request, res: Response): Promise<void> {
  const hasKey = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);

  res.status(200).json({
    service: 'Google Gemini AI',
    configured: hasKey,
    defaultModel: 'gemini-2.5-flash',
    message: hasKey
      ? 'Gemini API configurada correctamente'
      : 'Falta configurar GEMINI_API_KEY en las variables de entorno (.env)'
  });
}
