/*
"Plaza Night Time" (https://skfb.ly/6wRpT) by patrix is licensed under Creative Commons Attribution-ShareAlike (http://creativecommons.org/licenses/by-sa/4.0/).
*/

import { Clone, useGLTF } from "@react-three/drei";

export default function Plaza(props) {
  // Load map model
  const plazaModel = useGLTF("./plaza_night_time.glb");

  return (
    <Clone
      object={plazaModel.scene}
      position={[-14, -27, 0]}
      scale={[0.5, 0.5, 0.5]}
    />
  );
}

useGLTF.preload("./plaza_night_time.glb");
