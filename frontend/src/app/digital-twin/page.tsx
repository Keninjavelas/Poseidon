'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { useWebSocket } from '@/lib/useWebSocket';
import { api } from '@/lib/api';
import { useStore } from '@/store/useStore';
import type { SimulationEvent } from '@/simulation/events';

const MapView = dynamic(() => import('@/map/MapView').then((mod) => mod.MapView), { ssr: false });
const Scene = dynamic(() => import('@/3d/Scene').then((mod) => mod.Scene), { ssr: false });

type CameraMode = 'free' | 'top-down' | 'follow';

export default function DigitalTwinPage() {
  const { subscribe } = useWebSocket();

  const [cameraMode, setCameraMode] = useState<CameraMode>('free');
  const [timelinePct, setTimelinePct] = useState(0);

  const uiMode = useStore((state) => state.uiMode);
  const setUiMode = useStore((state) => state.setUiMode);
  const systemState = useStore((state) => state.systemState);
  const selectedEntity = useStore((state) => state.selectedEntity);
  const wsStatus = useStore((state) => state.wsStatus);
  const chaos = useStore((state) => state.chaos);
  const setChaos = useStore((state) => state.setChaos);
  const timeControl = useStore((state) => state.timeControl);
  const setSystemState = useStore((state) => state.setSystemState);
  const setTimeControl = useStore((state) => state.setTimeControl);

  useEffect(() => {
    let mounted = true;

    api
      .getTwinState()
      .then((response) => {
        if (!mounted) return;
        setSystemState(response.state);
        setTimeControl(response.control.paused, response.control.speed);
      })
      .catch(() => {
        // Gracefully rely on websocket stream only.
      });

    const unsubscribeState = subscribe('system_state', (payload) => {
      setSystemState(payload as typeof systemState);
    });

    const unsubscribeControl = subscribe('system_control', (payload) => {
      const control = payload as { paused?: boolean; speed?: number };
      setTimeControl(Boolean(control.paused), Number(control.speed ?? 1));
    });

    return () => {
      mounted = false;
      unsubscribeState();
      unsubscribeControl();
    };
  }, [setSystemState, setTimeControl, subscribe]);

  const healthLabel = useMemo(() => {
    if (wsStatus !== 'connected') return 'degraded';
    if (systemState.alerts.some((alert) => alert.severity === 'critical')) return 'critical';
    return 'healthy';
  }, [systemState.alerts, wsStatus]);

  const timelineLabel = useMemo(
    () => new Date(systemState.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    [systemState.timestamp],
  );

  const avgRain = useMemo(() => {
    const values = Object.values(systemState.rainfall);
    if (!values.length) return 0;
    return values.reduce((sum, item) => sum + item.mmPerHour, 0) / values.length;
  }, [systemState.rainfall]);

  const injectEvent = async (event: SimulationEvent) => {
    try {
      await api.twinInjectEvent(event);
    } catch {
      // Keep UI responsive even if command path fails.
    }
  };

  const onPlay = async () => {
    setTimeControl(false, timeControl.speed);
    try {
      const response = await api.twinPlay();
      setTimeControl(response.control.paused, response.control.speed);
    } catch {
      // Local UI state already updated.
    }
  };

  const onPause = async () => {
    setTimeControl(true, timeControl.speed);
    try {
      const response = await api.twinPause();
      setTimeControl(response.control.paused, response.control.speed);
    } catch {
      // Local UI state already updated.
    }
  };

  const onSetSpeed = async (nextSpeed: number) => {
    setTimeControl(timeControl.isPaused, nextSpeed);
    try {
      const response = await api.twinSetSpeed(nextSpeed);
      setTimeControl(response.control.paused, response.control.speed);
    } catch {
      // Local UI state already updated.
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Digital Twin Control Room</h2>
          <p className="text-xs text-slate-500">Map, 3D, and dashboard synchronized by a canonical deterministic state.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(['dashboard', 'map', '3d'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setUiMode(mode)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                uiMode === mode ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {mode.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-4">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          {uiMode === 'map' && <MapView />}
          {uiMode === '3d' && <Scene cameraMode={cameraMode} />}
          {uiMode === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <MetricCard label="Avg Rainfall" value={`${avgRain.toFixed(2)} mm/hr`} />
              <MetricCard label="Temperature" value={`${systemState.temperatureC.toFixed(1)} C`} />
              <MetricCard label="Simulation Time" value={timelineLabel} />
            </div>
          )}
        </section>

        <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col gap-4">
          <div className="rounded-lg border border-slate-200 p-3">
            <div className="text-xs text-slate-500">System Health</div>
            <div className={`text-sm font-semibold ${healthLabel === 'healthy' ? 'text-emerald-600' : healthLabel === 'critical' ? 'text-red-600' : 'text-amber-600'}`}>
              {healthLabel.toUpperCase()}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Time Control</span>
              <span className="text-xs text-slate-500">x{timeControl.speed.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={timelinePct}
              onChange={(event) => setTimelinePct(Number(event.target.value))}
            />
            <div className="text-[11px] text-slate-500">Timeline scrubber (future: historical replay cursor)</div>
            <div className="flex gap-2">
              <button onClick={onPlay} className="px-2 py-1 text-xs rounded bg-emerald-600 text-white">Play</button>
              <button onClick={onPause} className="px-2 py-1 text-xs rounded bg-slate-700 text-white">Pause</button>
              {[0.5, 1, 2, 4].map((speed) => (
                <button
                  key={speed}
                  onClick={() => onSetSpeed(speed)}
                  className={`px-2 py-1 text-xs rounded border ${timeControl.speed === speed ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-3 flex flex-col gap-2">
            <div className="text-xs text-slate-500">Chaos Mode</div>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={chaos.enabled}
                onChange={(event) => setChaos(event.target.checked, chaos.intensity)}
              />
              Enable delay, packet loss, duplicates, sensor drift
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(chaos.intensity * 100)}
              onChange={(event) => setChaos(chaos.enabled, Number(event.target.value) / 100)}
            />
            <div className="text-[11px] text-slate-500">Intensity: {(chaos.intensity * 100).toFixed(0)}%</div>
          </div>

          {uiMode === '3d' && (
            <div className="rounded-lg border border-slate-200 p-3 flex flex-col gap-2">
              <div className="text-xs text-slate-500">Camera</div>
              <div className="flex gap-2">
                {(['free', 'top-down', 'follow'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setCameraMode(mode)}
                    className={`px-2 py-1 text-xs rounded border ${cameraMode === mode ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-600'}`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-lg border border-slate-200 p-3 flex flex-col gap-2">
            <div className="text-xs text-slate-500">Inject Events</div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => injectEvent({ type: 'RAIN_SPIKE', intensity: 8 })}
                className="px-2 py-1 rounded bg-blue-600 text-white text-xs"
              >
                Rain Spike
              </button>
              <button
                onClick={() => injectEvent({ type: 'TANK_FAILURE', tankId: 'T1' })}
                className="px-2 py-1 rounded bg-red-600 text-white text-xs"
              >
                Tank Failure
              </button>
              <button
                onClick={() => injectEvent({ type: 'SENSOR_OFFLINE', sensorId: 'S2' })}
                className="px-2 py-1 rounded bg-amber-600 text-white text-xs"
              >
                Sensor Offline
              </button>
              <button
                onClick={() =>
                  injectEvent({
                    type: 'PIPE_LEAK',
                    location: { lng: 72.8799, lat: 19.0779 },
                  })
                }
                className="px-2 py-1 rounded bg-violet-600 text-white text-xs"
              >
                Pipe Leak
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-3">
            <div className="text-xs text-slate-500">Selection Sync</div>
            <div className="text-sm text-slate-700">
              {selectedEntity ? `${selectedEntity.type.toUpperCase()} ${selectedEntity.id}` : 'No entity selected'}
            </div>
          </div>

          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <div className="text-xs text-red-700 mb-1">Alerts Overlay</div>
            <div className="max-h-28 overflow-auto flex flex-col gap-1">
              {systemState.alerts.slice(0, 6).map((alert) => (
                <div key={alert.id} className="text-[11px] text-red-700">
                  [{alert.severity.toUpperCase()}] {alert.message}
                </div>
              ))}
              {systemState.alerts.length === 0 && <div className="text-[11px] text-red-500">No active alerts</div>}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-lg font-semibold text-slate-800">{value}</div>
    </div>
  );
}
