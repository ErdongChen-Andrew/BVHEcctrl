import "./style.css";
import * as THREE from "three/webgpu";
import ReactDOM from "react-dom/client";
import { Canvas, extend } from "@react-three/fiber";
import Experience from "../example/Experience";
import { Leva } from "leva";
// import { EcctrlJoystick } from "../src/EcctrlJoystick";
import { Suspense, useEffect, useState } from "react";
import { Bvh } from "@react-three/drei";

const root = ReactDOM.createRoot(document.querySelector("#root"));

// const EcctrlJoystickControls = () => {
//   const [isTouchScreen, setIsTouchScreen] = useState(false)
//   useEffect(() => {
//     // Check if using a touch control device, show/hide joystick
//     if (('ontouchstart' in window) ||
//       (navigator.maxTouchPoints > 0)) {
//       setIsTouchScreen(true)
//     } else {
//       setIsTouchScreen(false)
//     }
//   }, [])
//   return (
//     <>
//       {isTouchScreen && <EcctrlJoystick buttonNumber={5} />}
//     </>
//   )
// }

root.render(
  <>
    <Leva collapsed />
    {/* <EcctrlJoystickControls /> */}
    <Canvas
      shadows
      camera={{
        fov: 65,
        near: 0.1,
        far: 1000,
      }}
      // onPointerDown={(e) => {
      //   if (e.pointerType === 'mouse') {
      //     (e.target as HTMLCanvasElement).requestPointerLock()
      //   }
      // }}
      gl={(props) => {
        extend(THREE)
        const renderer = new THREE.WebGPURenderer(props)
        return renderer.init().then(() => renderer)
      }}
    >
      <Suspense fallback={null}>
        <Bvh firstHitOnly>
          <Experience />
        </Bvh>
      </Suspense>
    </Canvas>
  </>
);
