import "./style.css";
import * as THREE from "three/webgpu";
import ReactDOM from "react-dom/client";
import { Canvas, extend } from "@react-three/fiber";
import Experience from "./Experience";
import { Leva } from "leva";
import { Suspense, useEffect, useState } from "react";
import { Bvh } from "@react-three/drei";

const root = ReactDOM.createRoot(document.querySelector("#root"));

root.render(
  <>
    <Leva collapsed />
    <Canvas
      shadows
      camera={{
        fov: 65,
        near: 0.1,
        far: 1000,
      }}
      gl={async (props) => {
        extend(THREE)
        const renderer = new THREE.WebGPURenderer(props)
        await renderer.init();
        return renderer;
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
