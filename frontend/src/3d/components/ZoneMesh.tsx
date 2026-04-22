import { Color } from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import type { SoilState } from '@/simulation/models';

type ZoneMeshProps = {
  zone: SoilState;
  position: [number, number, number];
  selected: boolean;
  onSelect: () => void;
};

function moistureColor(moisture: number): Color {
  if (moisture < 30) return new Color('#ef4444');
  if (moisture < 60) return new Color('#f59e0b');
  return new Color('#22c55e');
}

export function ZoneMesh({ zone, position, selected, onSelect }: ZoneMeshProps) {
  const color = moistureColor(zone.moisturePct);

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onSelect();
  };

  return (
    <mesh position={position} rotation-x={-Math.PI / 2} onClick={handleClick} receiveShadow>
      <planeGeometry args={[10, 8]} />
      <meshStandardMaterial color={selected ? '#0ea5e9' : color} transparent opacity={0.85} />
    </mesh>
  );
}
