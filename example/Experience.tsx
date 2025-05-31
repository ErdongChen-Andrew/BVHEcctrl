import * as THREE from "three"
import { CameraControls, Environment, Grid, KeyboardControls, OrbitControls, PointerLockControls, Stats, StatsGl, TransformControls, useGLTF, type CameraControlsProps } from "@react-three/drei";
import { Perf } from "r3f-perf";
import { Physics } from "@react-three/rapier";
import Floor from "./Floor";
import Lights from "./Lights";
import Slopes from "./Slopes";
import RoughPlane from "./RoughPlane";
import { useControls, folder, button } from "leva";
import CharacterModel from "./CharacterModel";
import React, { useEffect, useRef, useState } from "react";
import Map from "./Map";
import BVHEcctrl, { characterStatus } from "../src/BVHEcctrl"
import StaticCollider from "../src/StaticCollider"
import KinematicCollider from "../src/KinematicCollider"
import InstancedStaticCollider from "../src/InstancedStaticCollider"
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls as ThreeOrbitControls, PointerLockControls as ThreePointerLockControls } from "three-stdlib";
import StaticMap from "./StaticMap";
import InstancedMap from "./InstancedMap";
import { clamp } from "three/src/math/MathUtils.js";
import LargePlatform from "./LargePlatform";
import RotateBars from "./RotateBars";
import SlideMap from "./SlideMap";
import { useEcctrlStore } from "../src/stores/useEcctrlStore";
import HintzeHall from "./HintzeHall";
import InstancedSong from "./InstancedSong";
import SongMap from "./SongMap";
import LargeFloorMap from "./LargeFloorMap";

