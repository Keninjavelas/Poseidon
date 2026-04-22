'use strict';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

class SeededRandom {
  constructor(seed) {
    this.state = seed || 1;
  }

  next() {
    this.state ^= this.state << 13;
    this.state ^= this.state >>> 17;
    this.state ^= this.state << 5;
    return ((this.state >>> 0) % 100000) / 100000;
  }
}

function createInitialState(now = Date.now()) {
  return {
    timestamp: now,
    temperatureC: 27,
    rainfall: {
      S1: { sensorId: 'S1', mmPerHour: 2.8, status: 'online' },
      S2: { sensorId: 'S2', mmPerHour: 3.1, status: 'online' },
      S3: { sensorId: 'S3', mmPerHour: 2.5, status: 'online' },
    },
    tanks: {
      T1: {
        id: 'T1',
        name: 'North Reservoir',
        capacityLiters: 50000,
        volumeLiters: 32500,
        catchmentAreaM2: 1200,
        efficiency: 0.82,
        irrigationOutflowLps: 4,
        usageOutflowLps: 6,
        failure: false,
      },
      T2: {
        id: 'T2',
        name: 'South Reservoir',
        capacityLiters: 75000,
        volumeLiters: 42000,
        catchmentAreaM2: 1600,
        efficiency: 0.79,
        irrigationOutflowLps: 5,
        usageOutflowLps: 8,
        failure: false,
      },
    },
    soil: {
      Z1: {
        zoneId: 'Z1',
        moisturePct: 49,
        absorptionRate: 0.11,
        evaporationRate: 0.05,
        irrigationUsageLps: 1.8,
      },
      Z2: {
        zoneId: 'Z2',
        moisturePct: 54,
        absorptionRate: 0.09,
        evaporationRate: 0.045,
        irrigationUsageLps: 2.2,
      },
    },
    usage: {
      Z1: { zoneId: 'Z1', municipalLiters: 1200, harvestedLiters: 2200, totalLiters: 3400 },
      Z2: { zoneId: 'Z2', municipalLiters: 1500, harvestedLiters: 2800, totalLiters: 4300 },
    },
    alerts: [],
  };
}

function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

