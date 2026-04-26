import { useMemo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { Color } from 'three';
import { Html } from '@react-three/drei';
import type { TankState } from '@/simulation/models';

type TankMeshProps = {
  tank: TankState;
  position: [number, number, number];
  selected: boolean;
  onSelect: () => void;
};

function getFillColor(fillPct: number): Color {
  const percentage = fillPct * 100;
  if (percentage < 25) return new Color('#dc2626'); // Red (Critical)
  if (percentage < 40) return new Color('#f97316'); // Orange (Low)
  if (percentage < 70) return new Color('#38bdf8'); // Sky Blue (Normal)
  return new Color('#1d4ed8'); // Blue (Optimal)
}

export function TankMesh({ tank, position, selected, onSelect }: TankMeshProps) {
  const fillPct = tank.volumeLiters / Math.max(tank.capacityLiters, 1);
  const fillHeight = Math.max(0.06, Math.min(1.9, fillPct * 2));
  const fillColor = useMemo(() => getFillColor(fillPct), [fillPct]);

  const onClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onSelect();
  };

  return (
    <group position={position} onClick={onClick}>
      <mesh castShadow>
        <cylinderGeometry args={[1.2, 1.2, 2.2, 24]} />
        <meshStandardMaterial color={selected ? '#38bdf8' : '#334155'} metalness={0.15} roughness={0.7} />
      </mesh>
      <mesh position={[0, -1.05 + fillHeight / 2, 0]}>
        <cylinderGeometry args={[1.03, 1.03, fillHeight, 20]} />
        <meshStandardMaterial color={fillColor} transparent opacity={0.82} />
      </mesh>

      <Html position={[0, 1.5, 0]} center distanceFactor={10}>
        <div className={`px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap pointer-events-none transition-all ${
          selected ? 'bg-sky-500 text-white scale-110 shadow-lg' : 'bg-slate-800/80 text-slate-200'
        }`}>
          {tank.id}: {(fillPct * 100).toFixed(0)}%
        </div>
      </Html>
    </group>
  );
}
