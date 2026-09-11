import 'dotenv/config';
import http from 'http';
import app from '../src/app.js';
import { RepositoriosModule, ComparativasModule } from '../src/modules/index.js';
import { ApiClient } from '../client/ApiClient.js';
import { Repositorio, Comparativa } from '../client/index.js';

async function testSearchFeature() {
  console.log('--- TEST 1: Método interno RepositoriosModule.buscar ---');
  // 1. Probar búsqueda interna en Repositorios
  const queryInterna = 'auditoría';
  console.log(`Buscando internamente en Repositorios con query: "${queryInterna}"...`);
  const resInterna = await RepositoriosModule.buscar(queryInterna, { limit: 5, modo: 'hibrido' });
  console.log(`✅ Resultados encontrados: ${resInterna.length}`);
  if (resInterna.length > 0) {
    console.log('Primer resultado:', {
      id: resInterna[0].id,
      nom_arch: resInterna[0].nom_arch,
      similarity: resInterna[0].similarity,
      matchType: resInterna[0].matchType
    });
  }

  console.log('\n--- TEST 2: Método interno ComparativasModule.buscar ---');
  const resCompInterna = await ComparativasModule.buscar('prueba', { limit: 5, modo: 'hibrido' });
  console.log(`✅ Resultados en Comparativas: ${resCompInterna.length}`);

  console.log('\n--- TEST 3: Servidor efímero y rutas API /api/repositorios/buscar ---');
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const port = address.port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`Servidor de prueba iniciado en ${baseUrl}`);

  try {
    const client = new ApiClient({
      baseUrl,
      autoSetAuthHeader: true,
      storageKey: 'test_search_token'
    });

    // Obtener token de sesión de prueba
    const tokenRes = await client.getTestToken();
    client.setToken(tokenRes.token);
    console.log('✅ Token de prueba obtenido para:', tokenRes.user.gmail, 'Rol:', tokenRes.user.nombre_rol);

    // 3.1 Insertar un documento de prueba con texto para procesar con IA
    console.log('Insertando documento de prueba con procesarTextoDocumento...');
    const docCreado = await client.procesarTextoDocumento({
      texto: 'Auditoría interna de seguridad informática y protección de datos 2026. Se evaluaron vulnerabilidades en los servidores y el cifrado de bases de datos.',
      nom_arch: 'auditoria_seguridad_2026.txt',
      categoria: 'Seguridad'
    });
    console.log('✅ Documento creado con ID:', docCreado.id, 'Nombre:', docCreado.nom_arch);

    // 3.2 Probar búsqueda semántica que coincida conceptualmente
    console.log('Probando búsqueda semántica por similitud con query: "ciberseguridad y servidores"...');
    const busquedaDocs = await client.buscarRepositorios({
      texto: 'ciberseguridad y servidores',
      limit: 3,
      modo: 'semantico'
    });
    console.log(`✅ Documentos encontrados por búsqueda semántica: ${busquedaDocs.length}`);
    if (busquedaDocs.length > 0) {
      console.log('Documento top:', busquedaDocs[0].nom_arch, 'Similitud:', busquedaDocs[0].similarity, 'Tipo:', busquedaDocs[0].matchType);
    }

    // 3.3 Probar Repositorio.buscar() clase modelo
    console.log('Probando clase modelo Repositorio.buscar()...');
    const docsModel = await Repositorio.buscar('vulnerabilidades en sistemas', { limit: 3 }, client);
    console.log(`✅ Documentos encontrados vía clase modelo: ${docsModel.length}`);
    if (docsModel.length > 0) {
      console.log('Instancia Repositorio:', docsModel[0].nom_arch, 'Similitud:', docsModel[0].similarity);
    }

    // Limpiar documento de prueba
    await client.deleteRepositorio(docCreado.id);
    console.log(`🧹 Documento de prueba ID ${docCreado.id} eliminado correctamente.`);

    console.log('\n🎉 TODOS LOS TESTS DE BÚSQUEDA PASARON SATISFACTORIAMENTE!');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    console.log('Servidor efímero detenido.');
  }
}

testSearchFeature().catch((err) => {
  console.error('❌ Error en prueba de búsqueda:', err);
  process.exit(1);
});
