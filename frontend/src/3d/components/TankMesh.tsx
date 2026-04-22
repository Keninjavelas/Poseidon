import { useMemo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { Color } from 'three';
import type { TankState } from '@/simulation/models';

type TankMeshProps = {
  tank: TankState;
  position: [number, number, number];
  selected: boolean;
  onSelect: () => void;
};

function getFillColor(fillPct: number): Color {
  if (fillPct > 0.7) return new Color('#10b981');
  if (fillPct > 0.35) return new Color('#f59e0b');
  return new Color('#ef4444');
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
    </group>
  );
}
