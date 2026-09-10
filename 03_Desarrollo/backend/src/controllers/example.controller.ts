import { Request, Response } from 'express';

export const getStatus = (req: Request, res: Response): void => {
  res.status(200).json({
    status: 'online',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
};

export const getHello = (req: Request, res: Response): void => {
  const name = (req.query.name as string) || 'Mundo';
  res.status(200).json({
    message: `¡Hola, ${name}! Bienvenido a Vercel Functions + Express.`,
    success: true
  });
};
