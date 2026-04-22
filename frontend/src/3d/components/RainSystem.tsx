import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { InstancedMesh, Matrix4, Vector3 } from 'three';

type RainSystemProps = {
  intensity: number;
};

const PARTICLE_COUNT = 550;
const bounds = 22;

export function RainSystem({ intensity }: RainSystemProps) {
  const instancedRef = useRef<InstancedMesh>(null);
  const positions = useMemo(
    () =>
      new Array(PARTICLE_COUNT).fill(0).map(() => ({
        x: (Math.random() - 0.5) * bounds,
        y: Math.random() * 12 + 1,
        z: (Math.random() - 0.5) * bounds,
      })),
    [],
  );

  useFrame((_, delta) => {
    const mesh = instancedRef.current;
    if (!mesh) return;

    const speed = 7 + intensity * 1.5;
    const dummy = new Matrix4();
    const scale = new Vector3(1, 1 + intensity * 0.25, 1);

    for (let i = 0; i < PARTICLE_COUNT; i += 1) {
      positions[i].y -= delta * speed;
      if (positions[i].y < 0) {
        positions[i].y = 12;
      }
      dummy.makeScale(scale.x, scale.y, scale.z);
      dummy.setPosition(positions[i].x, positions[i].y, positions[i].z);
      mesh.setMatrixAt(i, dummy);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={instancedRef} args={[undefined, undefined, PARTICLE_COUNT]}>
      <boxGeometry args={[0.03, 0.45, 0.03]} />
      <meshStandardMaterial color="#7dd3fc" transparent opacity={0.65} />
    </instancedMesh>
  );
}
