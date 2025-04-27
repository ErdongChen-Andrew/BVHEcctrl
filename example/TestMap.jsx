import * as THREE from "three";
import { useGLTF } from "@react-three/drei";

export default function TestMap(props) {
  const { nodes, materials } = useGLTF("/testMap.glb");

  // materials.GridTexture.side = THREE.FrontSide;
  materials.GridTexture.color.setHex("0xE0FFFF");
  const material001 = materials.GridTexture.clone();
  // material001.color.setHex("0xF0F8FF");
  material001.color.setHex("0xAFEEEE"); //#B0E0E6 //0xADD8E6 //0xAFEEEE

  return (
    <group {...props} dispose={null}>
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Floor002.geometry}
        material={materials.GridTexture}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Floor003.geometry}
        material={material001}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.SlopeStair002.geometry}
        material={materials.GridTexture}
      />
    </group>
  );
}

useGLTF.preload("./testMap.glb");
