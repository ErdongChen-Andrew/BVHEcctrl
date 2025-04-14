import { useGLTF, Text } from "@react-three/drei";
import { useEffect } from "react";
import * as THREE from "three";

export default function Slopes(props: any) {
  // Load models
  const slopes = useGLTF("./slopes.glb");

  useEffect(() => {
    // Receive Shadows
    slopes.scene.traverse((child) => {
      if (
        child instanceof THREE.Mesh &&
        child.material instanceof THREE.MeshStandardMaterial
      ) {
        child.receiveShadow = true;
      }
    });
  }, []);

  return (
    <group {...props}>
      <primitive object={slopes.scene} />
    </group>
  );
}
