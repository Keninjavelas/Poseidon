'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl, { Map as MapboxMap, type MapMouseEvent } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  buildSensorFeatures,
  buildTankFeatures,
  buildZoneFeatures,
} from '@/map/layers';
import { GEO_ENTITIES } from '@/simulation/models';
import { useStore } from '@/store/useStore';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

const TANK_SOURCE = 'tanks-source';
const SENSOR_SOURCE = 'sensors-source';
const ZONE_SOURCE = 'zones-source';

export function MapView() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const [hoverLabel, setHoverLabel] = useState<string>('');

  const systemState = useStore((state) => state.systemState);
  const selectedEntity = useStore((state) => state.selectedEntity);
  const setSelectedEntity = useStore((state) => state.setSelectedEntity);

  const tankFeatures = useMemo(() => buildTankFeatures(systemState), [systemState]);
  const sensorFeatures = useMemo(() => buildSensorFeatures(systemState), [systemState]);
  const zoneFeatures = useMemo(() => buildZoneFeatures(systemState), [systemState]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !MAPBOX_TOKEN) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [72.878, 19.077],
      zoom: 14.1,
      antialias: true,
    });
    mapRef.current = map;

    map.on('load', () => {
      map.addSource(TANK_SOURCE, { type: 'geojson', data: tankFeatures });
      map.addSource(SENSOR_SOURCE, { type: 'geojson', data: sensorFeatures });
      map.addSource(ZONE_SOURCE, { type: 'geojson', data: zoneFeatures });

      map.addLayer({
        id: 'zones-layer',
        type: 'fill',
        source: ZONE_SOURCE,
        paint: {
          'fill-color': [
            'interpolate',
            ['linear'],
            ['coalesce', ['get', 'moisture'], 0],
            0,
            '#ef4444',
            50,
            '#f59e0b',
            100,
            '#16a34a',
          ],
          'fill-opacity': 0.35,
        },
      });

      map.addLayer({
        id: 'rain-heatmap',
        type: 'heatmap',
        source: SENSOR_SOURCE,
        paint: {
          'heatmap-weight': ['coalesce', ['get', 'rainfall'], 0],
          'heatmap-intensity': 0.6,
          'heatmap-radius': 20,
          'heatmap-opacity': 0.55,
        },
      });

      map.addLayer({
        id: 'tank-layer',
        type: 'circle',
        source: TANK_SOURCE,
        paint: {
          'circle-color': ['get', 'color'],
          'circle-radius': 10,
          'circle-stroke-color': '#111827',
          'circle-stroke-width': 1,
        },
      });

      map.addLayer({
        id: 'sensor-layer',
        type: 'circle',
        source: SENSOR_SOURCE,
        paint: {
          'circle-color': ['get', 'color'],
          'circle-radius': 6,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1,
        },
      });

      const handleClick = (e: MapMouseEvent) => {
        const feature = e.features?.[0];
        const id = String(feature?.properties?.id ?? '');
        const entityType = feature?.properties?.entityType as 'tank' | 'sensor' | 'zone' | undefined;
        if (!id || !entityType) return;

        const entity = GEO_ENTITIES.find((item) => item.id === id && item.type === entityType);
        if (entity) {
          setSelectedEntity(entity);
        }
      };

      const hoverHandler = (e: MapMouseEvent) => {
        const feature = e.features?.[0];
        if (!feature) {
          setHoverLabel('');
          return;
        }
        const id = String(feature.properties?.id ?? '');
        const type = String(feature.properties?.entityType ?? 'entity');
        setHoverLabel(`${type.toUpperCase()} ${id}`);
      };

      map.on('click', 'tank-layer', handleClick);
      map.on('click', 'sensor-layer', handleClick);
      map.on('click', 'zones-layer', handleClick);
      map.on('mousemove', 'tank-layer', hoverHandler);
      map.on('mousemove', 'sensor-layer', hoverHandler);
      map.on('mousemove', 'zones-layer', hoverHandler);
      map.on('mouseleave', 'tank-layer', () => setHoverLabel(''));
      map.on('mouseleave', 'sensor-layer', () => setHoverLabel(''));
      map.on('mouseleave', 'zones-layer', () => setHoverLabel(''));
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [sensorFeatures, setSelectedEntity, tankFeatures, zoneFeatures]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getSource(TANK_SOURCE) || !map.getSource(SENSOR_SOURCE) || !map.getSource(ZONE_SOURCE)) {
      return;
    }

    // Patch source data only, avoiding React-level full rerenders.
    (map.getSource(TANK_SOURCE) as mapboxgl.GeoJSONSource).setData(tankFeatures);
    (map.getSource(SENSOR_SOURCE) as mapboxgl.GeoJSONSource).setData(sensorFeatures);
    (map.getSource(ZONE_SOURCE) as mapboxgl.GeoJSONSource).setData(zoneFeatures);
  }, [tankFeatures, sensorFeatures, zoneFeatures]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-700">
        Set NEXT_PUBLIC_MAPBOX_TOKEN to enable Map Mode.
      </div>
    );
  }

  return (
    <div className="relative h-[60vh] rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="absolute top-3 left-3 rounded-md bg-white/90 px-3 py-1 text-xs text-slate-600">
        {hoverLabel || 'Hover entities for metrics'}
      </div>
      {selectedEntity && (
        <div className="absolute bottom-3 left-3 rounded-md bg-slate-900 text-white px-3 py-2 text-xs">
          Selected: {selectedEntity.type.toUpperCase()} {selectedEntity.id}
        </div>
      )}
    </div>
  );
}
