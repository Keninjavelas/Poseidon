// Feature: poseidon-smart-water-hub, Property 13: Required environment variable startup guard
'use strict';

/**
 * Validates: Requirements 14.8
 *
 * Property 13: Required environment variable startup guard
 * For any required backend environment variable (DATABASE_URL, MQTT_BROKER_URL,
 * WS_PORT, CORS_ORIGIN) that is absent from the process environment at startup,
 * the backend process SHALL log a descriptive error message identifying the missing
 * variable and exit with a non-zero status code.
 */

const fc = require('fast-check');
const { validateEnv } = require('../server');

const REQUIRED_VARS = ['DATABASE_URL', 'MQTT_BROKER_URL', 'WS_PORT', 'CORS_ORIGIN'];

describe('Property 13: Required environment variable startup guard', () => {
  let exitSpy;
  let errorSpy;

  beforeEach(() => {
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('does not call process.exit when all required vars are present', () => {
    const env = {
      DATABASE_URL: 'postgresql://localhost/test',
      MQTT_BROKER_URL: 'mqtt://localhost:1883',
      WS_PORT: '8080',
      CORS_ORIGIN: 'http://localhost:3000',
    };
    validateEnv(env);
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('Property 13: calls process.exit(1) for any non-empty subset of missing required vars', () => {
    fc.assert(
      fc.property(
        fc.subarray(REQUIRED_VARS, { minLength: 1 }),
        (missingVars) => {
          exitSpy.mockClear();
          errorSpy.mockClear();

          // Build env with all vars present, then remove the missing ones
          const env = {
            DATABASE_URL: 'postgresql://localhost/test',
            MQTT_BROKER_URL: 'mqtt://localhost:1883',
            WS_PORT: '8080',
            CORS_ORIGIN: 'http://localhost:3000',
          };
          for (const name of missingVars) {
            delete env[name];
          }

          validateEnv(env);

          // process.exit(1) must have been called
          expect(exitSpy).toHaveBeenCalledWith(1);

          // Each missing var must appear in a [FATAL] log message
          const loggedMessages = errorSpy.mock.calls.map((c) => c[0]);
          for (const name of missingVars) {
            expect(
              loggedMessages.some((m) => m.includes('[FATAL]') && m.includes(name))
            ).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
