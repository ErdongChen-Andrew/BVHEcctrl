import * as THREE from "three";
import React, { Suspense, useEffect, useRef, useMemo, useState } from "react";
import { useGLTF } from "@react-three/drei";

export default function CharacterModel(props) {
  const { nodes, materials } = useGLTF("/capsule.glb");
  materials.GridTexture.side = THREE.FrontSide;
  materials.GridTexture.color.setHex("0xE6E6FA");

  return (
    <Suspense {...props} fallback={<capsuleGeometry args={[0.3, 0.7]} />}>
      {/* Default capsule modle */}
      {/* <mesh castShadow receiveShadow>
        <capsuleGeometry args={[0.3, 0.6, 6, 16]} />
        <meshStandardMaterial />
      </mesh>
      <mesh position={[0, 0.2, 0.3]} castShadow receiveShadow>
        <boxGeometry args={[0.4, 0.2, 0.2]} />
        <meshStandardMaterial color={"gray"} />
      </mesh> */}
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
