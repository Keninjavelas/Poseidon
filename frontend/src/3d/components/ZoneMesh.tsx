import { Color } from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { SoilState } from '@/simulation/models';

type ZoneMeshProps = {
  zone: SoilState;
  position: [number, number, number];
  selected: boolean;
  onSelect: () => void;
};

function getMoistureColor(percent: number): Color {
  if (percent < 25) return new Color('#dc2626'); // Red (Critical)
  if (percent < 40) return new Color('#f97316'); // Orange (Low)
  if (percent < 70) return new Color('#38bdf8'); // Sky Blue (Normal)
  return new Color('#1d4ed8'); // Blue (Optimal)
}

export function ZoneMesh({ zone, position, selected, onSelect }: ZoneMeshProps) {
  const color = getMoistureColor(zone.moisturePct);

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onSelect();
  };

  return (
    <mesh position={position} rotation-x={-Math.PI / 2} onClick={handleClick} receiveShadow>
      <planeGeometry args={[10, 8]} />
      <meshStandardMaterial color={selected ? '#0ea5e9' : color} transparent opacity={0.85} />
      
      <Html position={[0, 0, 0.1]} center distanceFactor={10} rotation={[Math.PI / 2, 0, 0]}>
        <div className={`px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap pointer-events-none transition-all ${
          selected ? 'bg-sky-500 text-white shadow-lg' : 'bg-slate-900/40 text-white'
        }`}>
          {zone.zoneId}: {zone.moisturePct.toFixed(0)}%
        </div>
      </Html>
    </mesh>
  );
}
