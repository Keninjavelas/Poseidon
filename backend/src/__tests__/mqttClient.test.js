'use strict';

// Feature: poseidon-smart-water-hub, Property 8: MQTT sensor message routing
// Validates: Requirements 4.3

// Feature: poseidon-smart-water-hub, Property 9: Malformed JSON resilience
// Validates: Requirements 4.5

const fc = require('fast-check');
const { handleMessage } = require('../services/mqttClient');

// ---------------------------------------------------------------------------
// Property 8: MQTT sensor message routing
// ---------------------------------------------------------------------------

describe('Property 8: MQTT sensor message routing', () => {
  const isoTimestamp = fc.constant(new Date().toISOString());

  test('poseidon/sensors/rainfall routes only to Rainfall_Log', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          timestamp: isoTimestamp,
          precipitation_rate_mm_hr: fc.float({ min: 0, max: 80, noNaN: true }),
          station_id: fc.string({ minLength: 1, maxLength: 32 }),
        }),
        async (payload) => {
          const sqlCalls = [];
          const mockDbQuery = jest.fn(async (sql) => { sqlCalls.push(sql); });
          const mockBroadcast = jest.fn();

          await handleMessage(
            'poseidon/sensors/rainfall',
            Buffer.from(JSON.stringify(payload)),
            mockDbQuery,
            mockBroadcast
          );

          expect(mockDbQuery).toHaveBeenCalledTimes(1);
          expect(sqlCalls[0]).toContain('"Rainfall_Log"');
          expect(sqlCalls[0]).not.toContain('"Storage_Tanks"');
          expect(sqlCalls[0]).not.toContain('"Quality_Sensors"');
          expect(sqlCalls[0]).not.toContain('"Irrigation_Zones"');
          expect(sqlCalls[0]).not.toContain('"Overall_Usage"');
          expect(sqlCalls[0]).not.toContain('"Anomaly_Alerts"');
        }
      ),
      { numRuns: 100 }
    );
  });

  test('poseidon/sensors/tanks routes only to Storage_Tanks', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          timestamp: isoTimestamp,
          tank_id: fc.string({ minLength: 1, maxLength: 32 }),
          volume_liters: fc.float({ min: 0, max: 100000, noNaN: true }),
          capacity_liters: fc.float({ min: 1, max: 100000, noNaN: true }),
        }),
        async (payload) => {
          const sqlCalls = [];
          const mockDbQuery = jest.fn(async (sql) => { sqlCalls.push(sql); });
          const mockBroadcast = jest.fn();

          await handleMessage(
            'poseidon/sensors/tanks',
            Buffer.from(JSON.stringify(payload)),
            mockDbQuery,
            mockBroadcast
          );

          expect(mockDbQuery).toHaveBeenCalledTimes(1);
          expect(sqlCalls[0]).toContain('"Storage_Tanks"');
          expect(sqlCalls[0]).not.toContain('"Rainfall_Log"');
          expect(sqlCalls[0]).not.toContain('"Quality_Sensors"');
          expect(sqlCalls[0]).not.toContain('"Irrigation_Zones"');
          expect(sqlCalls[0]).not.toContain('"Overall_Usage"');
          expect(sqlCalls[0]).not.toContain('"Anomaly_Alerts"');
        }
      ),
      { numRuns: 100 }
    );
  });

  test('poseidon/sensors/quality routes only to Quality_Sensors', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          timestamp: isoTimestamp,
          sensor_id: fc.string({ minLength: 1, maxLength: 32 }),
          ph: fc.float({ min: 5.5, max: 8.5, noNaN: true }),
          tds_ppm: fc.float({ min: 50, max: 800, noNaN: true }),
          turbidity_ntu: fc.float({ min: 0, max: 100, noNaN: true }),
        }),
        async (payload) => {
          const sqlCalls = [];
          const mockDbQuery = jest.fn(async (sql) => { sqlCalls.push(sql); });
          const mockBroadcast = jest.fn();

          await handleMessage(
            'poseidon/sensors/quality',
            Buffer.from(JSON.stringify(payload)),
            mockDbQuery,
            mockBroadcast
          );

          expect(mockDbQuery).toHaveBeenCalledTimes(1);
          expect(sqlCalls[0]).toContain('"Quality_Sensors"');
          expect(sqlCalls[0]).not.toContain('"Rainfall_Log"');
          expect(sqlCalls[0]).not.toContain('"Storage_Tanks"');
          expect(sqlCalls[0]).not.toContain('"Irrigation_Zones"');
          expect(sqlCalls[0]).not.toContain('"Overall_Usage"');
          expect(sqlCalls[0]).not.toContain('"Anomaly_Alerts"');
        }
      ),
      { numRuns: 100 }
    );
  });

  test('poseidon/sensors/irrigation routes only to Irrigation_Zones', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          timestamp: isoTimestamp,
          zone_id: fc.string({ minLength: 1, maxLength: 32 }),
          soil_moisture_percent: fc.float({ min: 10, max: 90, noNaN: true }),
          irrigation_demand_liters: fc.float({ min: 0, max: 10000, noNaN: true }),
          water_source: fc.constantFrom('harvested', 'municipal'),
        }),
        async (payload) => {
          const sqlCalls = [];
          const mockDbQuery = jest.fn(async (sql) => { sqlCalls.push(sql); });
          const mockBroadcast = jest.fn();

          await handleMessage(
            'poseidon/sensors/irrigation',
            Buffer.from(JSON.stringify(payload)),
            mockDbQuery,
            mockBroadcast
          );

          expect(mockDbQuery).toHaveBeenCalledTimes(1);
          expect(sqlCalls[0]).toContain('"Irrigation_Zones"');
          expect(sqlCalls[0]).not.toContain('"Rainfall_Log"');
          expect(sqlCalls[0]).not.toContain('"Storage_Tanks"');
          expect(sqlCalls[0]).not.toContain('"Quality_Sensors"');
          expect(sqlCalls[0]).not.toContain('"Overall_Usage"');
          expect(sqlCalls[0]).not.toContain('"Anomaly_Alerts"');
        }
      ),
      { numRuns: 100 }
    );
  });

  test('poseidon/sensors/usage routes only to Overall_Usage', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          timestamp: isoTimestamp,
          municipal_liters: fc.float({ min: 0, max: 1000000, noNaN: true }),
          harvested_liters: fc.float({ min: 0, max: 1000000, noNaN: true }),
          total_liters: fc.float({ min: 0, max: 2000000, noNaN: true }),
        }),
        async (payload) => {
          const sqlCalls = [];
          const mockDbQuery = jest.fn(async (sql) => { sqlCalls.push(sql); });
          const mockBroadcast = jest.fn();

          await handleMessage(
            'poseidon/sensors/usage',
            Buffer.from(JSON.stringify(payload)),
            mockDbQuery,
            mockBroadcast
          );

          expect(mockDbQuery).toHaveBeenCalledTimes(1);
          expect(sqlCalls[0]).toContain('"Overall_Usage"');
          expect(sqlCalls[0]).not.toContain('"Rainfall_Log"');
          expect(sqlCalls[0]).not.toContain('"Storage_Tanks"');
          expect(sqlCalls[0]).not.toContain('"Quality_Sensors"');
          expect(sqlCalls[0]).not.toContain('"Irrigation_Zones"');
          expect(sqlCalls[0]).not.toContain('"Anomaly_Alerts"');
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 9: Malformed JSON resilience
// ---------------------------------------------------------------------------

describe('Property 9: Malformed JSON resilience', () => {
  const topics = [
    'poseidon/sensors/rainfall',
    'poseidon/sensors/tanks',
    'poseidon/sensors/quality',
    'poseidon/sensors/irrigation',
    'poseidon/sensors/usage',
    'poseidon/alerts/optical',
  ];

  test('does not throw and does not call dbQuery for any non-JSON string on any topic', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string().filter((s) => {
          try {
            JSON.parse(s);
            return false;
          } catch {
            return true;
          }
        }),
        fc.constantFrom(...topics),
        async (s, topic) => {
          const mockDbQuery = jest.fn();
          const mockBroadcast = jest.fn();

          // Must not throw
          await expect(
            handleMessage(topic, Buffer.from(s), mockDbQuery, mockBroadcast)
          ).resolves.toBeUndefined();

          // Must not call DB
          expect(mockDbQuery).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });
});
