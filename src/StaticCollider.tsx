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
    friction = 0.5,
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
        const staticGenerator = new StaticGeometryGenerator(colliderRef.current);
        staticGenerator.attributes = ['position'];
        const mergedGeometry = staticGenerator.generate();
        mergedGeometry.boundsTree = new MeshBVH(mergedGeometry);
        mergedMesh.current = new THREE.Mesh(mergedGeometry)

        // colliderRef.current.userData.restitution = restitution
        // colliderRef.current.userData.mergedMesh = mergedMesh.current

        // useEcctrlStore.getState().setStaticBoundsTree(mergedGeometry.boundsTree)
        useEcctrlStore.getState().setStaticMapPropsArray({ restitution, friction, boundsTree: mergedGeometry.boundsTree })

        // Debug helper setup
        bvhHelper.current = new MeshBVHHelper(mergedMesh.current, 20)
        scene.add(bvhHelper.current)

        return () => {
            mergedGeometry.dispose()
            if (bvhHelper.current) {
                scene.remove(bvhHelper.current)
            };
        };
    }, [])

    useEffect(() => {
        if (bvhHelper.current) {
            bvhHelper.current.visible = debug
        }
    }, [debug])

    useFrame((state, delta) => {
        /**
         * Collision Check
         * Check if character segment range is collider with map bvh
         * If so, getting contact point depth and direction, then apply to character 
         */
        // Early exit if map geometry boundsTree is not ready
        const geometry = mergedMesh.current?.geometry;
        const boundsTree = geometry?.boundsTree;
        if (!boundsTree) return;

        // Getting all useful info from globle store
        const ecctrlStore = useEcctrlStore.getState();
        const characterGroupRef = ecctrlStore.characterGroupRef;
        const segment = ecctrlStore.characterSegment;
        const bbox = ecctrlStore.characterBbox;
        const characterCollider = ecctrlStore.characterCollider;
        const currentStatus = ecctrlStore.characterCurrentStatus

        // ecctrlStore.resetContactPointInfo()
        // boundsTree.shapecast({
        //     intersectsBounds: box => box.intersectsBox(bbox),
        //     intersectsTriangle: tri => {
        //         const distance = tri.closestPointToSegment(segment, triContactPoint, capsuleContactPoint);
        //         if (distance < characterCollider.radius) {
        //             const contactDepth = characterCollider.radius - distance;
        //             contactNormal.subVectors(capsuleContactPoint, triContactPoint).normalize();
        //             // console.log(contactDepth, contactDirection);
        //             // console.log("collid");

        //             /**
        //              * Character colliding logic here, (wip)
        //              */
        //             // Update character new position according to contactDirection and contactDepth
        //             // if (characterGroupRef) {
        //                 // characterGroupRef.current.position.addScaledVector(contactNormal, contactDepth);
        //                 ecctrlStore.setContactPointInfo({ contactDepth: contactDepth, contactNormal: contactNormal })
        //             // }

        //             // Update debug contact point position/direction
        //             if (debug) {
        //                 contactPointRef.current?.position.copy(triContactPoint)
        //                 contactPointRef.current?.lookAt(contactNormal)
        //             }

        //             // Early exit collision check for better performance
        //             // return true
        //         }
        //     }
        // })

        // for (let i = 0; i < 3; i++) {
        //     let maxPenetration = 0;
        //     let deepestDirection = new THREE.Vector3();
        //     let deepestTriContact = new THREE.Vector3();
        //     ecctrlStore.resetContactPointInfo()

        //     boundsTree.shapecast({
        //         intersectsBounds: box => box.intersectsBox(bbox),
        //         intersectsTriangle: tri => {
        //             const distance = tri.closestPointToSegment(segment, triContactPoint, capsuleContactPoint);
        //             if (distance < characterCollider.radius) {
        //                 const penetration = characterCollider.radius - distance;
        //                 if (penetration > maxPenetration) {
        //                     maxPenetration = penetration;
        //                     deepestDirection.subVectors(capsuleContactPoint, triContactPoint).normalize();
        //                     // deepestTriContact.copy(triContactPoint);
        //                 }
        //                 return false;
        //             }
        //         }
        //     });

        //     if (maxPenetration === 0) break;

        //     // characterGroupRef?.current.position.addScaledVector(deepestDirection, maxPenetration);
        //     ecctrlStore.setContactPointInfo({ contactDepth: maxPenetration, contactNormal: deepestDirection })
        // }

        // let contactNormalSum = new THREE.Vector3();

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
         * 
         * 
         * 
         * 
         * 
         * 
         */

        // totalContactDepth = 0;
        // let maxContactDepth = 0
        // contactNormalSum.set(0, 0, 0)
        // let iterationNum = 0

        // boundsTree.shapecast({
        //     intersectsBounds: box => box.intersectsBox(bbox),
        //     intersectsTriangle: tri => {
        //         const distance = tri.closestPointToSegment(segment, triContactPoint, capsuleContactPoint);
        //         if (distance < characterCollider.radius) {
        //             const penetration = characterCollider.radius - distance;
        //             contactNormal.subVectors(capsuleContactPoint, triContactPoint).normalize();

        //             // Accumulate weighted normal
        //             contactNormalSum.addScaledVector(contactNormal, penetration + 1e-5);
        //             // contactNormalSum.add(contactNormal)

        //             if (maxContactDepth < penetration) maxContactDepth = penetration
        //             totalContactDepth += penetration;

        //             iterationNum += 1

        //             // Update debug contact point position/direction
        //             if (debug) {
        //                 contactPointRef.current?.position.copy(triContactPoint)
        //                 contactPointRef.current?.lookAt(contactNormalSum)
        //             }

        //             // Early exit: stop entire shapecast once we hit the limit
        //             if (iterationNum >= maxIterationNum) {
        //                 return true; // This stops the whole traversal
        //             }
        //         }
        //     }
        // });

        // if (totalContactDepth > 0) {
        //     contactNormalSum.normalize(); // average direction
        //     ecctrlStore.setContactPointInfo({ contactDepth: totalContactDepth, contactNormal: contactNormalSum });
        // } else {
        //     ecctrlStore.resetContactPointInfo();
        // }
    })

    return (
        <group ref={colliderRef} {...props} dispose={null}>
            {/* Static collider model */}
            {children}
        </group>
    );
})

export default React.memo(StaticCollider);