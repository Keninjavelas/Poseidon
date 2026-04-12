'use strict';

const { randomUUID } = require('crypto');

const TANK_CAPACITY = 10000;
const CATCHMENT_COEFF = 1.2;
const MIN_MUNICIPAL_SHARE = 0.2;

function sampleRainfall() {
  const r = Math.random();
  if (r < 0.6) return Math.random() * 5;
  if (r < 0.9) return 5 + Math.random() * 15;
  return 20 + Math.random() * 60;
}

function sampleQuality() {
  return {
    ph: 5.5 + Math.random() * 3,
    tds_ppm: 50 + Math.random() * 750,
    turbidity_ntu: Math.random() * 100,
  };
}

function sampleSoilMoisture() {
  return 10 + Math.random() * 80;
}

function allocateWater(demand, tankVolume, minMunicipalShare = 0) {
  const boundedMunicipalShare = Math.min(Math.max(minMunicipalShare, 0), 1);
  const harvestedCap = demand * (1 - boundedMunicipalShare);
  const harvestedTarget = Math.min(demand, harvestedCap);
  const harvestedUsed = Math.min(tankVolume, harvestedTarget);
  const municipalUsed = Math.max(0, demand - harvestedUsed);

  if (municipalUsed <= 0) {
    return {
      harvestedUsed,
      municipalUsed: 0,
      newTankVolume: tankVolume - harvestedUsed,
      waterSource: 'harvested',
    };
  }

  return {
    harvestedUsed,
    municipalUsed,
    newTankVolume: Math.max(0, tankVolume - harvestedUsed),
    waterSource: 'municipal',
  };
}

function buildTelemetryFrame(state, intervalMs) {
  const timestamp = new Date().toISOString();
  const rainfall = sampleRainfall();
  const harvestIncrease = (rainfall * CATCHMENT_COEFF * intervalMs) / 1000 / 3600;
  state.tankVolume = Math.min(state.tankVolume + harvestIncrease, TANK_CAPACITY);

  const quality = sampleQuality();
  const soilMoisture = sampleSoilMoisture();
  const irrigationDemand = soilMoisture * 0.5;
  const allocation = allocateWater(irrigationDemand, state.tankVolume, MIN_MUNICIPAL_SHARE);
  state.tankVolume = allocation.newTankVolume;

  return [
    {
      topic: 'poseidon/rainfall/sim-01',
      payload: {
        module: 'rainfall',
        sensor_id: 'sim-01',
        message_id: randomUUID(),
        timestamp,
        precipitation_rate_mm_hr: rainfall,
        station_id: 'station-sim-01',
      },
    },
    {
      topic: 'poseidon/harvesting/tank-01',
      payload: {
        module: 'harvesting',
        sensor_id: 'tank-01',
        message_id: randomUUID(),
        timestamp,
        tank_id: 'tank-01',
        volume_liters: state.tankVolume,
        capacity_liters: TANK_CAPACITY,
        fill_percent: (state.tankVolume / TANK_CAPACITY) * 100,
      },
    },
    {
      topic: 'poseidon/quality/quality-01',
      payload: {
        module: 'quality',
        sensor_id: 'quality-01',
        message_id: randomUUID(),
        timestamp,
        ph: quality.ph,
        tds_ppm: quality.tds_ppm,
        turbidity_ntu: quality.turbidity_ntu,
        alert_level: quality.turbidity_ntu > 70 ? 'warning' : 'normal',
      },
    },
    {
      topic: 'poseidon/agriculture/zone-01',
      payload: {
        module: 'agriculture',
        sensor_id: 'zone-01',
        message_id: randomUUID(),
        timestamp,
        zone_id: 'zone-01',
        soil_moisture_percent: soilMoisture,
        irrigation_demand_liters: irrigationDemand,
        water_source: allocation.waterSource,
      },
    },
    {
      topic: 'poseidon/usage/master-01',
      payload: {
        module: 'usage',
        sensor_id: 'master-01',
        message_id: randomUUID(),
        timestamp,
        municipal_liters: allocation.municipalUsed,
        harvested_liters: allocation.harvestedUsed,
        total_liters: irrigationDemand,
      },
    },
  ];
}

function startTelemetrySimulator(mqttClient, intervalMs = 5000) {
  // Balanced start so both harvested (blue) and municipal (orange) remain visible.
  const state = { tankVolume: 4000 };

  const tick = () => {
    const frames = buildTelemetryFrame(state, intervalMs);
    for (const frame of frames) {
      mqttClient.publish(frame.topic, JSON.stringify(frame.payload), { qos: 1 });
    }
  };

  tick();
  const interval = setInterval(tick, intervalMs);
  interval.unref?.();
  return interval;
}

module.exports = {
  startTelemetrySimulator,
  buildTelemetryFrame,
  sampleRainfall,
  sampleQuality,
  sampleSoilMoisture,
  allocateWater,
};