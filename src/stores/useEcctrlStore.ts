import * as THREE from "three";
import type { MeshBVH } from "three-mesh-bvh";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

type CharacterCollider = {
  radius: number;
  length: number;
  capSegments: number;
  radialSegments: number;
};

type CharacterCurrentStatus = {
  currentLinVel: THREE.Vector3;
  currentPos: THREE.Vector3;
  currentQuat: THREE.Quaternion;
};

type contactPointInfo = {
  contactDepth: number;
  contactNormal: THREE.Vector3;
};

export type staticProps = {
  restitution: number;
  friction: number;
  boundsTree: MeshBVH;
};

type State = {
  // Character collider infomation
  characterCollider: CharacterCollider;
  setCharacterCollider: (props: CharacterCollider) => void;
  characterBbox: THREE.Box3;
  setCharacterBbox: (bbox: THREE.Box3) => void;
  characterSegment: THREE.Line3;
  setCharacterSegment: (line: THREE.Line3) => void;
  characterGroupRef: React.RefObject<THREE.Group> | null;
  setCharacterGroupRef: (ref: React.RefObject<THREE.Group>) => void;
  // Character current status infomation
  characterCurrentStatus: CharacterCurrentStatus;
  setCharacterCurrentStatus: (status: Partial<CharacterCurrentStatus>) => void;
  // Environment contact infomation
  contactPointInfo: contactPointInfo;
  setContactPointInfo: (contactInfo: Partial<contactPointInfo>) => void;
  resetContactPointInfo: () => void;
  // Environment map props
  staticMapPropsArray: staticProps[];
  setStaticMapPropsArray: (props: staticProps) => void;
  // Environment bounds tree infomation
  staticBoundsTree: MeshBVH | null;
  setStaticBoundsTree: (boundsTree: MeshBVH) => void;
};

export const useEcctrlStore = /* @__PURE__ */ create(
  /* @__PURE__ */ subscribeWithSelector<State>((set) => {
    return {
      /**
       * Set character collider props
       */
      characterCollider: {
        radius: 0.3,
        length: 0.5,
        capSegments: 4,
        radialSegments: 8,
      },
      // setCharacterCollider: (props: CharacterCollider) => set({ characterCollider: props }),
      setCharacterCollider: (props: Partial<CharacterCollider>) =>
        set((state) => ({
          characterCollider: { ...state.characterCollider, ...props },
        })),

      /**
       * Update character bounding box
       */
      characterBbox: new THREE.Box3(),
      setCharacterBbox: (bbox: THREE.Box3) => set({ characterBbox: bbox }),

      /**
       * Update character segment line
       */
      characterSegment: new THREE.Line3(),
      setCharacterSegment: (line: THREE.Line3) =>
        set({ characterSegment: line }),

      /**
       * Set/Update characterGroup ref
       */
      characterGroupRef: null,
      setCharacterGroupRef: (ref: React.RefObject<THREE.Group>) =>
        set({ characterGroupRef: ref }),

      /**
       * Set/Update character current status
       */
      characterCurrentStatus: {
        currentLinVel: new THREE.Vector3(),
        currentPos: new THREE.Vector3(),
        currentQuat: new THREE.Quaternion(),
      },
      setCharacterCurrentStatus: (status: Partial<CharacterCurrentStatus>) =>
        set((state) => ({
          characterCurrentStatus: {
            ...state.characterCurrentStatus,
            ...status,
          },
        })),

      /**
       * Environment updates to character collider
       */
      contactPointInfo: { contactDepth: 0, contactNormal: new THREE.Vector3() },
      setContactPointInfo: (contactInfo: Partial<contactPointInfo>) =>
        set((state) => ({
          contactPointInfo: {
            ...state.contactPointInfo,
            ...contactInfo,
          },
        })),
      resetContactPointInfo: () =>
        set({
          contactPointInfo: {
            contactDepth: 0,
            contactNormal: new THREE.Vector3(),
          },
        }),

      /**
       *  Set/Update static collider props
       */
      staticMapPropsArray: [],
      setStaticMapPropsArray: (props: staticProps) =>
        set((state) => ({ staticMapPropsArray: [...state.staticMapPropsArray, props] })),

      /**
       *  Set/Update static collider boundsTree
       */
      staticBoundsTree: null,
      setStaticBoundsTree: (boundsTree: MeshBVH) =>
        set({ staticBoundsTree: boundsTree }),
    };
  })
);
