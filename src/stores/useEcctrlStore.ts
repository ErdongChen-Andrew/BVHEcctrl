import * as THREE from "three";
import type { MeshBVH } from "three-mesh-bvh";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

type State = {
  // Environment static mesh infomation
  staticMeshesArray: THREE.Mesh[];
  setStaticMeshesArray: (mergedMesh: THREE.Mesh) => void;
  removeStaticMesh: (mergedMesh: THREE.Mesh) => void;
};

export const useEcctrlStore = /* @__PURE__ */ create(
  /* @__PURE__ */ subscribeWithSelector<State>((set) => {
    return {
      /**
       * Set/Update static collider props
       */
      staticMeshesArray: [],
      setStaticMeshesArray: (mergedMesh: THREE.Mesh) =>
        set((state) => {
          if (!state.staticMeshesArray.includes(mergedMesh)) {
            return {
              staticMeshesArray: [...state.staticMeshesArray, mergedMesh],
            };
          }
          return state;
        }),
      removeStaticMesh: (meshToRemove: THREE.Mesh) =>
        set((state) => ({
          staticMeshesArray: state.staticMeshesArray.filter(
            (mesh) => mesh !== meshToRemove
          ),
        })),
    };
  })
);
