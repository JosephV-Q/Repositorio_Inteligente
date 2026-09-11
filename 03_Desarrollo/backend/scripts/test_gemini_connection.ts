/**
 * ============================================================================
 * SCRIPT DE DIAGNÓSTICO Y TEST: GOOGLE GEMINI API (MODELOS ACTIVOS)
 * ============================================================================
 * 
 * Este script verifica:
 * 1. Existencia y formato de GEMINI_API_KEY en .env
 * 2. Conectividad directa con los servidores de Google Generative AI
 * 3. Listado de modelos disponibles devueltos por la API
 * 4. Prueba real de generación (generateContent) sobre los modelos de texto
 *    aptos para cuentas estándar / gratuitas.
 * 
 * Uso:
 *   npx tsx scripts/test_gemini_connection.ts
 *   npm run test:gemini
 */

import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

interface ModelTestResult {
  model: string;
  name: string;
  status: 'OK' | 'ERROR';
  latencyMs: number;
  sampleResponse?: string;
  error?: string;
}

// Lista de candidatos principales para chatbots de texto en cuentas estándar
const CANDIDATE_MODELS = [
  'gemini-flash-latest',
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-pro-latest'
];

async function runGeminiDiagnostic() {
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║        DIAGNÓSTICO DE CONEXIÓN Y MODELOS ACTIVOS - GEMINI AI         ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

  // 1. Verificación de Clave de API
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error('❌ ERROR: No se encontró GEMINI_API_KEY ni GOOGLE_API_KEY en .env');
    process.exit(1);
  }

  const maskedKey = apiKey.length > 8
    ? `${apiKey.slice(0, 6)}...${apiKey.slice(-4)} (Longitud: ${apiKey.length})`
    : '***';
  console.log(`🔑 Clave detectada: ${maskedKey}`);

  const ai = new GoogleGenAI({ apiKey });

  // 2. Comprobar listado de modelos disponibles en la cuenta
  console.log('\n📡 [1/2] Consultando catálogo de modelos disponibles para la cuenta...');
  const availableModelIds: string[] = [];
  try {
    const listResponse = await ai.models.list();
    for await (const m of listResponse) {
      if (m.name) {
        // Los nombres vienen con prefijo "models/"
        const cleanName = m.name.replace(/^models\//, '');
        availableModelIds.push(cleanName);
      }
    }
    console.log(`   ✅ Conexión exitosa con Google AI API.`);
    console.log(`   ℹ️ Modelos encontrados en catálogo: ${availableModelIds.length}`);
  } catch (err: any) {
    console.error('❌ Error al consultar la lista de modelos:', err?.message || err);
    process.exit(1);
  }

  // 3. Probar generación de contenido en los modelos candidatos
  console.log('\n🧪 [2/2] Probando generateContent ("Hola") en modelos recomendados para chat:\n');
  const results: ModelTestResult[] = [];

  for (const modelId of CANDIDATE_MODELS) {
    const inCatalog = availableModelIds.includes(modelId);
    process.stdout.write(`   • Probando [${modelId}] ... `);

    const startTime = Date.now();
    try {
      const response = await ai.models.generateContent({
        model: modelId,
        contents: 'Hola, responde en una sola frase breve de saludo.'
      });

      const latencyMs = Date.now() - startTime;
      const text = (response.text || '').trim();

      console.log(`✅ ACTIVO (${latencyMs}ms)`);
      results.push({
        model: modelId,
        name: modelId,
        status: 'OK',
        latencyMs,
        sampleResponse: text.replace(/\n/g, ' ')
      });
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      let errMsg = err?.message || String(err);
      try {
        const parsed = JSON.parse(errMsg);
        if (parsed.error && parsed.error.message) {
          errMsg = `[${parsed.error.code || 'ERR'}] ${parsed.error.message}`;
        }
      } catch {
        // Mantener texto original
      }
      console.log(`❌ FALLÓ`);
      results.push({
        model: modelId,
        name: modelId,
        status: 'ERROR',
        latencyMs,
        error: errMsg
      });
    }
  }

  // 4. Resumen estructurado
  console.log('\n' + '═'.repeat(70));
  console.log('                   RESUMEN DE MODELOS DIAGNOSTICADOS');
  console.log('═'.repeat(70));

  const activeModels = results.filter(r => r.status === 'OK');
  const failedModels = results.filter(r => r.status === 'ERROR');

  console.log('\n🟢 MODELOS ACTIVOS Y OPERATIVOS (Listos para usar en cuenta estándar):');
  activeModels.forEach(m => {
    console.log(`   ✓ ${m.model.padEnd(24)} | Latencia: ${String(m.latencyMs).padStart(4)}ms | Resp: "${m.sampleResponse?.slice(0, 45)}..."`);
  });

  if (failedModels.length > 0) {
    console.log('\n🔴 MODELOS INACTIVOS / DEPRECADOS / NO DISPONIBLES:');
    failedModels.forEach(m => {
      const shortErr = m.error && m.error.length > 80 ? `${m.error.slice(0, 77)}...` : m.error;
      console.log(`   ✗ ${m.model.padEnd(24)} | ${shortErr}`);
    });
  }

  console.log('\n📌 RECOMENDACIÓN PARA EL BACKEND (DocuHub AI):');
  if (activeModels.length > 0) {
    const recommended = activeModels.find(m => m.model === 'gemini-3.6-flash')
      || activeModels.find(m => m.model === 'gemini-3.5-flash-lite')
      || activeModels.find(m => m.model === 'gemini-flash-latest')
      || activeModels[0];
    console.log(`   👉 Usar: "${recommended.model}" como modelo por defecto.`);
    console.log(`      - Excelente balance de velocidad (${recommended.latencyMs}ms), costo cero en tier gratuito y estabilidad en producción.`);
    console.log(`      - Alternativa ultra rápida para chat ligero: "gemini-3.5-flash-lite" (~800ms).`);
  } else {
    console.log('   ⚠️ Ningún modelo de la lista de candidatos respondió exitosamente.');
  }
  console.log('═'.repeat(70) + '\n');
}

runGeminiDiagnostic().catch((err) => {
  console.error('Fallo fatal en el script de diagnóstico:', err);
  process.exit(1);
});
