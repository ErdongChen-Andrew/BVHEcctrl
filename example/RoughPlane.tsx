import { useGLTF } from "@react-three/drei";
import { useEffect } from "react";
import * as THREE from "three";

export default function RoughPlane() {
  // Load models
  const roughPlane = useGLTF("./roughPlane.glb");

  useEffect(() => {
    // Receive Shadows
    roughPlane.scene.traverse((child) => {
      if (
        child instanceof THREE.Mesh &&
        child.material instanceof THREE.MeshStandardMaterial
      ) {
        child.receiveShadow = true;
      }
    });
  }, []);

  return (
    <primitive position={[-13,-2,0]} object={roughPlane.scene} />
  );
}
