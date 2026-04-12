'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const pinoHttp = require('pino-http');
const { createApiRateLimit } = require('./middleware/rateLimit');
const { createAuthMiddleware } = require('./middleware/auth');
const { logger } = require('./lib/logger');

/**
 * Creates and configures the Express application.
 * Registers JSON body parser and CORS middleware.
 * CORS origin is read from the CORS_ORIGIN environment variable.
 *
 * @returns {import('express').Application}
 */
function createApp() {
  const app = express();
  const corsOrigin = process.env.CORS_ORIGIN || '*';
  const authConfig = {
    AUTH_MODE: process.env.AUTH_MODE || 'optional',
    JWT_SECRET: process.env.JWT_SECRET || 'poseidon-dev-secret-change-me',
  };

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(pinoHttp({ logger }));
  app.use(express.json());

  app.use(
    cors({
      origin: corsOrigin,
    })
  );

  app.use(createApiRateLimit());
  app.use(createAuthMiddleware(authConfig, logger));

  app.use('/api/rainfall', require('./routes/rainfall'));
  app.use('/api/harvesting', require('./routes/harvesting'));
  app.use('/api/quality', require('./routes/quality'));
  app.use('/api/agriculture', require('./routes/agriculture'));
  app.use('/api/usage', require('./routes/usage'));
  app.use('/api/alerts', require('./routes/alerts'));
  app.use('/api/auth', require('./routes/auth'));

  // Health check
  app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

  // Global error handler — returns JSON instead of crashing
  app.use((err, _req, res, _next) => {
    console.error('[HTTP] Unhandled error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

module.exports = createApp;
