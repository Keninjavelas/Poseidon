'use strict';

const rateLimit = require('express-rate-limit');

function createApiRateLimit() {
  if (process.env.NODE_ENV !== 'production' && process.env.RATE_LIMITING_ENABLED !== 'true') {
    return (_req, _res, next) => next();
  }

  return rateLimit({
    windowMs: 60_000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false,
  });
}

module.exports = { createApiRateLimit };