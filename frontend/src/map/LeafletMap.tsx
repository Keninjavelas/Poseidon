'use client';

import { memo, useCallback, useMemo } from 'react';
import { ensureLeafletSetup } from '@/lib/leafletSetup';
import { useWebSocket } from '@/lib/useWebSocket';
import { useStore } from '@/store/useStore';
import { GEO_ENTITIES, ZONE_GEOMETRIES } from '@/simulation/models';
import { CircleMarker, MapContainer, Polygon, Popup, TileLayer, Tooltip } from 'react-leaflet';

type Status = 'normal' | 'warning' | 'critical';
type LatLng = [number, number];

function getMoistureColor(percent: number): string {
  if (percent < 25) return '#dc2626'; // Red (Critical)
  if (percent < 40) return '#f97316'; // Orange (Low)
  if (percent < 70) return '#38bdf8'; // Sky Blue (Normal)
  return '#1d4ed8'; // Blue (Optimal)
}

type MarkerBase = {
  id: string;
  name: string;
  center: LatLng;
  color: string;
  status: Status;
  selected: boolean;
};

type TankMarkerProps = MarkerBase & {
  fillPct: number;
  rainfallMmHr: number;
  volumeLiters: number;
  capacityLiters: number;
};

type SensorMarkerProps = MarkerBase & {
  rainfallMmHr: number;
  online: boolean;
};

const DEFAULT_CENTER: LatLng = [19.076, 72.8777];

function statusColor(status: Status): string {
  switch (status) {
    case 'critical':
      return '#dc2626'; // Red
    case 'warning':
      return '#f97316'; // Orange
    default:
      return '#38bdf8'; // Sky Blue (Healthy/Normal)
  }
}

function tankStatus(fillPct: number, failure: boolean): Status {
  if (failure || fillPct < 0.25) return 'critical';
  if (fillPct < 0.4) return 'warning';
  return 'normal';
}

function sensorStatus(online: boolean, rainfallMmHr: number): Status {
  if (!online) return 'critical';
  if (rainfallMmHr >= 50) return 'critical';
  if (rainfallMmHr >= 20) return 'warning';
  return 'normal';
}

const TankMarker = memo(function TankMarker({
  id,
  name,
  center,
  color,
  status,
  selected,
  fillPct,
  rainfallMmHr,
  volumeLiters,
  capacityLiters,
}: TankMarkerProps) {
  const setSelectedEntity = useStore((state) => state.setSelectedEntity);
  const radius = selected ? 12 : 10;

  const handleClick = useCallback(() => {
    setSelectedEntity({ id, type: 'tank', coordinates: [center[1], center[0]] });
  }, [center, id, setSelectedEntity]);

  return (
    <CircleMarker
      center={center}
      radius={radius}
      pathOptions={{
        color,
        fillColor: color,
        fillOpacity: 0.82,
        weight: selected ? 4 : 2,
      }}
      eventHandlers={{ click: handleClick }}
    >
      <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
        {name}: {(fillPct * 100).toFixed(1)}%
      </Tooltip>
      <Popup>
        <div className="space-y-1">
          <div className="font-semibold text-slate-900">{name}</div>
          <div>Tank level: {(fillPct * 100).toFixed(1)}%</div>
          <div>Volume: {volumeLiters.toFixed(0)} / {capacityLiters.toFixed(0)} L</div>
          <div>Rainfall: {rainfallMmHr.toFixed(1)} mm/hr</div>
          <div>Status: <span style={{ color }}>{status.toUpperCase()}</span></div>
        </div>
      </Popup>
    </CircleMarker>
  );
});

const SensorMarker = memo(function SensorMarker({
  id,
  name,
  center,
  color,
  status,
  selected,
  rainfallMmHr,
  online,
}: SensorMarkerProps) {
  const setSelectedEntity = useStore((state) => state.setSelectedEntity);
  const radius = selected ? 9 : 7;

  const handleClick = useCallback(() => {
    setSelectedEntity({ id, type: 'sensor', coordinates: [center[1], center[0]] });
  }, [center, id, setSelectedEntity]);

  return (
    <CircleMarker
      center={center}
      radius={radius}
      pathOptions={{
        color,
        fillColor: color,
        fillOpacity: 0.86,
        weight: selected ? 3 : 2,
      }}
      eventHandlers={{ click: handleClick }}
    >
      <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
        {name}: {online ? `${rainfallMmHr.toFixed(1)} mm/hr` : 'offline'}
      </Tooltip>
      <Popup>
        <div className="space-y-1">
          <div className="font-semibold text-slate-900">{name}</div>
          <div>Rainfall: {rainfallMmHr.toFixed(1)} mm/hr</div>
          <div>Status: <span style={{ color }}>{status.toUpperCase()}</span></div>
          <div>{online ? 'Sensor online' : 'Sensor offline'}</div>
        </div>
      </Popup>
    </CircleMarker>
  );
});

