'use strict';

const { startServer } = require('../server');

startServer().catch((error) => {
  console.error('[FATAL] Failed to start API service:', error);
  process.exit(1);
});
