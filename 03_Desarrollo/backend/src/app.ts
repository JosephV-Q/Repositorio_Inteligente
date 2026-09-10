import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mainRouter from './routes/index.js';
import { ensureDatabaseTables } from './db/init.js';

const app: Express = express();

// Middlewares globales
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false
  })
);

// Configuración de CORS permisiva temporal (permite cualquier origen, método y cabecera)
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['*'],
    exposedHeaders: ['*'],
    preflightContinue: false,
    optionsSuccessStatus: 204
  })
);
app.options('*', cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Inicialización de base de datos en el ciclo de vida del worker (Vercel Serverless / Node)
app.use(async (_req: Request, _res: Response, next: NextFunction) => {
  try {
    await ensureDatabaseTables();
  } catch (err: any) {
    console.error('⚠️ [Worker DB Init Error]:', err?.message);
  }
  next();
});

// Definición de rutas
app.use(mainRouter);

// Ruta principal por defecto
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'API Express en Vercel Serverless Functions',
    documentation: '/api/health',
  });
});

// Manejo de 404 (Ruta no encontrada)
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `La ruta ${req.originalUrl} no existe.`
  });
});

// Manejo global de errores
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[Error]:', err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'Ocurrió un error inesperado.'
  });
});

export default app;