export function LeafletMap() {
  ensureLeafletSetup();
  useWebSocket();

  const systemState = useStore((state) => state.systemState);
  const selectedEntity = useStore((state) => state.selectedEntity);

  const avgRainfall = useMemo(() => {
    const readings = Object.values(systemState.rainfall);
    if (readings.length === 0) return 0;
    return readings.reduce((sum, reading) => sum + reading.mmPerHour, 0) / readings.length;
  }, [systemState.rainfall]);

  const tanks = useMemo(
    () =>
      GEO_ENTITIES.filter((entity) => entity.type === 'tank').map((entity) => {
        const tank = systemState.tanks[entity.id];
        const fillPct = tank ? tank.volumeLiters / Math.max(tank.capacityLiters, 1) : 0;
        const status = tankStatus(fillPct, tank?.failure ?? false);

        // Find nearest sensor for localized rainfall
        let nearestRainfall = 0;
        let minDistance = Infinity;

        GEO_ENTITIES.filter((e) => e.type === 'sensor').forEach((sensor) => {
          const dist = Math.sqrt(
            Math.pow(entity.coordinates[0] - sensor.coordinates[0], 2) +
              Math.pow(entity.coordinates[1] - sensor.coordinates[1], 2),
          );
          if (dist < minDistance) {
            minDistance = dist;
            nearestRainfall = systemState.rainfall[sensor.id]?.mmPerHour ?? 0;
          }
        });

        return {
          id: entity.id,
          name: tank?.name ?? entity.id,
          center: [entity.coordinates[1], entity.coordinates[0]] as LatLng,
          color: statusColor(status),
          status,
          selected: selectedEntity?.id === entity.id,
          fillPct,
          rainfallMmHr: nearestRainfall,
          volumeLiters: tank?.volumeLiters ?? 0,
          capacityLiters: tank?.capacityLiters ?? 1,
        };
      }),
    [selectedEntity?.id, systemState.rainfall, systemState.tanks],
  );

  const sensors = useMemo(
    () =>
      GEO_ENTITIES.filter((entity) => entity.type === 'sensor').map((entity) => {
        const rainfall = systemState.rainfall[entity.id];
        const online = rainfall?.status === 'online';
        const rainfallMmHr = rainfall?.mmPerHour ?? 0;
        const status = sensorStatus(online, rainfallMmHr);
        return {
          id: entity.id,
          name: entity.id,
          center: [entity.coordinates[1], entity.coordinates[0]] as LatLng,
          color: statusColor(status),
          status,
          selected: selectedEntity?.id === entity.id,
          rainfallMmHr,
          online,
        };
      }),
    [selectedEntity?.id, systemState.rainfall],
  );

  const zones = useMemo(
    () =>
      ZONE_GEOMETRIES.map((geo) => {
        const soil = systemState.soil[geo.id];
        const moisture = soil?.moisturePct ?? 50;
        const color = getMoistureColor(moisture);
        return {
          id: geo.id,
          positions: geo.coordinates.map((c) => [c[1], c[0]] as LatLng),
          moisture,
          color,
          selected: selectedEntity?.id === geo.id,
        };
      }),
    [selectedEntity?.id, systemState.soil],
  );

  return (
    <div className="relative h-[60vh] overflow-hidden rounded-2xl border border-slate-200 shadow-sm bg-slate-50">
      <MapContainer center={DEFAULT_CENTER} zoom={13} scrollWheelZoom className="h-full w-full">
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {zones.map((zone) => (
          <Polygon
            key={zone.id}
            positions={zone.positions}
            pathOptions={{
              fillColor: zone.color,
              fillOpacity: 0.65, // Increased opacity for better visibility
              color: zone.selected ? '#ffffff' : zone.color,
              weight: zone.selected ? 3 : 1,
            }}
          >
            <Tooltip sticky>
              Zone {zone.id}: {zone.moisture.toFixed(1)}% Moisture
            </Tooltip>
          </Polygon>
        ))}

        {tanks.map((tank) => (
          <TankMarker key={tank.id} {...tank} />
        ))}

        {sensors.map((sensor) => (
          <SensorMarker key={sensor.id} {...sensor} />
        ))}
      </MapContainer>

      <div className="pointer-events-none absolute left-3 top-3 rounded-lg bg-white/95 px-3 py-2 text-xs shadow-sm text-slate-700">
        <div className="font-semibold text-slate-900">Leaflet + OpenStreetMap</div>
        <div>Live updates via WebSocket</div>
      </div>

      {selectedEntity && (
        <div className="pointer-events-none absolute left-3 bottom-3 rounded-lg bg-slate-900/90 px-3 py-2 text-xs text-white shadow-sm">
          Selected: {selectedEntity.type.toUpperCase()} {selectedEntity.id}
        </div>
      )}
    </div>
  );
}

export default LeafletMap;