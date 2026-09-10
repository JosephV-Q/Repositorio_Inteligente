import app from './app.js';
import dotenv from 'dotenv';
import { ensureDatabaseTables } from './db/init.js';

dotenv.config();

const PORT = process.env.PORT || 3000;

async function startServer(): Promise<void> {
  // Asegura que todas las tablas de Neon DB existan al iniciar la instancia del worker
  try {
    await ensureDatabaseTables();
  } catch (err: any) {
    console.error('⚠️ [Server Worker Init]:', err?.message);
  }

  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo localmente en http://localhost:${PORT}`);
    console.log(`📡 Endpoint de prueba: http://localhost:${PORT}/api/health`);
  });
}

startServer();
