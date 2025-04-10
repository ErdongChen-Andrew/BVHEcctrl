import * as THREE from "three"
import { Environment, Grid, KeyboardControls, OrbitControls, Stats, StatsGl, TransformControls } from "@react-three/drei";
import { Perf } from "r3f-perf";
import { Physics } from "@react-three/rapier";
import Ecctrl from "../src/Ecctrl";
import Floor from "./Floor";
import Lights from "./Lights";
import Steps from "./Steps";
import Slopes from "./Slopes";
import RoughPlane from "./RoughPlane";
import { useControls } from "leva";
import CharacterModel from "./CharacterModel";
import React, { useEffect, useRef, useState } from "react";
import Map from "./Map";
import EcctrlMini, { characterStatus } from "../src/EcctrlMini"
import StaticCollider from "../src/StaticCollider"
import { useFrame } from "@react-three/fiber";

export default function Experience() {
  /**
   * Debug settings
   */
  const ecctrlRef = useRef<THREE.Group | null>(null)
  const EcctrlMiniDebugSettings = useControls("EcctrlMini Debug", {
    EcctrlMiniDebug: true,
  })
  const MapDebugSettings = useControls("Map Debug", {
    MapDebug: true,
  })

  /**
   * Keyboard control preset
   */
  const keyboardMap = [
    { name: "forward", keys: ["ArrowUp", "KeyW"] },
    { name: "backward", keys: ["ArrowDown", "KeyS"] },
    { name: "leftward", keys: ["ArrowLeft", "KeyA"] },
    { name: "rightward", keys: ["ArrowRight", "KeyD"] },
    { name: "jump", keys: ["Space"] },
    { name: "run", keys: ["Shift"] },
    { name: "action1", keys: ["1"] },
    { name: "action2", keys: ["2"] },
    { name: "action3", keys: ["3"] },
    { name: "action4", keys: ["KeyF"] },
  ];

  return (
    <>
      {/* <Perf position="top-left" minimal /> */}

      {/* <StatsGl /> */}

      <Stats />

      <OrbitControls makeDefault />

      {/* <Grid
        args={[300, 300]}
        sectionColor={"lightgray"}
        cellColor={"gray"}
        position={[0, -0.99, 0]}
        userData={{ camExcludeCollision: true }} // this won't be collide by camera ray
      /> */}

      <Lights />

      <Environment background files="textures/night.hdr" />

      {/* Map */}
      <StaticCollider debug={MapDebugSettings.MapDebug}>
        <Map />
      </StaticCollider>

      {/* Keyboard preset */}
      <KeyboardControls map={keyboardMap}>
        {/* Character Control */}
        <EcctrlMini
          ref={ecctrlRef}
          debug={EcctrlMiniDebugSettings.EcctrlMiniDebug}
        >
          {/* Character Model */}
          {/* <group>
              <mesh>
                <capsuleGeometry args={[0.3, 0.5, 6, 16]} />
                <meshStandardMaterial />
              </mesh>
              <mesh position={[0, 0.2, 0.3]}>
                <boxGeometry args={[0.4, 0.2, 0.2]} />
                <meshStandardMaterial color={"gray"} />
              </mesh>
            </group> */}
        </EcctrlMini>
      </KeyboardControls>

      <StaticCollider debug={MapDebugSettings.MapDebug}>
        <RoughPlane />
      </StaticCollider>

      <StaticCollider debug={MapDebugSettings.MapDebug}>
        <Slopes />
      </StaticCollider>


      {/* Small steps */}
      {/* <Steps /> */}

      {/* Floor */}
      {/* <Floor /> */}
    </>
  );
}
