/**
 * ============================================================================
 * SCRIPT DE VERIFICACIÓN: FLUJO COMPLETO DE SUBIDA DE ARCHIVOS (CLIENTE + BACKEND + DRIVE + BD)
 * ============================================================================
 * 
 * Este script comprueba de punta a punta el flujo de subida implementado en:
 * 1. Cliente (@client/ApiClient.ts): método subirArchivo(file, params)
 * 2. Backend Express (/api/repositorios/upload-url): generación de enlace prefirmado
 * 3. Google Drive API (Cuenta de Servicio configurada en .env): subida HTTP PUT directa
 * 4. Neon PostgreSQL (/api/repositorios): registro de metadatos en la tabla 'repositorios'
 * 
 * Uso:
 *   npx tsx scripts/test_upload_flow.ts
 *   npx tsx scripts/test_upload_flow.ts --keep (para conservar el archivo de prueba en BD)
 *   npx tsx scripts/test_upload_flow.ts --url http://localhost:3000 (para probar contra servidor ya activo)
 */

import dotenv from 'dotenv';
import { Server } from 'http';
import app from '../src/app.js';
import { ApiClient } from '../client/ApiClient.js';

dotenv.config();

// Argumentos CLI
const args = process.argv.slice(2);
const keepRecord = args.includes('--keep');
const targetUrlIndex = args.indexOf('--url');
const customUrl = targetUrlIndex !== -1 ? args[targetUrlIndex + 1] : process.env.TEST_API_URL;

