/**
 * ============================================================================
 * SCRIPT DE VALIDACIÓN INTEGRAL DE LA API (HTTP ENDPOINTS + GEMINI AI + RBAC)
 * ============================================================================
 * 
 * Inicia el servidor Express local y valida:
 * 1. Health check (/api/health)
 * 2. Autenticación y generación de token de prueba (/api/auth/test-token)
 * 3. Estado de configuración de Gemini AI (/api/gemini/status)
 * 4. Consulta estándar a Gemini AI sin especificar modelo (debe usar gemini-3.6-flash y retornar 200)
 * 5. Consulta a Gemini AI especificando el modelo deprecado gemini-2.5-flash (debe remapear y retornar 200, NO 502)
 * 6. Consulta a Gemini AI especificando gemini-3.5-flash-lite (ultra rápido)
 * 7. Estado de conexión con Neon DB (/api/usuarios/db-status)
 * 8. Estado de configuración de Google Drive (/api/repositorios/drive/status)
 * 
 * Uso:
 *   npx tsx scripts/test_api_endpoints.ts
 */

import { Server } from 'http';
import app from '../src/app.js';
import dotenv from 'dotenv';

dotenv.config();

interface TestStep {
  name: string;
  passed: boolean;
  details?: string;
}

async function runApiValidation() {
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║        VALIDACIÓN INTEGRAL DE ENDPOINTS DE LA API (EXPRESS)          ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

  console.log('🚀 [1/9] Iniciando servidor Express local para validación...');
  const server: Server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', () => resolve()));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 3000;
  const baseUrl = `http://localhost:${port}`;
  console.log(`   ✅ Servidor activo en: ${baseUrl}\n`);

  const steps: TestStep[] = [];
  let authToken = '';

  try {
    // 1. Health check
    process.stdout.write('📡 [2/9] GET /api/health ... ');
    const resHealth = await fetch(`${baseUrl}/api/health`);
    const dataHealth = await resHealth.json();
    if (resHealth.status === 200 && (dataHealth.status === 'online' || dataHealth.status === 'ok')) {
      console.log('✅ OK (200, online)');
      steps.push({ name: 'GET /api/health', passed: true, details: `Estado: ${dataHealth.status} | Env: ${dataHealth.environment}` });
    } else {
      console.log(`❌ FALLÓ (Status ${resHealth.status})`);
      steps.push({ name: 'GET /api/health', passed: false, details: JSON.stringify(dataHealth) });
    }

    // 2. Auth Test Token
    process.stdout.write('🔐 [3/9] GET /api/auth/test-token ... ');
    const resAuth = await fetch(`${baseUrl}/api/auth/test-token`);
    const dataAuth = await resAuth.json();
    if (resAuth.status === 200 && dataAuth.success && dataAuth.token) {
      authToken = dataAuth.token;
      console.log('✅ OK (200, Token obtenido)');
      steps.push({ name: 'GET /api/auth/test-token', passed: true, details: `Usuario: ${dataAuth.user?.gmail} (${dataAuth.user?.nombre_rol})` });
    } else {
      console.log(`❌ FALLÓ (Status ${resAuth.status})`);
      steps.push({ name: 'GET /api/auth/test-token', passed: false, details: JSON.stringify(dataAuth) });
    }

    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    };

    // 3. Gemini Status
    process.stdout.write('🤖 [4/9] GET /api/gemini/status ... ');
    const resGemStatus = await fetch(`${baseUrl}/api/gemini/status`, { headers: authHeaders });
    const dataGemStatus = await resGemStatus.json();
    if (resGemStatus.status === 200 && dataGemStatus.configured) {
      console.log(`✅ OK (200, Default: ${dataGemStatus.defaultModel})`);
      steps.push({ name: 'GET /api/gemini/status', passed: true, details: `Modelo: ${dataGemStatus.defaultModel}` });
    } else {
      console.log(`❌ FALLÓ (Status ${resGemStatus.status})`);
      steps.push({ name: 'GET /api/gemini/status', passed: false, details: JSON.stringify(dataGemStatus) });
    }

    // 4. POST /api/gemini (Default model)
    process.stdout.write('💬 [5/9] POST /api/gemini (modelo por defecto: gemini-3.6-flash) ... ');
    const startT1 = Date.now();
    const resGemDefault = await fetch(`${baseUrl}/api/gemini`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ prompt: 'Di "Hola Mundo" en una sola frase breve.' })
    });
    const lat1 = Date.now() - startT1;
    const dataGemDefault = await resGemDefault.json();
    if (resGemDefault.status === 200 && dataGemDefault.success && dataGemDefault.data?.response) {
      console.log(`✅ OK (200 en ${lat1}ms) -> Modelo: ${dataGemDefault.data.model}`);
      steps.push({
        name: 'POST /api/gemini (Default)',
        passed: true,
        details: `Modelo usado: ${dataGemDefault.data.model} | Latencia: ${lat1}ms | Resp: "${dataGemDefault.data.response.trim()}"`
      });
    } else {
      console.log(`❌ FALLÓ (Status ${resGemDefault.status})`);
      steps.push({ name: 'POST /api/gemini (Default)', passed: false, details: JSON.stringify(dataGemDefault) });
    }

    // 5. POST /api/gemini con modelo deprecado (gemini-2.5-flash) -> Verificación de que NO devuelve 502
    process.stdout.write('🛡️  [6/9] POST /api/gemini (enviando "gemini-2.5-flash", test de fallback anti-502) ... ');
    const startT2 = Date.now();
    const resGemFallback = await fetch(`${baseUrl}/api/gemini`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ prompt: 'Responde OK brevemente.', model: 'gemini-2.5-flash' })
    });
    const lat2 = Date.now() - startT2;
    const dataGemFallback = await resGemFallback.json();
    if (resGemFallback.status === 200 && dataGemFallback.success) {
      console.log(`✅ OK (200 en ${lat2}ms, remapeado transparente a: ${dataGemFallback.data.model})`);
      steps.push({
        name: 'POST /api/gemini (Fallback Anti-502)',
        passed: true,
        details: `Solicitado: gemini-2.5-flash -> Resuelto a: ${dataGemFallback.data.model} (${lat2}ms)`
      });
    } else {
      console.log(`❌ FALLÓ (Status ${resGemFallback.status})`);
      steps.push({ name: 'POST /api/gemini (Fallback Anti-502)', passed: false, details: JSON.stringify(dataGemFallback) });
    }

    // 6. POST /api/gemini con modelo lite (gemini-3.5-flash-lite)
    process.stdout.write('⚡ [7/9] POST /api/gemini (enviando "gemini-3.5-flash-lite", modo ultra rápido) ... ');
    const startT3 = Date.now();
    const resGemLite = await fetch(`${baseUrl}/api/gemini`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ prompt: 'Responde "Listo".', model: 'gemini-3.5-flash-lite' })
    });
    const lat3 = Date.now() - startT3;
    const dataGemLite = await resGemLite.json();
    if (resGemLite.status === 200 && dataGemLite.success) {
      console.log(`✅ OK (200 en ${lat3}ms)`);
      steps.push({
        name: 'POST /api/gemini (Ultra rápido Lite)',
        passed: true,
        details: `Modelo: ${dataGemLite.data.model} | Latencia: ${lat3}ms`
      });
    } else {
      console.log(`❌ FALLÓ (Status ${resGemLite.status})`);
      steps.push({ name: 'POST /api/gemini (Ultra rápido Lite)', passed: false, details: JSON.stringify(dataGemLite) });
    }

    // 7. Base de datos Neon PostgreSQL Status
    process.stdout.write('🗄️  [8/9] GET /api/usuarios/db-status ... ');
    const resDb = await fetch(`${baseUrl}/api/usuarios/db-status`, { headers: authHeaders });
    const dataDb = await resDb.json();
    if (resDb.status === 200 && (dataDb.status === 'online' || dataDb.status === 'ok')) {
      console.log('✅ OK (200, Conexión Neon DB activa)');
      steps.push({ name: 'GET /api/usuarios/db-status', passed: true, details: `Base: ${dataDb.database} (${dataDb.latencyMs}ms)` });
    } else {
      console.log(`❌ FALLÓ (Status ${resDb.status})`);
      steps.push({ name: 'GET /api/usuarios/db-status', passed: false, details: JSON.stringify(dataDb) });
    }

    // 8. Google Drive Status
    process.stdout.write('☁️  [9/9] GET /api/repositorios/drive/status ... ');
    const resDrive = await fetch(`${baseUrl}/api/repositorios/drive/status`, { headers: authHeaders });
    const dataDrive = await resDrive.json();
    if (resDrive.status === 200 && dataDrive.configured) {
      console.log(`✅ OK (200, Método: ${dataDrive.method})`);
      steps.push({ name: 'GET /api/repositorios/drive/status', passed: true, details: `Método: ${dataDrive.method}` });
    } else {
      console.log(`❌ FALLÓ (Status ${resDrive.status})`);
      steps.push({ name: 'GET /api/repositorios/drive/status', passed: false, details: JSON.stringify(dataDrive) });
    }

  } finally {
    server.close();
  }

  // Resumen
  console.log('\n' + '═'.repeat(70));
  console.log('                   RESUMEN DE VALIDACIÓN DE LA API');
  console.log('═'.repeat(70));

  const allPassed = steps.every(s => s.passed);
  steps.forEach((s) => {
    const icon = s.passed ? '✅' : '❌';
    console.log(`${icon} ${s.name.padEnd(35)} | ${s.details || ''}`);
  });

  console.log('═'.repeat(70));
  if (allPassed) {
    console.log('🎉 RESULTADO FINAL: TODOS LOS ENDPOINTS Y VALIDACIONES PASARON (100% OK)');
  } else {
    console.log('⚠️ RESULTADO FINAL: ALGUNOS ENDPOINTS REPORTARON ERRORES');
  }
  console.log('═'.repeat(70) + '\n');
}

runApiValidation().catch((err) => {
  console.error('Error fatal al ejecutar pruebas de endpoints:', err);
  process.exit(1);
});
