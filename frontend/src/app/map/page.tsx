'use client';

import dynamic from 'next/dynamic';
import { useStore } from '@/store/useStore';

const LeafletMap = dynamic(() => import('@/map/LeafletMap').then((mod) => mod.LeafletMap), { ssr: false });

export default function MapPage() {
  const systemState = useStore((state) => state.systemState);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-800">Geospatial Map</h2>
        <p className="text-sm text-slate-500">Leaflet + OpenStreetMap, no API key required.</p>
      </div>
      <LeafletMap />

      <div className="rounded-xl border border-slate-200 bg-slate-900 p-4 text-xs font-mono text-emerald-400 overflow-auto max-h-[200px]">
        <h3 className="text-slate-400 mb-2 uppercase tracking-wider font-bold">Live Data Debug Panel</h3>
        <pre>{JSON.stringify(systemState, null, 2)}</pre>
      </div>
    </div>
  );
}