async function runUploadVerification() {
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║   COMPROBACIÓN DEL FLUJO DE SUBIDA DE ARCHIVOS (DRIVE + CLIENTE + BD) ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

  let server: Server | null = null;
  let baseUrl = customUrl;

  try {
    // ------------------------------------------------------------------------
    // PASO 1: Determinar el servidor backend objetivo
    // ------------------------------------------------------------------------
    if (!baseUrl) {
      console.log('🚀 [1/6] Iniciando servidor Express local en puerto efímero para pruebas...');
      server = app.listen(0);
      await new Promise<void>((resolve) => {
        server!.once('listening', () => resolve());
      });
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 3000;
      baseUrl = `http://localhost:${port}`;
      console.log(`   ✅ Servidor local escuchando en: ${baseUrl}\n`);
    } else {
      console.log(`📡 [1/6] Conectando con servidor especificado: ${baseUrl}\n`);
    }

    // Instanciar el cliente frontend ApiClient apuntando a nuestra URL
    const api = new ApiClient({
      baseUrl,
      storage: null // En Node usamos memoria en lugar de localStorage
    });

    // ------------------------------------------------------------------------
    // PASO 2: Obtener token de autenticación (RBAC)
    // ------------------------------------------------------------------------
    console.log('🔐 [2/6] Obteniendo credenciales de autenticación...');
    const tokenRes = await api.getTestToken();
    if (!tokenRes.success || !tokenRes.token) {
      throw new Error(`No se pudo obtener el token de prueba: ${JSON.stringify(tokenRes)}`);
    }
    api.setToken(tokenRes.token);
    console.log(`   ✅ Token de sesión generado para: ${tokenRes.user.gmail} (Rol: ${tokenRes.user.nombre_rol})`);
    console.log(`   🔑 Token: ${tokenRes.token.slice(0, 25)}... [truncado]\n`);

    // ------------------------------------------------------------------------
    // PASO 3: Verificar estado de configuración de Google Drive en el backend
    // ------------------------------------------------------------------------
    console.log('☁️  [3/6] Verificando credenciales de Google Drive en backend (/api/repositorios/drive/status)...');
    const driveStatus = await api.getDriveConfigStatus();
    console.log(`   • Servicio: ${driveStatus.service}`);
    console.log(`   • Configurado: ${driveStatus.configured ? '✅ SÍ' : '❌ NO'}`);
    console.log(`   • Método: ${driveStatus.method}`);
    console.log(`   • Carpeta Destino (Folder ID): ${driveStatus.defaultFolderId}`);

    if (!driveStatus.configured) {
      throw new Error(
        'Google Drive no está configurado en las variables de entorno (.env). ' +
        'Revisa GOOGLE_DRIVE_CLIENT_EMAIL y GOOGLE_DRIVE_PRIVATE_KEY.'
      );
    }
    console.log('');

    // ------------------------------------------------------------------------
    // PASO 4: Preparar archivo de prueba en memoria
    // ------------------------------------------------------------------------
    console.log('📄 [4/6] Creando archivo de prueba en memoria...');
    const timestamp = new Date().toISOString();
    const testFileName = `test_upload_${Date.now()}.txt`;
    const testFileContent = [
      '=====================================================',
      ' ARCHIVO DE PRUEBA DE SUBIDA AUTOMATIZADA',
      '=====================================================',
      `Fecha de generación: ${timestamp}`,
      'Origen: scripts/test_upload_flow.ts',
      'Método: ApiClient.subirArchivo() -> Google Drive Resumable Upload',
      '====================================================='
    ].join('\n');

    const testFile = new File([Buffer.from(testFileContent, 'utf-8')], testFileName, {
      type: 'text/plain'
    });
    console.log(`   • Nombre: ${testFileName}`);
    console.log(`   • Tamaño: ${testFile.size} bytes`);
    console.log(`   • Tipo MIME: ${testFile.type}\n`);

    // ------------------------------------------------------------------------
    // PASO 5: Ejecutar el método cliente `api.subirArchivo(...)`
    // ------------------------------------------------------------------------
    console.log('📤 [5/6] Ejecutando ApiClient.subirArchivo() (Flujo oficial de cliente)...');
    console.log('   (Pidiendo URL prefirmada -> enviando binario a Google Drive -> registrando en Neon DB)');

    const uploadResult = await api.subirArchivo(testFile, {
      nom_arch: testFileName,
      categoria: 'Pruebas',
      descripcion: `Subida de comprobación realizada automáticamente el ${timestamp}`,
      resumen: 'Prueba de integración extremo a extremo del flujo de almacenamiento.',
      palabras_clave: ['test', 'verificacion', 'drive', 'ci-cd'],
      contexto: 'Comprobación de variables de entorno y conexión con Drive',
      onProgress: (percent, loaded, total) => {
        console.log(`   ⏳ Progreso de subida a Google Drive: ${percent}% (${loaded}/${total} bytes)`);
      }
    });

    console.log('\n   🎉 ¡Subida completada con éxito!');
    console.log(`   • Google Drive File ID: ${uploadResult.driveFileId}`);
    console.log(`   • URL de Visualización: ${uploadResult.viewUrl}`);

    if (uploadResult.repositorio) {
      console.log(`   • ID en Base de Datos (Neon DB): ${uploadResult.repositorio.id}`);
      console.log(`   • Nombre registrado: ${uploadResult.repositorio.nom_arch}`);
      console.log(`   • Categoría: ${uploadResult.repositorio.categoria}`);
      console.log(`   • Ruta en DB: ${uploadResult.repositorio.ruta_arch}`);
    } else {
      throw new Error('El backend no retornó el registro del repositorio.');
    }
    console.log('');

    // ------------------------------------------------------------------------
    // PASO 6: Validar persistencia en base de datos Neon DB
    // ------------------------------------------------------------------------
    console.log('🔍 [6/6] Verificando consulta del registro guardado en Neon DB (/api/repositorios/:id)...');
    const repoFromDb = await api.getRepositorioById(uploadResult.repositorio.id);
    if (repoFromDb && repoFromDb.id === uploadResult.repositorio.id) {
      console.log(`   ✅ Registro verificado correctamente en base de datos (ID ${repoFromDb.id})`);
    } else {
      throw new Error(`No se pudo verificar el registro ${uploadResult.repositorio.id} en la base de datos.`);
    }

    // Limpieza opcional del registro de prueba en la BD
    if (!keepRecord) {
      console.log(`\n🧹 Limpiando registro de prueba de Neon DB (ID: ${uploadResult.repositorio.id})...`);
      await api.deleteRepositorio(uploadResult.repositorio.id);
      console.log('   ✅ Registro de prueba eliminado de la base de datos (puedes usar --keep si deseas conservarlo).');
    } else {
      console.log(`\n📌 Registro de prueba conservado en base de datos con ID ${uploadResult.repositorio.id} (--keep activo).`);
    }

    console.log('\n══════════════════════════════════════════════════════════════════════');
    console.log('  RESULTADO: TODO EL FLUJO FUNCIONA CORRECTAMENTE CON EL .ENV ACTUAL ');
    console.log('══════════════════════════════════════════════════════════════════════\n');

  } catch (error: any) {
    console.error('\n❌ ERROR DURANTE LA VERIFICACIÓN DEL FLUJO:');
    console.error(`   Mensaje: ${error?.message || error}`);
    if (error?.status) console.error(`   Status HTTP: ${error.status}`);
    if (error?.endpoint) console.error(`   Endpoint: ${error.endpoint}`);

    const detailsStr = typeof error?.details === 'string' ? error.details : JSON.stringify(error?.details || '');
    if (detailsStr.includes('Service Accounts do not have storage quota') || detailsStr.includes('storageQuotaExceeded')) {
      console.log('\n💡 [DIAGNÓSTICO ESPECÍFICO DE GOOGLE DRIVE]');
      console.log('   Google Drive API rechaza la subida porque la "Cuenta de Servicio" (Service Account)');
      console.log('   no posee cuota de almacenamiento propia en carpetas de cuentas personales (@gmail.com).');
      console.log('\n   Para solucionarlo tienes 2 opciones compatibles con este proyecto:');
      console.log('   1. Método 2 (Recomendado para @gmail.com personal): Configurar OAuth2 con Refresh Token.');
      console.log('      Agrega a tu .env:');
      console.log('      • GOOGLE_DRIVE_CLIENT_ID=...');
      console.log('      • GOOGLE_DRIVE_CLIENT_SECRET=...');
      console.log('      • GOOGLE_DRIVE_REFRESH_TOKEN=...');
      console.log('      (Ver guía detallada en README_GOOGLE_DRIVE.md > Método 2)');
      console.log('   2. Google Workspace Shared Drive: Si cuentas con una "Unidad Compartida" (Shared Drive),');
      console.log('      mueve la carpeta a la Unidad Compartida y usa ese GOOGLE_DRIVE_FOLDER_ID.');
    } else if (error?.details) {
      console.error(`   Detalles:`, error.details);
    }
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
    }
  }
}

runUploadVerification();
