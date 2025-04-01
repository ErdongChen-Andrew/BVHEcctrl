import { Environment, Grid, KeyboardControls, OrbitControls, Stats, StatsGl } from "@react-three/drei";
import { Perf } from "r3f-perf";
import { Physics } from "@react-three/rapier";
import Ecctrl from "../src/Ecctrl";
import Floor from "./Floor";
import Lights from "./Lights";
import Steps from "./Steps";
import Slopes from "./Slopes";
import RoughPlane from "./RoughPlane";
import RigidObjects from "./RigidObjects";
import FloatingPlatform from "./FloatingPlatform";
import DynamicPlatforms from "./DynamicPlatforms";
import ShotCube from "./ShotCube";
import { useControls } from "leva";
import CharacterModel from "./CharacterModel";
import React, { useEffect, useState } from "react";
import Map from "./Map";
import EcctrlMini from "../src/EcctrlMini"

export default function Experience() {
  /**
   * Debug settings
   */
  const { physics, disableControl, disableFollowCam } = useControls("World Settings", {
    physics: false,
    disableControl: false,
    disableFollowCam: false,
  });

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

      <OrbitControls />

      {/* <Grid
        args={[300, 300]}
        sectionColor={"lightgray"}
        cellColor={"gray"}
        position={[0, -0.99, 0]}
        userData={{ camExcludeCollision: true }} // this won't be collide by camera ray
      /> */}

      <Lights />

      <Environment background files="/textures/night.hdr" />

      {/* Keyboard preset */}
      <KeyboardControls map={keyboardMap}>
        {/* Character Control */}
        <EcctrlMini >
          <mesh>
            <boxGeometry args={[0.5, 1, 0.5]} />
            <meshStandardMaterial />
          </mesh>
        </EcctrlMini>
      </KeyboardControls>

      {/* Map */}
      <Map />

      {/* Rough plan */}
      {/* <RoughPlane /> */}

      {/* Slopes and stairs */}
      {/* <Slopes /> */}

      {/* Small steps */}
      {/* <Steps /> */}

      {/* Rigid body objects */}
      {/* <RigidObjects /> */}

      {/* Floating platform */}
      {/* <FloatingPlatform /> */}

      {/* Dynamic platforms */}
      {/* <DynamicPlatforms /> */}

      {/* Floor */}
      {/* <Floor /> */}
    </>
  );
}
