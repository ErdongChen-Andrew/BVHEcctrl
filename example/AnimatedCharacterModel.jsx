import * as THREE from "three";
import { Suspense } from "react";
import { useGLTF } from "@react-three/drei";

export default function AnimatedCharacterModel(props) {
  const { nodes, materials } = useGLTF("/capsule.glb");
  materials.GridTexture.side = THREE.FrontSide;
  materials.GridTexture.color.setHex("0xE6E6FA");

  return (
    <Suspense {...props} fallback={<capsuleGeometry args={[0.3, 0.7]} />}>
      <mesh
        castShadow
        receiveShadow
        position={[0, -0.6, 0]}
        geometry={nodes.Capsule.geometry}
        material={materials.GridTexture}
      />
    </Suspense>
  );
}
