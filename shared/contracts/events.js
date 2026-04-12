'use strict';

const { z } = require('zod');

const isoDateTime = z.string().datetime({ offset: true });

const baseEnvelopeSchema = z.object({
  topic: z.string().min(1),
  messageId: z.string().min(8),
  receivedAt: isoDateTime,
  payload: z.record(z.unknown()),
});

const rainfallSchema = z.object({
  timestamp: isoDateTime,
  module: z.literal('rainfall'),
  sensor_id: z.string().min(1),
  precipitation_rate_mm_hr: z.number().nonnegative(),
  station_id: z.string().min(1),
  message_id: z.string().min(8).optional(),
});

const harvestingSchema = z.object({
  timestamp: isoDateTime,
  module: z.literal('harvesting'),
  sensor_id: z.string().min(1),
  tank_id: z.string().min(1),
  volume_liters: z.number().nonnegative(),
  capacity_liters: z.number().positive(),
  fill_percent: z.number().min(0).max(100),
  message_id: z.string().min(8).optional(),
});

const qualitySchema = z.object({
  timestamp: isoDateTime,
  module: z.literal('quality'),
  sensor_id: z.string().min(1),
  ph: z.number().min(0).max(14),
  tds_ppm: z.number().nonnegative(),
  turbidity_ntu: z.number().nonnegative(),
  alert_level: z.enum(['normal', 'watch', 'warning', 'critical']).default('normal'),
  message_id: z.string().min(8).optional(),
});

const agricultureSchema = z.object({
  timestamp: isoDateTime,
  module: z.literal('agriculture'),
  sensor_id: z.string().min(1),
  zone_id: z.string().min(1),
  soil_moisture_percent: z.number().min(0).max(100),
  irrigation_demand_liters: z.number().nonnegative(),
  water_source: z.enum(['harvested', 'municipal']),
  message_id: z.string().min(8).optional(),
});

const usageSchema = z.object({
  timestamp: isoDateTime,
  module: z.literal('usage'),
  sensor_id: z.string().min(1),
  municipal_liters: z.number().nonnegative(),
  harvested_liters: z.number().nonnegative(),
  total_liters: z.number().nonnegative(),
  message_id: z.string().min(8).optional(),
});

const alertSchema = z.object({
  timestamp: isoDateTime,
  module: z.literal('alerts'),
  sensor_id: z.string().min(1),
  node_id: z.string().min(1),
  alert_type: z.enum(['Contaminant Detected', 'Pipe Blockage', 'Severe Discoloration', 'Foreign Object']),
  confidence_score: z.number().min(0).max(1),
  raw_detection_json: z.record(z.unknown()),
  message_id: z.string().min(8).optional(),
});

const moduleSchemas = {
  rainfall: rainfallSchema,
  harvesting: harvestingSchema,
  quality: qualitySchema,
  agriculture: agricultureSchema,
  usage: usageSchema,
  alerts: alertSchema,
};

function parseModuleEvent(moduleName, payload) {
  const schema = moduleSchemas[moduleName];
  if (!schema) {
    throw new Error(`Unsupported module: ${moduleName}`);
  }
  return schema.parse(payload);
}

module.exports = {
  baseEnvelopeSchema,
  moduleSchemas,
  parseModuleEvent,
};