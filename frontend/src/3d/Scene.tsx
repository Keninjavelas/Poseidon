'use client';

import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useMemo } from 'react';
import { GEO_ENTITIES } from '@/simulation/models';
import { useStore } from '@/store/useStore';
import { RainSystem } from '@/3d/components/RainSystem';
import { TankMesh } from '@/3d/components/TankMesh';
import { Terrain } from '@/3d/components/Terrain';
import { ZoneMesh } from '@/3d/components/ZoneMesh';

type CameraMode = 'free' | 'top-down' | 'follow';

function CameraRig({ mode }: { mode: CameraMode }) {
  const selected = useStore((state) => state.selectedEntity);
  const { camera } = useThree();

  if (mode === 'top-down') {
    camera.position.set(0, 30, 0.01);
    camera.lookAt(0, 0, 0);
  }

  if (mode === 'follow' && selected) {
    const index = GEO_ENTITIES.findIndex((entity) => entity.id === selected.id);
    const x = (index % 4) * 6 - 9;
    const z = Math.floor(index / 4) * 6 - 6;
    camera.position.set(x + 7, 8, z + 7);
    camera.lookAt(x, 0, z);
  }

  return null;
}

export function Scene({ cameraMode = 'free' }: { cameraMode?: CameraMode }) {
  const systemState = useStore((state) => state.systemState);
  const selectedEntity = useStore((state) => state.selectedEntity);
  const setSelectedEntity = useStore((state) => state.setSelectedEntity);

  const tankEntries = useMemo(() => Object.entries(systemState.tanks), [systemState.tanks]);
  const zoneEntries = useMemo(() => Object.entries(systemState.soil), [systemState.soil]);
  const avgRain = useMemo(() => {
    const sensors = Object.values(systemState.rainfall);
    if (sensors.length === 0) return 0;
    return sensors.reduce((acc, sensor) => acc + sensor.mmPerHour, 0) / sensors.length;
  }, [systemState.rainfall]);

  return (
    <div className="h-[60vh] rounded-2xl overflow-hidden border border-slate-200 bg-slate-950/95 shadow-sm">
      <Canvas shadows camera={{ position: [17, 14, 18], fov: 45 }} dpr={[1, 1.7]}>
        <ambientLight intensity={0.35} />
        <directionalLight
          castShadow
          position={[10, 18, 8]}
          intensity={1.1}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />

        <CameraRig mode={cameraMode} />
        <Terrain />

        {tankEntries.map(([id, tank], index) => {
          const x = (index % 2) * 7 - 4;
          const z = Math.floor(index / 2) * 8 - 3;
          return (
            <TankMesh
              key={id}
              tank={tank}
              position={[x, 1.1, z]}
              selected={selectedEntity?.id === id}
              onSelect={() => {
                const entity = GEO_ENTITIES.find((item) => item.id === id);
                if (entity) setSelectedEntity(entity);
              }}
            />
          );
        })}

        {zoneEntries.map(([id, zone], index) => {
          const x = (index % 2) * 11 - 5;
          const z = 9;
          return (
            <ZoneMesh
              key={id}
              zone={zone}
              position={[x, 0.02, z]}
              selected={selectedEntity?.id === id}
              onSelect={() => {
                const entity = GEO_ENTITIES.find((item) => item.id === id);
                if (entity) setSelectedEntity(entity);
              }}
            />
          );
        })}

        <RainSystem intensity={Math.min(avgRain, 12)} />
        <OrbitControls enableDamping dampingFactor={0.08} maxPolarAngle={Math.PI / 2.15} />
      </Canvas>
    </div>
  );
}