function createDigitalTwinService(redisBus, logger, options = {}) {
  const config = {
    seed: Number(options.seed || 1337),
    timestepMs: Number(options.timestepMs || 1000),
    baseRainMmHr: Number(options.baseRainMmHr || 3),
    rainAmplitudeMmHr: Number(options.rainAmplitudeMmHr || 2),
    rainFrequencyHz: Number(options.rainFrequencyHz || 1 / (60 * 30)),
    baseTemperatureC: Number(options.baseTemperatureC || 27),
    temperatureAmplitudeC: Number(options.temperatureAmplitudeC || 8),
  };

  const rng = new SeededRandom(config.seed);
  let state = createInitialState();
  let paused = false;
  let speed = 1;
  let rainSpike = 0;
  const eventQueue = [];
  let intervalRef = null;

  function enqueueAlert(alert) {
    state.alerts.unshift(alert);
    state.alerts = state.alerts.slice(0, 50);
  }

  function calculateEvaporation(temperatureC, dtSeconds) {
    const temperatureFactor = clamp((temperatureC - 10) / 30, 0.2, 1.8);
    return 0.015 * temperatureFactor * dtSeconds;
  }

  function processEvents(nextState) {
    while (eventQueue.length > 0) {
      const event = eventQueue.shift();
      if (!event) continue;

      switch (event.type) {
        case 'RAIN_SPIKE':
          rainSpike += Number(event.intensity || 0);
          enqueueAlert({
            id: `alert-${nextState.timestamp}-rain-spike`,
            timestamp: nextState.timestamp,
            severity: 'info',
            sourceId: 'weather',
            message: `Rain spike injected: +${Number(event.intensity || 0).toFixed(1)} mm/hr`,
          });
          break;
        case 'TANK_FAILURE': {
          const tank = nextState.tanks[event.tankId];
          if (tank) {
            tank.failure = true;
            enqueueAlert({
              id: `alert-${nextState.timestamp}-tank-failure-${event.tankId}`,
              timestamp: nextState.timestamp,
              severity: 'critical',
              sourceId: event.tankId,
              message: `Tank ${event.tankId} failure simulated`,
            });
          }
          break;
        }
        case 'SENSOR_OFFLINE': {
          const sensor = nextState.rainfall[event.sensorId];
          if (sensor) {
            sensor.status = 'offline';
            enqueueAlert({
              id: `alert-${nextState.timestamp}-sensor-offline-${event.sensorId}`,
              timestamp: nextState.timestamp,
              severity: 'warning',
              sourceId: event.sensorId,
              message: `Sensor ${event.sensorId} offline`,
            });
          }
          break;
        }
        case 'PIPE_LEAK': {
          enqueueAlert({
            id: `alert-${nextState.timestamp}-pipe-leak`,
            timestamp: nextState.timestamp,
            severity: 'critical',
            sourceId: 'network',
            message: `Pipe leak detected near (${Number(event.location?.lng || 0).toFixed(4)}, ${Number(event.location?.lat || 0).toFixed(4)})`,
          });
          Object.values(nextState.usage).forEach((usage) => {
            usage.totalLiters *= 1.08;
            usage.municipalLiters *= 1.14;
          });
          break;
        }
        default:
          break;
      }
    }
  }

  function step(deltaMs) {
    const dtSeconds = deltaMs / 1000;
    const nextState = cloneState(state);
    nextState.timestamp += deltaMs;

    const t = nextState.timestamp / 1000;
    const tempWave =
      config.baseTemperatureC +
      config.temperatureAmplitudeC * Math.sin(2 * Math.PI * config.rainFrequencyHz * t * 0.5);
    nextState.temperatureC = tempWave;

    processEvents(nextState);

    const rainBase =
      config.baseRainMmHr +
      config.rainAmplitudeMmHr * Math.sin(2 * Math.PI * config.rainFrequencyHz * t);

    Object.values(nextState.rainfall).forEach((sensor) => {
      if (sensor.status === 'offline') {
        sensor.mmPerHour = 0;
        return;
      }
      const noise = (rng.next() - 0.5) * 0.4;
      sensor.mmPerHour = clamp(rainBase + rainSpike + noise, 0, 60);
    });

    const rainfallReadings = Object.values(nextState.rainfall);
    const avgRainMmHr =
      rainfallReadings.reduce((acc, reading) => acc + reading.mmPerHour, 0) / Math.max(rainfallReadings.length, 1);
    const rainMetersPerSecond = avgRainMmHr / 1000 / 3600;

    Object.values(nextState.tanks).forEach((tank) => {
      const inflowLps = tank.failure ? 0 : rainMetersPerSecond * tank.catchmentAreaM2 * tank.efficiency * 1000;
      const outflowLps = tank.irrigationOutflowLps + tank.usageOutflowLps;
      tank.volumeLiters = clamp(tank.volumeLiters + (inflowLps - outflowLps) * dtSeconds, 0, tank.capacityLiters);
      if (tank.volumeLiters <= 0.01 * tank.capacityLiters) {
        enqueueAlert({
          id: `alert-${nextState.timestamp}-tank-${tank.id}`,
          timestamp: nextState.timestamp,
          severity: 'warning',
          sourceId: tank.id,
          message: `Tank ${tank.name} critically low`,
        });
      }
    });

    const evaporation = calculateEvaporation(nextState.temperatureC, dtSeconds);
    Object.values(nextState.soil).forEach((soil) => {
      const rainfallGain = avgRainMmHr * soil.absorptionRate * dtSeconds * 0.01;
      const irrigationLoss = soil.irrigationUsageLps * dtSeconds * 0.01;
      soil.moisturePct = clamp(soil.moisturePct + rainfallGain - evaporation - irrigationLoss, 0, 100);

      const usage = nextState.usage[soil.zoneId];
      if (usage) {
        const harvestedLiters = clamp(soil.moisturePct * 20, 0, 3200);
        const municipalLiters = clamp(3600 - harvestedLiters, 0, 3600);
        usage.harvestedLiters = harvestedLiters;
        usage.municipalLiters = municipalLiters;
        usage.totalLiters = harvestedLiters + municipalLiters;
      }

      if (soil.moisturePct < 20) {
        enqueueAlert({
          id: `alert-${nextState.timestamp}-soil-${soil.zoneId}`,
          timestamp: nextState.timestamp,
          severity: 'critical',
          sourceId: soil.zoneId,
          message: `Zone ${soil.zoneId} moisture critically low`,
        });
      }
    });

    rainSpike *= 0.9;
    state = nextState;
    return state;
  }

  async function publishState() {
    await redisBus.publish('poseidon:processed', {
      channel: 'system_state',
      data: state,
    });
  }

  async function publishControl() {
    await redisBus.publish('poseidon:processed', {
      channel: 'system_control',
      data: getControlState(),
    });
  }

  async function tick() {
    if (paused) {
      await publishState();
      return;
    }

    const delta = config.timestepMs * speed;
    step(delta);
    await publishState();
  }

  function start() {
    if (intervalRef) return;
    intervalRef = setInterval(() => {
      tick().catch((error) => {
        logger.error({ error }, 'digital twin tick failed');
      });
    }, config.timestepMs);
    intervalRef.unref?.();
    void Promise.all([publishState(), publishControl()]).catch((error) => {
      logger.error({ error }, 'failed to publish initial digital twin snapshots');
    });
  }

  function stop() {
    if (intervalRef) {
      clearInterval(intervalRef);
      intervalRef = null;
    }
  }

  function getState() {
    return cloneState(state);
  }

  function injectEvent(event) {
    eventQueue.push(event);
  }

  function setPaused(value) {
    paused = Boolean(value);
    void publishControl().catch((error) => {
      logger.error({ error }, 'failed to publish digital twin control update');
    });
  }

  function setSpeed(value) {
    const nextSpeed = Number(value);
    if (Number.isFinite(nextSpeed) && nextSpeed > 0) {
      speed = clamp(nextSpeed, 0.1, 8);
      void publishControl().catch((error) => {
        logger.error({ error }, 'failed to publish digital twin speed update');
      });
    }
  }

  function getControlState() {
    return {
      paused,
      speed,
      timestepMs: config.timestepMs,
    };
  }

  return {
    start,
    stop,
    getState,
    getControlState,
    injectEvent,
    setPaused,
    setSpeed,
  };
}

module.exports = {
  createDigitalTwinService,
  createInitialState,
};
