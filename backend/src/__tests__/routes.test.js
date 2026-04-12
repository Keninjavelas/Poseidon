// Feature: poseidon-smart-water-hub, Property 10: API limit validation
// Validates: Requirements 5.8

'use strict';

jest.mock('../services/db', () => ({
  query: jest.fn().mockResolvedValue({ rows: [] }),
}));

const request = require('supertest');
const fc = require('fast-check');
const createApp = require('../app');

const app = createApp();

const endpoints = [
  '/api/rainfall',
  '/api/harvesting',
  '/api/quality',
  '/api/agriculture',
  '/api/usage',
  '/api/alerts',
];

describe('Property 10: API limit validation — limit > 1000 returns 400', () => {
  for (const endpoint of endpoints) {
    test(`${endpoint} returns 400 for any limit > 1000`, async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer({ min: 1001, max: 100000 }), async (limit) => {
          const res = await request(app).get(`${endpoint}?limit=${limit}`);
          expect(res.status).toBe(400);
          expect(res.body).toEqual({ error: 'limit must not exceed 1000' });
        }),
        { numRuns: 100 }
      );
    });
  }
});
