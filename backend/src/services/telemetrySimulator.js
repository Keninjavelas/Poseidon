'use strict';

const { randomUUID } = require('crypto');

const TANK_CAPACITY = 10000;
const CATCHMENT_COEFF = 1.2;
const MIN_MUNICIPAL_SHARE = 0.2;

function sampleRainfall(t = Date.now()) {
  const time = t / 1000;
  const rainfall = 20 + 15 * Math.sin(time / 5) + (Math.random() - 0.5) * 5;
  const finalRain = Math.max(5, Math.min(35, rainfall)); // Ensure it varies between ~5 and 35
  
  console.log(`[SIM] Rainfall: ${finalRain.toFixed(2)} mm/hr`);
  return finalRain;
}

function sampleQuality() {
  return {
    ph: 7.0 + (Math.random() - 0.5) * 2.0,
    tds_ppm: 50 + Math.random() * 600,
    turbidity_ntu: Math.random() * 100,
  };
}

function sampleSoilMoisture(currentMoisture, rainfall, intervalMs, zoneIdx = 0) {
  const time = Date.now() / 1000;
  let moisture = currentMoisture || 50;
  const dt = intervalMs / 1000;
  
  // User logic: 
  // soil.moisturePct += rainfall * 0.2; 
  // soil.moisturePct -= 2; // evaporation 
  // soil.moisturePct -= irrigationUsage * 0.1; 
  
  const irrigationUsage = (100 - moisture) * 0.5; // Simulated irrigation usage
  
  moisture += (rainfall * 0.2) * dt;
  moisture -= 2 * dt; 
  moisture -= (irrigationUsage * 0.1) * dt;
  
  // Add variation: soil.moisturePct += Math.sin(time + zoneId) * 5; 
  moisture += Math.sin(time + zoneIdx) * (5 * dt);
  
  const finalMoisture = Math.max(0, Math.min(100, moisture));
  console.log(`[SIM] Zone ${zoneIdx} Moisture: ${finalMoisture.toFixed(2)}% (Rain: ${rainfall.toFixed(2)})`);
  return finalMoisture;
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
  const now = Date.now();
  const timestamp = new Date(now).toISOString();
  
  const frames = [];

  // Rainfall Sensors: S1, S2, S3
  ['S1', 'S2', 'S3'].forEach((id, idx) => {
    const rainfall = sampleRainfall(now + idx * 1000); // Offset to get different values
    frames.push({
      topic: `poseidon/rainfall/${id}`,
      payload: {
        module: 'rainfall',
        sensor_id: id,
        message_id: randomUUID(),
        timestamp,
        precipitation_rate_mm_hr: rainfall,
        station_id: id,
      },
    });
    // Store latest for other calculations
    state.rainfall = state.rainfall || {};
    state.rainfall[id] = rainfall;
  });

  const avgRainfall = Object.values(state.rainfall).reduce((a, b) => a + b, 0) / 3;

  // Tanks: T1, T2
  ['T1', 'T2'].forEach((id, idx) => {
    state.tanks = state.tanks || {};
    const capacity = id === 'T1' ? 50000 : 75000;
    state.tanks[id] = state.tanks[id] || { volume: capacity * 0.6 };
    
    // User logic: inflow = rainfall * 0.5; outflow = irrigationDemand * 0.3 + usage * 0.2;
    const dt = intervalMs / 1000;
    const currentRain = state.rainfall[idx === 0 ? 'S1' : 'S2'] || avgRainfall;
    
    const inflow = currentRain * 0.5; 
    const irrigationDemand = (100 - (state.soil[`Z${idx + 1}`] || 50)) * (2 + idx);
    const usage = 50 + 10 * Math.sin(now / 10000) + (Math.random() - 0.5) * 5;
    
    const outflow = irrigationDemand * 0.3 + usage * 0.2;
    
    // tank.volume = tank.volume + inflow - outflow;
    state.tanks[id].volume = Math.max(0, Math.min(capacity, state.tanks[id].volume + (inflow - outflow) * dt * 10)); // scaled for visibility
    
    console.log(`[SIM] Tank ${id} Volume: ${state.tanks[id].volume.toFixed(0)}L (Inflow: ${inflow.toFixed(2)}, Outflow: ${outflow.toFixed(2)})`);
    
    frames.push({
      topic: `poseidon/harvesting/${id}`,
      payload: {
        module: 'harvesting',
        sensor_id: id,
        message_id: randomUUID(),
        timestamp,
        tank_id: id,
        volume_liters: state.tanks[id].volume,
        capacity_liters: capacity,
        fill_percent: (state.tanks[id].volume / capacity) * 100,
      },
    });
  });

  // Quality: Q1
  const quality = sampleQuality();
  frames.push({
    topic: 'poseidon/quality/Q1',
    payload: {
      module: 'quality',
      sensor_id: 'Q1',
      message_id: randomUUID(),
      timestamp,
      ph: quality.ph,
      tds_ppm: quality.tds_ppm,
      turbidity_ntu: quality.turbidity_ntu,
      alert_level: quality.turbidity_ntu > 70 ? 'warning' : 'normal',
    },
  });

  // Agriculture Zones: Z1, Z2
  ['Z1', 'Z2'].forEach((id, idx) => {
    state.soil = state.soil || {};
    state.soil[id] = state.soil[id] || 50 + idx * 10;
    
    state.soil[id] = sampleSoilMoisture(state.soil[id], avgRainfall, intervalMs, idx);
    const moisture = state.soil[id];
    
    const irrigationDemand = (100 - moisture) * (2 + idx);
    
    // User logic: usage = baseUsage + 10 * sin(time / 10) + randomNoise
    const time = now / 1000;
    const baseUsage = 50;
    const dynamicUsage = baseUsage + 10 * Math.sin(time / 10) + (Math.random() - 0.5) * 5;
    
    const municipalUsed = dynamicUsage * 0.4;
    const harvestedUsed = dynamicUsage * 0.6;

    frames.push({
      topic: `poseidon/agriculture/${id}`,
      payload: {
        module: 'agriculture',
        sensor_id: id,
        message_id: randomUUID(),
        timestamp,
        zone_id: id,
        soil_moisture_percent: moisture,
        irrigation_demand_liters: irrigationDemand,
        water_source: moisture < 40 ? 'municipal' : 'harvested',
      },
    });

    frames.push({
      topic: `poseidon/usage/${id}`,
      payload: {
        module: 'usage',
        sensor_id: `usage-${id}`,
        message_id: randomUUID(),
        timestamp,
        municipal_liters: municipalUsed,
        harvested_liters: harvestedUsed,
        total_liters: irrigationDemand,
      },
    });
  });

  return frames;
}

function startTelemetrySimulator(mqttClient, intervalMs = 2000) {
  const state = {};

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