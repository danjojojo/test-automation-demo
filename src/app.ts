import express from 'express';
import { createOpenApiRouter } from './generated/openapi-router.js';

export function createApp(): express.Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use(createOpenApiRouter());

  app.use((req, res) => {
    res.status(404).json({
      error: 'Not Found',
      method: req.method,
      path: req.path
    });
  });

  return app;
}
