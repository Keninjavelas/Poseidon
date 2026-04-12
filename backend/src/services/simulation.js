'use strict';

const TANK_CAPACITY = 10000; // liters
const CATCHMENT_COEFF = 0.5;

/**
 * Weighted rainfall distribution:
 * 60% → [0, 5], 30% → [5, 20], 10% → [20, 80] mm/hr
 * @returns {number}
 */
function sampleRainfall() {
  const r = Math.random();
  if (r < 0.6) {
    return Math.random() * 5;
  } else if (r < 0.9) {
    return 5 + Math.random() * 15;
  } else {
    return 20 + Math.random() * 60;
  }
}

/**
 * @returns {{ ph: number, tds_ppm: number, turbidity_ntu: number }}
 */
function sampleQuality() {
  return {
    ph: 5.5 + Math.random() * 3,           // [5.5, 8.5]
    tds_ppm: 50 + Math.random() * 750,      // [50, 800]
    turbidity_ntu: Math.random() * 100,     // [0, 100]
  };
}

/**
 * @returns {number} soil_moisture_percent ∈ [10, 90]
 */
function sampleSoilMoisture() {
  return 10 + Math.random() * 80;
}

/**
 * Pure function: harvested-before-municipal allocation.
 * @param {number} demand - liters needed
 * @param {number} tankVolume - available harvested liters
 * @returns {{ harvestedUsed: number, municipalUsed: number, newTankVolume: number, waterSource: string }}
 */
function allocateWater(demand, tankVolume) {
  if (tankVolume >= demand) {
    return {
      harvestedUsed: demand,
      municipalUsed: 0,
      newTankVolume: tankVolume - demand,
      waterSource: 'harvested',
    };
  } else {
    return {
      harvestedUsed: tankVolume,
      municipalUsed: demand - tankVolume,
      newTankVolume: 0,
      waterSource: 'municipal',
    };
  }
}

/**
 * Starts the telemetry simulator.
 * @param {import('mqtt').MqttClient} mqttClient
 * @param {Function} dbQuery - pg query function
 * @param {number} [intervalMs=5000]
 * @returns {NodeJS.Timeout}
 */
function startSimulator(mqttClient, dbQuery, intervalMs = 5000) {
  let tankVolume = 5000;

  const tick = async () => {
    const timestamp = new Date().toISOString();

    // 1. Rainfall
    const rainfall = sampleRainfall();

    // 2. Harvest increase
    const harvestIncrease = rainfall * CATCHMENT_COEFF * intervalMs / 1000 / 3600;
    tankVolume = Math.min(tankVolume + harvestIncrease, TANK_CAPACITY);

    // 3. Quality
    const quality = sampleQuality();

    // 4. Soil moisture
    const soilMoisture = sampleSoilMoisture();

    // 5. Irrigation demand
    const irrigationDemand = soilMoisture * 0.5;

    // 6. Allocation
    const allocation = allocateWater(irrigationDemand, tankVolume);
    tankVolume = allocation.newTankVolume;

    // 7. DB writes
    const writes = async () => {
      await dbQuery(
        'INSERT INTO "Rainfall_Log" (timestamp, precipitation_rate_mm_hr, station_id) VALUES ($1, $2, $3)',
        [timestamp, rainfall, 'sim-01']
      );
      await dbQuery(
        'INSERT INTO "Storage_Tanks" (timestamp, tank_id, volume_liters, capacity_liters) VALUES ($1, $2, $3, $4)',
        [timestamp, 'tank-01', tankVolume, TANK_CAPACITY]
      );
      await dbQuery(
        'INSERT INTO "Quality_Sensors" (timestamp, sensor_id, ph, tds_ppm, turbidity_ntu) VALUES ($1, $2, $3, $4, $5)',
        [timestamp, 'quality-01', quality.ph, quality.tds_ppm, quality.turbidity_ntu]
      );
      await dbQuery(
        'INSERT INTO "Irrigation_Zones" (timestamp, zone_id, soil_moisture_percent, irrigation_demand_liters, water_source) VALUES ($1, $2, $3, $4, $5)',
        [timestamp, 'zone-01', soilMoisture, irrigationDemand, allocation.waterSource]
      );
      await dbQuery(
        'INSERT INTO "Overall_Usage" (timestamp, municipal_liters, harvested_liters, total_liters) VALUES ($1, $2, $3, $4)',
        [timestamp, allocation.municipalUsed, allocation.harvestedUsed, irrigationDemand]
      );
    };

    try {
      await writes();
    } catch (err) {
      console.error(`[${new Date().toISOString()}] Simulator DB write error:`, err.message);
      setTimeout(async () => {
        try {
          await writes();
        } catch (retryErr) {
          console.error(`[${new Date().toISOString()}] Simulator DB retry failed:`, retryErr.message);
        }
      }, 10000);
    }

    // 8. MQTT publishes
    mqttClient.publish('poseidon/sensors/rainfall', JSON.stringify({
      precipitation_rate_mm_hr: rainfall,
      station_id: 'sim-01',
      timestamp,
    }));

    mqttClient.publish('poseidon/sensors/tanks', JSON.stringify({
      tank_id: 'tank-01',
      volume_liters: tankVolume,
      capacity_liters: TANK_CAPACITY,
      timestamp,
    }));

    mqttClient.publish('poseidon/sensors/quality', JSON.stringify({
      sensor_id: 'quality-01',
      ph: quality.ph,
      tds_ppm: quality.tds_ppm,
      turbidity_ntu: quality.turbidity_ntu,
      timestamp,
    }));

    mqttClient.publish('poseidon/sensors/irrigation', JSON.stringify({
      zone_id: 'zone-01',
      soil_moisture_percent: soilMoisture,
      irrigation_demand_liters: irrigationDemand,
      water_source: allocation.waterSource,
      timestamp,
    }));

    mqttClient.publish('poseidon/sensors/usage', JSON.stringify({
      municipal_liters: allocation.municipalUsed,
      harvested_liters: allocation.harvestedUsed,
      total_liters: irrigationDemand,
      timestamp,
    }));
  };

  const interval = setInterval(tick, intervalMs);
  interval.unref?.();
  return interval;
}

module.exports = { sampleRainfall, sampleQuality, sampleSoilMoisture, allocateWater, startSimulator };
