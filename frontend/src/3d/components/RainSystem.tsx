import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { InstancedMesh, Matrix4, Vector3 } from 'three';

type RainSystemProps = {
  intensity: number;
};

const PARTICLE_COUNT = 1500; // Increased count
const bounds = 30; // Slightly larger area

export function RainSystem({ intensity }: RainSystemProps) {
  const instancedRef = useRef<InstancedMesh>(null);
  
  // Normalized intensity 0-1, more sensitive at lower values
  const normalizedIntensity = Math.min(intensity / 12, 1);
  const activeCount = Math.floor(PARTICLE_COUNT * Math.sqrt(normalizedIntensity)); // Square root for more particles at low intensity

  const positions = useMemo(
    () =>
      new Array(PARTICLE_COUNT).fill(0).map(() => ({
        x: (Math.random() - 0.5) * bounds,
        y: Math.random() * 20 + 1,
        z: (Math.random() - 0.5) * bounds,
      })),
    [],
  );

  useFrame((_, delta) => {
    const mesh = instancedRef.current;
    if (!mesh) return;

    const speed = 12 + normalizedIntensity * 10;
    const dummy = new Matrix4();
    const scale = new Vector3(1, 1 + normalizedIntensity * 1.5, 1);

    for (let i = 0; i < PARTICLE_COUNT; i += 1) {
      if (i >= activeCount) {
        dummy.makeScale(0, 0, 0); // Hide particles
        mesh.setMatrixAt(i, dummy);
        continue;
      }

      positions[i].y -= delta * speed * (0.9 + Math.random() * 0.2);
      if (positions[i].y < 0) {
        positions[i].y = 20;
      }
      dummy.makeScale(scale.x, scale.y, scale.z);
      dummy.setPosition(positions[i].x, positions[i].y, positions[i].z);
      mesh.setMatrixAt(i, dummy);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={instancedRef} args={[undefined, undefined, PARTICLE_COUNT]}>
      <boxGeometry args={[0.02, 0.5, 0.02]} />
      <meshStandardMaterial color="#bae6fd" transparent opacity={0.7} />
    </instancedMesh>
  );
}
