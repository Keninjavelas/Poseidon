import { MeshStandardMaterial } from 'three';

const terrainMaterial = new MeshStandardMaterial({
  color: '#7c9a5f',
  roughness: 0.95,
  metalness: 0.02,
});

export function Terrain() {
  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow>
      <planeGeometry args={[50, 50, 1, 1]} />
      <primitive object={terrainMaterial} attach="material" />
    </mesh>
  );
}
