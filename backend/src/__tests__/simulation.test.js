'use strict';

const fc = require('fast-check');
const { sampleRainfall, sampleQuality, sampleSoilMoisture, allocateWater } = require('../services/simulation');

// Feature: poseidon-smart-water-hub, Property 2: Rainfall generator range
// Validates: Requirements 2.6
describe('Property 2: Rainfall generator range', () => {
  test('sampleRainfall always returns a value in [0, 80]', () => {
    fc.assert(
      fc.property(fc.integer(), (_seed) => {
        const v = sampleRainfall();
        return v >= 0 && v <= 80;
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: poseidon-smart-water-hub, Property 3: Quality sensor generator ranges
// Validates: Requirements 2.7
describe('Property 3: Quality sensor generator ranges', () => {
  test('sampleQuality always returns values within specified ranges', () => {
    fc.assert(
      fc.property(fc.integer(), (_seed) => {
        const q = sampleQuality();
        return (
          q.ph >= 5.5 && q.ph <= 8.5 &&
          q.tds_ppm >= 50 && q.tds_ppm <= 800 &&
          q.turbidity_ntu >= 0 && q.turbidity_ntu <= 100
        );
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: poseidon-smart-water-hub, Property 4: Soil moisture generator range
// Validates: Requirements 2.8
describe('Property 4: Soil moisture generator range', () => {
  test('sampleSoilMoisture always returns a value in [10, 90]', () => {
    fc.assert(
      fc.property(fc.integer(), (_seed) => {
        const v = sampleSoilMoisture();
        return v >= 10 && v <= 90;
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: poseidon-smart-water-hub, Property 5: Harvested-before-municipal water source priority
// Validates: Requirements 2.3, 2.4
describe('Property 5: Harvested-before-municipal water source priority', () => {
  test('allocateWater draws harvested water first and only uses municipal for excess demand', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1000 }),
        fc.float({ min: Math.fround(0.01), max: 1000 }),
        (demand, tankVolume) => {
          const result = allocateWater(demand, tankVolume);

          // harvestedUsed = min(demand, tankVolume)
          const expectedHarvested = Math.min(demand, tankVolume);
          if (Math.abs(result.harvestedUsed - expectedHarvested) > 1e-6) return false;

          // waterSource = 'municipal' only when demand > tankVolume
          if (demand > tankVolume && result.waterSource !== 'municipal') return false;
          if (demand <= tankVolume && result.waterSource !== 'harvested') return false;

          // harvestedUsed + municipalUsed === demand (within floating point tolerance)
          if (Math.abs(result.harvestedUsed + result.municipalUsed - demand) > 1e-6) return false;

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
