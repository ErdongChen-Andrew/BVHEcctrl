import * as THREE from "three";
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import React, { useEffect, useRef, useMemo, useState, type ReactNode, forwardRef, type ForwardedRef, type RefObject, type JSX } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Helper, Merged, PivotControls, TransformControls, useBVH, useHelper } from "@react-three/drei";
import { MeshBVHHelper, StaticGeometryGenerator, MeshBVH, computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from "three-mesh-bvh";
import { useControls } from "leva";
import { useEcctrlStore } from "./stores/useEcctrlStore";

export interface StaticColliderProps extends Omit<React.ComponentProps<'group'>, 'ref'> {
    children?: ReactNode;
    debug?: boolean;
    debugVisualizeDepth?: number;
    restitution?: number;
    friction?: number;
};

const StaticCollider = forwardRef<THREE.Group, StaticColliderProps>(({
    children,
    debug = false,
    debugVisualizeDepth = 10,
    restitution = 0.05,
    friction = 0.8,
    ...props
}, ref) => {
    /**
     * Initialize
     */
    const { scene, gl } = useThree()
    const mergedMesh = useRef<THREE.Mesh | null>(null)
    const bvhHelper = useRef<MeshBVHHelper | null>(null)
    const colliderRef = (ref as RefObject<THREE.Group>) ?? useRef<THREE.Group | null>(null);

    useEffect(() => {
        if (!colliderRef.current) return;

        colliderRef.current.updateMatrixWorld(true);

        const meshes: THREE.Mesh[] = [];
        colliderRef.current.traverse(obj => {
            if ((obj as THREE.Mesh).isMesh) meshes.push(obj as THREE.Mesh);
        });

        const staticGenerator = new StaticGeometryGenerator(meshes);
        staticGenerator.attributes = ['position', 'normal'];
        const mergedGeometry = staticGenerator.generate();
        mergedGeometry.boundsTree = new MeshBVH(mergedGeometry);
        mergedMesh.current = new THREE.Mesh(mergedGeometry)

        mergedMesh.current.userData.restitution = restitution
        mergedMesh.current.userData.friction = friction

        useEcctrlStore.getState().setStaticMeshesArray(mergedMesh.current)

        return () => {
            if (mergedMesh.current) {
                useEcctrlStore.getState().removeStaticMesh(mergedMesh.current)
                mergedGeometry.dispose()
                mergedMesh.current = null
            }
            if (bvhHelper.current) {
                scene.remove(bvhHelper.current);
                (bvhHelper.current as any).dispose?.()
                bvhHelper.current = null
            };
        };
    }, [])

    // useEffect(() => {
    //     const geometries: THREE.BufferGeometry[] = []
    //     const tempObj = new THREE.Object3D()

    //     colliderRef.current.updateMatrixWorld(true)

    //     colliderRef.current.traverse(obj => {
    //         if ((obj as THREE.InstancedMesh).isInstancedMesh) {
    //             const instanced = obj as THREE.InstancedMesh
    //             const baseMatrix = obj.matrixWorld.clone()

    //             for (let i = 0; i < instanced.count; i++) {
    //                 const instanceMatrix = new THREE.Matrix4()
    //                 instanced.getMatrixAt(i, instanceMatrix)

    //                 const worldMatrix = new THREE.Matrix4().multiplyMatrices(baseMatrix, instanceMatrix)
    //                 const transformedGeometry = instanced.geometry.clone()
    //                 transformedGeometry.applyMatrix4(worldMatrix)

    //                 geometries.push(transformedGeometry)
    //             }
    //         } else if ((obj as THREE.Mesh).isMesh) {
    //             const mesh = obj as THREE.Mesh
    //             const geo = mesh.geometry.clone()
    //             // geo.applyMatrix4(mesh.matrixWorld)
    //             geometries.push(geo)
    //         }
    //     })

    //     const mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries, false)
    //     mergedGeometry.boundsTree = new MeshBVH(mergedGeometry)
    //     mergedMesh.current = new THREE.Mesh(mergedGeometry)
    //     mergedMesh.current.userData.friction = friction
    //     mergedMesh.current.userData.restitution = restitution
    //     useEcctrlStore.getState().setStaticMeshesArray(mergedMesh.current)
    // }, [])

    useEffect(() => {
        if (mergedMesh.current) {
            mergedMesh.current.visible = props.visible ?? true
            mergedMesh.current.userData.friction = friction
            mergedMesh.current.userData.restitution = restitution
        }
    }, [props.visible, friction, restitution])

    // Debug helper setup
    useEffect(() => {
        if (mergedMesh.current) {
            if (bvhHelper.current) {
                bvhHelper.current.visible = debug
            } else {
                bvhHelper.current = new MeshBVHHelper(mergedMesh.current, 20)
                bvhHelper.current.visible = debug
                scene.add(bvhHelper.current)
            }
        }
    }, [debug])

    /**
     * 
     * 
     * 
     * 
     * 
     * 
     * 
     * 
     * 
     * 
     */
    const prevMatrix = useRef(new THREE.Matrix4());
    const prevPosition = useRef(new THREE.Vector3());
    const velocity = useRef(new THREE.Vector3());
    useFrame((state, delta) => {
        if (mergedMesh.current && colliderRef.current) {
            // 1. Get current world position of collider
            const currentPos = new THREE.Vector3();
            colliderRef.current.getWorldPosition(currentPos);

            // 2. Compute velocity: v = (current - previous) / delta
            velocity.current
                .copy(currentPos)
                .sub(prevPosition.current)
                .divideScalar(delta);

            // 3. Save current position for next frame
            prevPosition.current.copy(currentPos);

            // 4. Transform mergedMesh to match colliderRef
            mergedMesh.current.matrix.copy(colliderRef.current.matrixWorld);
            mergedMesh.current.matrix.decompose(
                mergedMesh.current.position,
                mergedMesh.current.quaternion,
                mergedMesh.current.scale
            );
            mergedMesh.current.updateMatrixWorld(true);

            // 5. Optional: assign velocity to mergedMesh for character to use
            mergedMesh.current.userData.velocity = velocity.current.clone();
        }
    })
    /**
     * 
     * 
     * 
     * 
     * 
     * 
     * 
     * 
     * 
     */

    return (
        <group ref={colliderRef} {...props} dispose={null}>
            {/* Static collider model */}
            {children}
        </group>
    );
})

export default React.memo(StaticCollider);