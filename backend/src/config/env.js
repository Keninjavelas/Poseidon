'use strict';

require('dotenv/config');

const { z } = require('zod');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
  MQTT_BROKER_URL: z.string().min(1),
  CORS_ORIGIN: z.string().min(1),
  JWT_SECRET: z.string().min(16).default('poseidon-dev-secret-change-me'),
  AUTH_MODE: z.enum(['required', 'optional', 'disabled']).default('optional'),
  SIM_INTERVAL_MS: z.coerce.number().int().positive().default(1000),
});

function getEnv(runtimeEnv = process.env) {
  return envSchema.parse(runtimeEnv);
}

module.exports = { getEnv, envSchema };