import dynamic from 'next/dynamic';

const LeafletMap = dynamic(() => import('@/map/LeafletMap').then((mod) => mod.LeafletMap), { ssr: false });

export default function MapPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-800">Geospatial Map</h2>
        <p className="text-sm text-slate-500">Leaflet + OpenStreetMap, no API key required.</p>
      </div>
      <LeafletMap />
    </div>
  );
}
