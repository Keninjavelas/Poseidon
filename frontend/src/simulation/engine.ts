import {
  DEFAULT_SIMULATION_CONFIG,
  type SimulationConfig,
  type SystemState,
} from '@/simulation/models';
import type { SimulationEvent } from '@/simulation/events';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed || 1;
  }

  next(): number {
    this.state ^= this.state << 13;
    this.state ^= this.state >>> 17;
    this.state ^= this.state << 5;
    return ((this.state >>> 0) % 100000) / 100000;
  }
}

export class SimulationEngine {
  private state: SystemState;
  private config: SimulationConfig;
  private rng: SeededRandom;
  private eventQueue: SimulationEvent[] = [];
  private rainSpike = 0;

  constructor(initialState: SystemState, config: Partial<SimulationConfig> = {}) {
    this.state = structuredClone(initialState);
    this.config = { ...DEFAULT_SIMULATION_CONFIG, ...config };
    this.rng = new SeededRandom(this.config.seed);
  }

  injectEvent(event: SimulationEvent): void {
    this.eventQueue.push(event);
  }

  getState(): SystemState {
    return this.state;
  }

  step(deltaTime: number): SystemState {
    const dtSeconds = deltaTime / 1000;
    const next = structuredClone(this.state);
    next.timestamp += deltaTime;

    const t = next.timestamp / 1000;
    const tempWave =
      this.config.baseTemperatureC +
      this.config.temperatureAmplitudeC * Math.sin(2 * Math.PI * this.config.rainFrequencyHz * t * 0.5);
    next.temperatureC = tempWave;

    this.processEvents(next);

    const rainBase =
      this.config.baseRainMmHr +
      this.config.rainAmplitudeMmHr * Math.sin(2 * Math.PI * this.config.rainFrequencyHz * t);

    for (const sensor of Object.values(next.rainfall)) {
      if (sensor.status === 'offline') {
        sensor.mmPerHour = 0;
        continue;
      }
      const noise = (this.rng.next() - 0.5) * 0.4;
      sensor.mmPerHour = clamp(rainBase + this.rainSpike + noise, 0, 60);
    }

    const avgRainMmHr =
      Object.values(next.rainfall).reduce((acc, r) => acc + r.mmPerHour, 0) /
      Math.max(1, Object.keys(next.rainfall).length);

    const rainMetersPerSecond = avgRainMmHr / 1000 / 3600;

    for (const tank of Object.values(next.tanks)) {
      const inflowLps = tank.failure ? 0 : rainMetersPerSecond * tank.catchmentAreaM2 * tank.efficiency * 1000;
      const outflowLps = tank.irrigationOutflowLps + tank.usageOutflowLps;
      tank.volumeLiters = clamp(
        tank.volumeLiters + (inflowLps - outflowLps) * dtSeconds,
        0,
        tank.capacityLiters,
      );

      if (tank.volumeLiters <= 0.01 * tank.capacityLiters) {
        next.alerts.unshift({
          id: `alert-${next.timestamp}-tank-${tank.id}`,
          timestamp: next.timestamp,
          severity: 'warning',
          sourceId: tank.id,
          message: `Tank ${tank.name} critically low`,
        });
      }
    }

    const evaporation = this.calculateEvaporation(next.temperatureC, dtSeconds);

    for (const soil of Object.values(next.soil)) {
      const rainfallGain = avgRainMmHr * soil.absorptionRate * dtSeconds * 0.01;
      const irrigationLoss = soil.irrigationUsageLps * dtSeconds * 0.01;
      soil.moisturePct = clamp(soil.moisturePct + rainfallGain - evaporation - irrigationLoss, 0, 100);

      const usage = next.usage[soil.zoneId];
      if (usage) {
        const harvestedLiters = clamp(soil.moisturePct * 20, 0, 3200);
        const municipalLiters = clamp(3600 - harvestedLiters, 0, 3600);
        usage.harvestedLiters = harvestedLiters;
        usage.municipalLiters = municipalLiters;
        usage.totalLiters = harvestedLiters + municipalLiters;
      }

      if (soil.moisturePct < 20) {
        next.alerts.unshift({
          id: `alert-${next.timestamp}-soil-${soil.zoneId}`,
          timestamp: next.timestamp,
          severity: 'critical',
          sourceId: soil.zoneId,
          message: `Zone ${soil.zoneId} moisture critically low`,
        });
      }
    }

    next.alerts = next.alerts.slice(0, 40);
    this.rainSpike *= 0.9;
    this.state = next;
    return this.state;
  }

  private calculateEvaporation(temperatureC: number, dtSeconds: number): number {
    const temperatureFactor = clamp((temperatureC - 10) / 30, 0.2, 1.8);
    return 0.015 * temperatureFactor * dtSeconds;
  }

  private processEvents(next: SystemState): void {
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift();
      if (!event) continue;

      switch (event.type) {
        case 'RAIN_SPIKE': {
          this.rainSpike += event.intensity;
          next.alerts.unshift({
            id: `alert-${next.timestamp}-rain-spike`,
            timestamp: next.timestamp,
            severity: 'info',
            sourceId: 'weather',
            message: `Rain spike injected: +${event.intensity.toFixed(1)} mm/hr`,
          });
          break;
        }
        case 'TANK_FAILURE': {
          const tank = next.tanks[event.tankId];
          if (tank) {
            tank.failure = true;
            next.alerts.unshift({
              id: `alert-${next.timestamp}-tank-failure-${event.tankId}`,
              timestamp: next.timestamp,
              severity: 'critical',
              sourceId: event.tankId,
              message: `Tank ${event.tankId} failure simulated`,
            });
          }
          break;
        }
        case 'SENSOR_OFFLINE': {
          const sensor = next.rainfall[event.sensorId];
          if (sensor) {
            sensor.status = 'offline';
            next.alerts.unshift({
              id: `alert-${next.timestamp}-sensor-offline-${event.sensorId}`,
              timestamp: next.timestamp,
              severity: 'warning',
              sourceId: event.sensorId,
              message: `Sensor ${event.sensorId} offline`,
            });
          }
          break;
        }
        case 'PIPE_LEAK': {
          next.alerts.unshift({
            id: `alert-${next.timestamp}-pipe-leak`,
            timestamp: next.timestamp,
            severity: 'critical',
            sourceId: 'network',
            message: `Pipe leak detected near (${event.location.lng.toFixed(4)}, ${event.location.lat.toFixed(4)})`,
          });
          Object.values(next.usage).forEach((usage) => {
            usage.totalLiters *= 1.08;
            usage.municipalLiters *= 1.14;
          });
          break;
        }
      }
    }
  }
}
