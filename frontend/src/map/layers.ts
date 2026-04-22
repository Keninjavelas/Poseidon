import type { Feature, FeatureCollection, Point, Polygon } from 'geojson';
import {
  GEO_ENTITIES,
  ZONE_GEOMETRIES,
  type GeoEntity,
  type SystemState,
} from '@/simulation/models';

type EntityProperties = {
  id: string;
  entityType: GeoEntity['type'];
  color: string;
  fillPct?: number;
  status?: string;
  moisture?: number;
  rainfall?: number;
};

function getTankColor(fillPct: number): string {
  if (fillPct > 0.7) return '#16a34a';
  if (fillPct > 0.35) return '#f59e0b';
  return '#dc2626';
}

function getSensorColor(status: string): string {
  return status === 'online' ? '#22c55e' : '#ef4444';
}

export function buildTankFeatures(state: SystemState): FeatureCollection<Point, EntityProperties> {
  const features: Array<Feature<Point, EntityProperties>> = GEO_ENTITIES
    .filter((entity) => entity.type === 'tank')
    .map((entity) => {
      const tank = state.tanks[entity.id];
      const fillPct = tank ? tank.volumeLiters / Math.max(tank.capacityLiters, 1) : 0;
      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: entity.coordinates,
        },
        properties: {
          id: entity.id,
          entityType: 'tank',
          color: getTankColor(fillPct),
          fillPct,
        },
      };
    });

  return { type: 'FeatureCollection', features };
}

export function buildSensorFeatures(state: SystemState): FeatureCollection<Point, EntityProperties> {
  const features: Array<Feature<Point, EntityProperties>> = GEO_ENTITIES
    .filter((entity) => entity.type === 'sensor')
    .map((entity) => {
      const rainfall = state.rainfall[entity.id];
      const status = rainfall?.status ?? 'offline';
      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: entity.coordinates,
        },
        properties: {
          id: entity.id,
          entityType: 'sensor',
          color: getSensorColor(status),
          status,
          rainfall: rainfall?.mmPerHour ?? 0,
        },
      };
    });

  return { type: 'FeatureCollection', features };
}

export function buildZoneFeatures(state: SystemState): FeatureCollection<Polygon, EntityProperties> {
  const features: Array<Feature<Polygon, EntityProperties>> = ZONE_GEOMETRIES.map((zone) => {
    const moisture = state.soil[zone.id]?.moisturePct ?? 0;
    return {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [zone.coordinates],
      },
      properties: {
        id: zone.id,
        entityType: 'zone',
        color: '#0284c7',
        moisture,
      },
    };
  });

  return { type: 'FeatureCollection', features };
}
