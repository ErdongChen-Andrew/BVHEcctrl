import "./style.css";
import * as THREE from "three/webgpu";
import ReactDOM from "react-dom/client";
import { Canvas, extend } from "@react-three/fiber";
import Experience from "./Experience";
import { Leva } from "leva";
import { Suspense, useEffect, useState } from "react";
import { Bvh } from "@react-three/drei";
import { Joystick, VirtualButton } from "../src/index";

const root = ReactDOM.createRoot(document.querySelector("#root"));

const JoystickControls = () => {
  const [isTouchScreen, setIsTouchScreen] = useState(false);
  useEffect(() => {
    // Check if using a touch control device, show/hide joystick
    if ("ontouchstart" in window || navigator.maxTouchPoints > 0) {
      setIsTouchScreen(true);
    } else {
      setIsTouchScreen(false);
    }
  }, []);
  return (
    <>
      {isTouchScreen && (
        <>
          <Joystick />
          <VirtualButton
            id="run"
            label="RUN"
            buttonWrapperStyle={{ right: "100px", bottom: "40px" }}
          />
          <VirtualButton
            id="jump"
            label="JUMP"
            buttonWrapperStyle={{ right: "40px", bottom: "100px" }}
          />
        </>
      )}
    </>
  );
};

root.render(
  <>
    <Leva collapsed />
    <JoystickControls />
    <Canvas
      shadows
      camera={{
        fov: 65,
        near: 0.1,
        far: 1000,
        position: [0, 1, 5],
      }}
      // gl={async (props) => {
      //   extend(THREE);
      //   const renderer = new THREE.WebGPURenderer(props);
      //   await renderer.init();
      //   return renderer;
      // }}
    >
      {/* <fog attach="fog" args={["#333", 8, 100]} /> */}
      <Suspense fallback={null}>
        <Bvh firstHitOnly>
          <Experience />
        </Bvh>
      </Suspense>
    </Canvas>
  </>
);