export default function Experience() {
  /**
   * Load models
   */
  const testMapModel = useGLTF("/testMap.glb");
  // Retrieve collider meshes from store
  const colliderMeshesArray = useEcctrlStore((state) => state.colliderMeshesArray);

  /**
   * Initialize setup
   */
  // const camControlRef = useRef<ThreeOrbitControls | null>(null)
  const camControlRef = useRef<CameraControls | null>(null)
  // const camControlRef = useRef<ThreePointerLockControls | null>(null)
  const ecctrlRef = useRef<THREE.Group | null>(null)
  const characterModelRef = useRef<THREE.Group | null>(null)
  const kinematicCollderRef = useRef<THREE.Group | null>(null)
  const kinematicPlatformRef001 = useRef<THREE.Group | null>(null)
  const kinematicPlatformRef002 = useRef<THREE.Group | null>(null)
  const kinematicPlatformRef003 = useRef<THREE.Group | null>(null)
  const kinematicBarRef = useRef<THREE.Group | null>(null)

  /**
   * Debug settings
   */
  const EcctrlDebugSettings = useControls("Ecctrl Debug", {
    CameraLock: button(() => { camControlRef.current?.lockPointer() }),
    FirstPerson: button(() => { camControlRef.current?.dolly(camControlRef.current.distance - 0.02, true) }),
    ResetPlayer: button(() => {
      ecctrlRef.current?.position.set(0, 8, 22);
      ecctrlRef.current?.userData.resetLinVel()
    }),
    EcctrlDebug: false,
    Physics: folder({
      paused: false,
      delay: { value: 3, min: 0, max: 20, step: 0.1 },
      gravity: { value: 9.81, min: 0, max: 50, step: 0.1 },
      fallGravityFactor: { value: 4, min: 1, max: 10, step: 0.1 },
      maxFallSpeed: { value: 50, min: 1, max: 200, step: 1 },
      mass: { value: 1, min: 0.1, max: 10, step: 0.1 },
      sleepTimeout: { value: 10, min: 0, max: 100, step: 0.1 },
    }, { collapsed: true }),
    Movement: folder({
      turnSpeed: { value: 15, min: 0, max: 100, step: 1 },
      maxWalkSpeed: { value: 3, min: 0, max: 10, step: 0.1 },
      maxRunSpeed: { value: 5, min: 0, max: 20, step: 0.1 },
      acceleration: { value: 26, min: 0, max: 100, step: 1 },
      deceleration: { value: 15, min: 0, max: 50, step: 1 },
      counterVelFactor: { value: 1.5, min: 0, max: 5, step: 0.1 },
      airDragFactor: { value: 0.3, min: 0, max: 1, step: 0.05 },
      jumpVel: { value: 5, min: 0, max: 20, step: 0.1 },
    }, { collapsed: true }),
    Floating: folder({
      maxSlope: { value: 1, min: 0, max: Math.PI / 2, step: 0.01 },
      floatHeight: { value: 0.2, min: 0, max: 1, step: 0.01 },
      floatPullBackHeight: { value: 0.25, min: 0, max: 1, step: 0.01 },
      floatSensorRadius: { value: 0.12, min: 0, max: 1, step: 0.01 },
      floatSpringK: { value: 1600, min: 0, max: 3000, step: 10 },
      floatDampingC: { value: 60, min: 0, max: 1000, step: 1 },
    }, { collapsed: true }),
    Collision: folder({
      collisionCheckIteration: { value: 3, min: 1, max: 10, step: 1 },
      collisionPushBackVelocity: { value: 3, min: 0, max: 50, step: 0.1 },
      collisionPushBackDamping: { value: 0.1, min: 0, max: 1, step: 0.05 },
      collisionPushBackThreshold: { value: 0.001, min: 0, max: 1, step: 0.01 },
    }, { collapsed: true }),
  })
  const EcctrlMapDebugSettings = useControls("Map Debug", {
    MapDebug: false,
    Map: folder({
      visible: true,
      excludeFloatHit: false,
      excludeCollisionCheck: false,
      friction: { value: 0.8, min: 0, max: 1, step: 0.01 },
      restitution: { value: 0.05, min: 0, max: 1, step: 0.01 },
    }, { collapsed: true }),
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

  /**
   * Initialize character facing direction
   */
  // useEffect(() => {
  // characterModelRef.current?.parent?.rotateY(1)
  // }, [])

  /**
   * Show/hide map collider
   */
  // const [show, setShow] = useState(true)
  // useEffect(() => {
  //   setInterval(() => {
  //     setShow(prev => !prev)
  //   }, 5000)
  // }, [])

  /**
   * Stress test array preset
   */
  const mapGrid: [number, number, number][] = []
  const layers = 2
  const spacingX = 20 // 12.3
  const spacingZ = 20 // 17.8
  for (let x = -layers; x <= layers; x++) {
    for (let z = -layers; z <= layers; z++) {
      mapGrid.push([x * spacingX, -2, z * spacingZ]);
    }
  }

  /**
   * Initialize kinematic colliders' position/rotation
   */
  useEffect(() => {
    if (kinematicPlatformRef001.current)
      kinematicPlatformRef001.current.position.z = 15
    if (kinematicPlatformRef002.current)
      kinematicPlatformRef002.current.position.z = 15
    if (kinematicPlatformRef003.current)
      kinematicPlatformRef003.current.position.z = 15
    if (kinematicBarRef.current) {
      kinematicBarRef.current.position.y = 5
      kinematicBarRef.current.position.z = 22
    }
  }, [])

  useFrame((state) => {
    // For orbit control to follow character
    // if (camControlRef.current && ecctrlRef.current) {
    //   state.camera.position.sub(camControlRef.current.target)
    //   camControlRef.current.target.copy(ecctrlRef.current.position)
    //   state.camera.position.add(ecctrlRef.current.position)
    // }

    /**
     * 
     */
    // For camera control to follow character
    if (camControlRef.current && ecctrlRef.current) {
      camControlRef.current.moveTo(
        ecctrlRef.current.position.x,
        ecctrlRef.current.position.y + 0.3,
        ecctrlRef.current.position.z,
        true
      )

      // Hide character model if character too close
      if (characterModelRef.current) {
        if (camControlRef.current.distance < 0.7) {
          characterModelRef.current.visible = false
        } else {
          characterModelRef.current.visible = true
        }
      }
    }

    /**
     * 
     */
    // For pointer lock control to follow character
    // if (camControlRef.current && ecctrlRef.current) {
    //   state.camera.position.copy(ecctrlRef.current.position)
    // }

    // Animate kinematic platform
    if (kinematicPlatformRef001.current)
      kinematicPlatformRef001.current.rotation.y = state.clock.elapsedTime * 0.5
    if (kinematicPlatformRef002.current)
      kinematicPlatformRef002.current.position.x = 5 * Math.sin(state.clock.elapsedTime * 0.5) + 10
    if (kinematicPlatformRef003.current) {
      kinematicPlatformRef003.current.rotation.y = state.clock.elapsedTime * 0.5
      kinematicPlatformRef003.current.position.x = 5 * Math.sin(state.clock.elapsedTime * 0.5) - 10
    }
    if (kinematicBarRef.current) kinematicBarRef.current.rotation.z = state.clock.elapsedTime * 0.2
  })

  return (
    <>
      {/* <Perf position="top-left" minimal /> */}

      {/* <StatsGl /> */}

      <Stats />

      {/* <OrbitControls
        ref={camControlRef}
        dampingFactor={0.1}
        enablePan={false}
        makeDefault
      /> */}

      <CameraControls
        ref={camControlRef}
        smoothTime={0.1}
        colliderMeshes={colliderMeshesArray}
        makeDefault
      />

      {/* <PointerLockControls ref={camControlRef} makeDefault/> */}

      <Lights />

      <Environment background blur={0.6} environmentIntensity={0.1} files="/textures/sky.hdr" />

      {/* Keyboard preset */}
      <KeyboardControls map={keyboardMap}>
        {/* Character Control */}
        <BVHEcctrl
          ref={ecctrlRef}
          debug={EcctrlDebugSettings.EcctrlDebug}
          {...EcctrlDebugSettings}
          // spring: 900, damping: 30
          position={[0, 3, -12]}
        // jumpVel={10}
        >
          {/* Character Model */}
          <group ref={characterModelRef}>
            <CharacterModel />
          </group>
        </BVHEcctrl>
      </KeyboardControls>

      {/* <StaticCollider position={[0, 0, 0]}>
        <Map />
      </StaticCollider> */}

      {/* <StaticCollider >
        <RoughPlane />
      </StaticCollider> */}

      {/* <StaticCollider >
        <Slopes position={[0, -3, 0]} />
      </StaticCollider> */}

      {/**
       * 
       * 
       * 
       * Stress test
       * 
       * 
       * 
       * 
       */}

      {/* Instanced mesh */}
      {/* <InstancedStaticCollider debug={EcctrlMapDebugSettings.MapDebug} {...EcctrlMapDebugSettings} >
        <InstancedSong />
      </InstancedStaticCollider> */}

      {/* <InstancedStaticCollider debug={EcctrlMapDebugSettings.MapDebug} {...EcctrlMapDebugSettings} >
        <InstancedMap />
      </InstancedStaticCollider> */}

      {/* <StaticCollider debug>
        <InstancedMap />
      </StaticCollider> */}

      {/* Cloned mesh */}
      {/* <StaticCollider debug={EcctrlMapDebugSettings.MapDebug} {...EcctrlMapDebugSettings} >
        <group position={[0, 0, 0]}>
          {mapGrid.map((pos, idx) => (
            // <Map key={`inner-${idx}`} position={pos} />
            <SongMap key={`inner-${idx}`} position={pos} />
          ))}
        </group>
      </StaticCollider> */}

      {/* Large model */}
      {/* <StaticCollider>
        <HintzeHall />
      </StaticCollider> */}

      {/**
       * 
       * 
       * 
       * Map models
       * 
       * 
       * 
       * 
       */}
      {/* Static Collider */}
      {/* <StaticCollider debug={EcctrlMapDebugSettings.MapDebug} {...EcctrlMapDebugSettings}>
        <LargeFloorMap position={[0, -2, 0]} />
      </StaticCollider> */}

      {/* <StaticCollider debug={EcctrlMapDebugSettings.MapDebug} {...EcctrlMapDebugSettings}>
        <SongMap />
      </StaticCollider> */}

      <StaticCollider debug={EcctrlMapDebugSettings.MapDebug} {...EcctrlMapDebugSettings}>
        <StaticMap model={testMapModel} position={[0, -3, 0]} />
      </StaticCollider>

      <StaticCollider debug={EcctrlMapDebugSettings.MapDebug} excludeFloatHit={true}>
        <SlideMap model={testMapModel} position={[0, 5, 22]} />
      </StaticCollider>

      {/* Moving Platform */}
      <KinematicCollider ref={kinematicPlatformRef001} debug={EcctrlMapDebugSettings.MapDebug}>
        <LargePlatform model={testMapModel} position={[0, -2.5, 0]} />
      </KinematicCollider>

      <KinematicCollider ref={kinematicPlatformRef002} debug={EcctrlMapDebugSettings.MapDebug}>
        <LargePlatform model={testMapModel} position={[0, -2.5, 0]} />
      </KinematicCollider>

      <KinematicCollider ref={kinematicPlatformRef003} debug={EcctrlMapDebugSettings.MapDebug}>
        <LargePlatform model={testMapModel} position={[0, -2.5, 0]} />
      </KinematicCollider>

      <KinematicCollider ref={kinematicBarRef} debug={EcctrlMapDebugSettings.MapDebug}>
        <RotateBars model={testMapModel} />
      </KinematicCollider>
    </>
  );
}

useGLTF.preload("/testMap.glb");