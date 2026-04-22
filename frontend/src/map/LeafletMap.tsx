'use client';

import { memo, useCallback, useMemo } from 'react';
import { ensureLeafletSetup } from '@/lib/leafletSetup';
import { useWebSocket } from '@/lib/useWebSocket';
import { useStore } from '@/store/useStore';
import { GEO_ENTITIES } from '@/simulation/models';
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip } from 'react-leaflet';

ensureLeafletSetup();

type Status = 'normal' | 'warning' | 'critical';
type LatLng = [number, number];

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
      return '#dc2626';
    case 'warning':
      return '#f59e0b';
    default:
      return '#16a34a';
  }
}

function tankStatus(fillPct: number, failure: boolean): Status {
  if (failure || fillPct < 0.15) return 'critical';
  if (fillPct < 0.4) return 'warning';
  return 'normal';
}

function sensorStatus(online: boolean, rainfallMmHr: number): Status {
  if (!online) return 'critical';
  if (rainfallMmHr >= 30) return 'warning';
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
        return {
          id: entity.id,
          name: tank?.name ?? entity.id,
          center: [entity.coordinates[1], entity.coordinates[0]] as LatLng,
          color: statusColor(status),
          status,
          selected: selectedEntity?.id === entity.id,
          fillPct,
          rainfallMmHr: avgRainfall,
          volumeLiters: tank?.volumeLiters ?? 0,
          capacityLiters: tank?.capacityLiters ?? 1,
        };
      }),
    [avgRainfall, selectedEntity?.id, systemState.tanks],
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

  return (
    <div className="relative h-[60vh] overflow-hidden rounded-2xl border border-slate-200 shadow-sm bg-slate-50">
      <MapContainer center={DEFAULT_CENTER} zoom={13} scrollWheelZoom className="h-full w-full">
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

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