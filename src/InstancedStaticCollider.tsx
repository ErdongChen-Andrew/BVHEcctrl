/*!
 * BVHEcctrl
 * https://github.com/ErdongChen-Andrew/BVHEcctrl
 * (c) 2025 @ErdongChen-Andrew
 * Released under the MIT License.
 */

import * as THREE from "three";
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import React, { useEffect, useRef, type ReactNode, forwardRef, type RefObject, useMemo, } from "react";
import { useThree } from "@react-three/fiber";
import { MeshBVHHelper, StaticGeometryGenerator, computeBoundsTree, disposeBoundsTree, acceleratedRaycast, SAH, type SplitStrategy } from "three-mesh-bvh";
import { useEcctrlStore } from "./stores/useEcctrlStore";
import { useGLTF } from "@react-three/drei";

export interface StaticColliderProps extends Omit<React.ComponentProps<'group'>, 'ref'> {
    children?: ReactNode;
    debug?: boolean;
    debugVisualizeDepth?: number;
    restitution?: number;
    friction?: number;
    excludeFloatHit?: boolean;
    BVHOptions?: {
        strategy?: SplitStrategy
        verbose?: boolean
        setBoundingBox?: boolean
        maxDepth?: number
        maxLeafTris?: number
        indirect?: boolean
    }
};

const InstancedStaticCollider = forwardRef<THREE.Group, StaticColliderProps>(({
    children,
    debug = false,
    debugVisualizeDepth = 10,
    restitution = 0.05,
    friction = 0.8,
    excludeFloatHit = false,
    BVHOptions = {
        strategy: SAH,
        verbose: false,
        setBoundingBox: true,
        maxDepth: 40,
        maxLeafTris: 10,
        indirect: false,
    },
    ...props
}, ref) => {
    const scale = 2;
    const spacingX = 10;
    const spacingZ = 14.5;
    function generateSpiralPositions(count, spacingX, spacingZ) {
        const positions = [];
        let x = 0;
        let z = 0;
        let dx = 1;
        let dz = 0;
        let steps = 1;
        let stepCount = 0;
        let directionChanges = 0;

        positions.push([0, 0, 0]); // First at center

        for (let i = 1; i < count; i++) {
            x += dx;
            z += dz;
            positions.push([x * spacingX, 0, z * spacingZ]);

            stepCount++;
            if (stepCount >= steps) {
                stepCount = 0;
                // Change direction clockwise (right → down → left → up)
                [dx, dz] = [-dz, dx];
                directionChanges++;

                // Every two direction changes, increase step size
                if (directionChanges % 2 === 0) {
                    steps++;
                }
            }
        }

        return positions;
    }

    /**
     * Initialize setups
     */
    const { scene, gl } = useThree()
    const mergedMesh = useRef<THREE.InstancedMesh | null>(null)
    const bvhHelper = useRef<MeshBVHHelper | null>(null)
    const colliderRef = (ref as RefObject<THREE.Group>) ?? useRef<THREE.Group | null>(null);

    /**
     * Generate merged static geometry and BVH tree for collision detection
     */
    // const cleanGeom = new THREE.BufferGeometry();
    const matrices: THREE.Matrix4[] = [];
    const count = useRef<number>(0)
    const geo = useMemo(() => new THREE.BoxGeometry(0.5, 0.5, 0.5), []);
    const mat = useMemo(() => new THREE.MeshStandardMaterial(), []);
    const temp = useMemo(() => new THREE.Object3D(), [])
    const tempMatrix = useRef<THREE.Matrix4>(new THREE.Matrix4());
    const bakeInnModel = useGLTF("./fantasy_game_inn.glb");
    useEffect(() => {
        const spiralPositions = generateSpiralPositions(1000, spacingX, spacingZ);

        // Exit if colliderRef.current if not ready
        if (!colliderRef.current) return;
        // Recalculate the world matrix of the object and descendants on the current frame
        colliderRef.current.updateMatrixWorld(true);

        // colliderRef.current.traverse(obj => {
        //             if (!('isMesh' in obj && (obj as THREE.Mesh).isMesh)) return;
        //             const mesh = obj as THREE.Mesh;
        //             const geometry = mesh.geometry;

        //             // Skip if missing required attributes
        //             const position = geometry.getAttribute('position');
        //             const normal = geometry.getAttribute('normal');
        //             if (!position || !normal) return;
        //             // Clone and convert to non-indexed
        //             const geom = geometry.index ? geometry.toNonIndexed() : geometry.clone();

        //             // Strip everything except position and normal and apply matrix transform
        //             const cleanGeom = new THREE.BufferGeometry();
        //             cleanGeom.setAttribute('position', geom.getAttribute('position').clone());
        //             cleanGeom.setAttribute('normal', geom.getAttribute('normal').clone());
        //             cleanGeom.applyMatrix4(mesh.matrixWorld);

        //             meshes.push(new THREE.Mesh(cleanGeom));
        //         });

        //         // Early exit if no compatible meshes
        //         if (meshes.length === 0) {
        //             console.warn('No compatible meshes found for static geometry generation.');
        //             return;
        //         }

        //         // Generate static geometry from mesh array
        //         const staticGenerator = new StaticGeometryGenerator(meshes);
        //         staticGenerator.attributes = ['position', 'normal'];
        //         const mergedGeometry = staticGenerator.generate();

        //         // Create boundsTree and mesh from static geometry 
        //         mergedGeometry.computeBoundsTree = computeBoundsTree
        //         mergedGeometry.disposeBoundsTree = disposeBoundsTree
        //         mergedGeometry.computeBoundsTree(BVHOptions)
        //         mergedMesh.current = new THREE.Mesh(mergedGeometry)
        //         mergedMesh.current.raycast = acceleratedRaycast
        //         // Preset merged mesh user data
        //         mergedMesh.current.userData = { restitution, friction, excludeFloatHit, type: "STATIC" };

        //         // Save the merged mesh to globle store
        //         // Character can retrieve and collider with merged mesh later
        //         useEcctrlStore.getState().setColliderMeshesArray(mergedMesh.current)

        // Retrieve meshes from colliderRef.current
        const meshes: THREE.Mesh[] = [];
        colliderRef.current.traverse(obj => {
            if (!(obj instanceof THREE.InstancedMesh)) return;
            const mesh = obj as THREE.InstancedMesh;
            const geometry = mesh.geometry;

            // Skip if missing required attributes
            const position = geometry.getAttribute('position');
            const normal = geometry.getAttribute('normal');
            if (!position || !normal) return;
            // Only clean and clone geometry once
            const baseGeom = geometry.index ? geometry.toNonIndexed() : geometry.clone();

            // Strip everything except position and normal and apply matrix transform
            const cleanGeom = new THREE.BufferGeometry();
            cleanGeom.setAttribute('position', baseGeom.getAttribute('position').clone());
            cleanGeom.setAttribute('normal', baseGeom.getAttribute('normal').clone());
            // cleanGeom.applyMatrix4(mesh.matrixWorld);

            cleanGeom.computeBoundsTree = computeBoundsTree
            cleanGeom.disposeBoundsTree = disposeBoundsTree
            cleanGeom.computeBoundsTree(BVHOptions)


            // Create inteanced 
            mergedMesh.current = new THREE.InstancedMesh(cleanGeom, undefined, mesh.count)
            for (let i = 0; i < mesh.count; i++) {
                mesh.getMatrixAt(i, tempMatrix.current);
                tempMatrix.current.premultiply(mesh.matrix)
                mergedMesh.current.setMatrixAt(i, tempMatrix.current)
            }
            mergedMesh.current.instanceMatrix.needsUpdate = true;

            mergedMesh.current.userData = { restitution, friction, excludeFloatHit, type: "STATIC" };
            useEcctrlStore.getState().setColliderMeshesArray(mergedMesh.current)
        })

        // Early exit if no compatible meshes
        // if (meshes.length === 0) {
        //     console.warn('No compatible meshes found for static geometry generation.');
        //     return;
        // }
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
         */
        // cleanGeom.computeBoundsTree = computeBoundsTree
        // cleanGeom.disposeBoundsTree = disposeBoundsTree
        // cleanGeom.computeBoundsTree(BVHOptions)

        // mergedMesh.current = new THREE.InstancedMesh(cleanGeom, undefined, count.current)
        // mergedMesh.current.raycast = acceleratedRaycast
        // const tempMatrix = new THREE.Matrix4();
        // const temp = new THREE.Object3D()
        // // const pos = new THREE.Vector3()
        // // const quat = new THREE.Quaternion()
        // // const scale = new THREE.Vector3()

        // for (let i = 0; i < mesh.count; i++) {
        //     // mesh.getMatrixAt(i, tempMatrix);
        //     // // tempMatrix.premultiply(mesh.matrixWorld);

        //     // // tempMatrix.decompose(pos, quat, scale)
        //     // // console.log(pos, quat, scale);

        //     // // matrix.premultiply(mesh.matrixWorld);
        //     // mergedMesh.current.setMatrixAt(i, tempMatrix)

        //     const pos = spiralPositions[i];
        //     if (!pos) break;

        //     temp.position.set(pos[0], pos[1], pos[2]);
        //     temp.rotation.set(-Math.PI / 2, 0, 0);
        //     temp.scale.set(scale, scale, scale);
        //     temp.updateMatrix();

        //     mergedMesh.current.setMatrixAt(i, temp.matrix)
        // }
        // mergedMesh.current.instanceMatrix.needsUpdate = true;
        // // mergedMesh.current.updateMatrixWorld(true);

        // // mergedMesh.current.geometry.computeBoundsTree(BVHOptions)

        // scene.add(mergedMesh.current)
        // mergedMesh.current.userData = { restitution, friction, excludeFloatHit, type: "STATIC" };

        // useEcctrlStore.getState().setColliderMeshesArray(mergedMesh.current)
        // });

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
         */

        // // cleanGeom.computeBoundsTree = computeBoundsTree
        // // cleanGeom.disposeBoundsTree = disposeBoundsTree
        // // cleanGeom.computeBoundsTree(BVHOptions)
        // mergedMesh.current = new THREE.InstancedMesh(geo, mat, 1000)
        // // mergedMesh.current.raycast = acceleratedRaycast
        // const tempMatrix = new THREE.Matrix4();
        // // const pos = new THREE.Vector3()
        // // const quat = new THREE.Quaternion()
        // // const scale = new THREE.Vector3()

        // for (let i = 0; i < 1000; i++) {
        //     const pos = spiralPositions[i];
        //     if (!pos) break;

        //     temp.position.set(pos[0], -2, pos[2]);
        //     temp.rotation.set(-Math.PI / 2, 0, 0);
        //     temp.scale.set(scale, scale, scale);
        //     temp.updateMatrix();

        //     mergedMesh.current.setMatrixAt(i, temp.matrix);
        // }
        // mergedMesh.current.instanceMatrix.needsUpdate = true;
        // mergedMesh.current.updateMatrixWorld(true);

        // scene.add(mergedMesh.current);

        // mergedMesh.current.geometry.computeBoundsTree = computeBoundsTree
        // mergedMesh.current.geometry.disposeBoundsTree = disposeBoundsTree
        // mergedMesh.current.geometry.computeBoundsTree(BVHOptions)

        // mergedMesh.current.userData = { restitution, friction, excludeFloatHit, type: "STATIC" };

        // useEcctrlStore.getState().setColliderMeshesArray(mergedMesh.current)

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
         */
        // // Retrieve meshes from colliderRef.current
        // const meshes: THREE.Mesh[] = [];
        // // colliderRef.current.traverse(obj => { if ((obj as THREE.Mesh).isMesh) meshes.push(obj as THREE.Mesh); });
        // colliderRef.current.traverse(obj => {
        //     if (!('isMesh' in obj && (obj as THREE.Mesh).isMesh)) return;
        //     const mesh = obj as THREE.Mesh;
        //     const geometry = mesh.geometry;

        //     // Skip if missing required attributes
        //     const position = geometry.getAttribute('position');
        //     const normal = geometry.getAttribute('normal');
        //     if (!position || !normal) return;
        //     // Clone and convert to non-indexed
        //     const geom = geometry.index ? geometry.toNonIndexed() : geometry.clone();

        //     // Strip everything except position and normal and apply matrix transform
        //     const cleanGeom = new THREE.BufferGeometry();
        //     cleanGeom.setAttribute('position', geom.getAttribute('position').clone());
        //     cleanGeom.setAttribute('normal', geom.getAttribute('normal').clone());
        //     cleanGeom.applyMatrix4(mesh.matrixWorld);

        //     meshes.push(new THREE.Mesh(cleanGeom));
        // });

        // // Early exit if no compatible meshes
        // if (meshes.length === 0) {
        //     console.warn('No compatible meshes found for static geometry generation.');
        //     return;
        // }

        // // Generate static geometry from mesh array
        // const staticGenerator = new StaticGeometryGenerator(meshes);
        // staticGenerator.attributes = ['position', 'normal'];
        // const mergedGeometry = staticGenerator.generate();

        // // Create boundsTree and mesh from static geometry 
        // mergedGeometry.computeBoundsTree = computeBoundsTree
        // mergedGeometry.disposeBoundsTree = disposeBoundsTree
        // mergedGeometry.computeBoundsTree(BVHOptions)
        // mergedMesh.current = new THREE.Mesh(mergedGeometry)
        // // Preset merged mesh user data
        // mergedMesh.current.userData = { restitution, friction, excludeFloatHit, type: "STATIC" };

        // // Save the merged mesh to globle store
        // // Character can retrieve and collider with merged mesh later
        // useEcctrlStore.getState().setColliderMeshesArray(mergedMesh.current)

        // Clean up geometry/boundsTree/mesh/bvhHelper 
        return () => {
            if (mergedMesh.current) {
                useEcctrlStore.getState().removeColliderMesh(mergedMesh.current)
                mergedMesh.current.geometry.disposeBoundsTree?.();
                mergedMesh.current.geometry.dispose();
                mergedMesh.current = null
            }
            if (bvhHelper.current) {
                scene.remove(bvhHelper.current);
                (bvhHelper.current as any).dispose?.()
                bvhHelper.current = null
            };
        };
    }, [])

    /**
     * Update merged mesh properties and user data
     */
    useEffect(() => {
        if (mergedMesh.current) {
            mergedMesh.current.visible = props.visible ?? true
            mergedMesh.current.userData.friction = friction
            mergedMesh.current.userData.restitution = restitution
            mergedMesh.current.userData.excludeFloatHit = excludeFloatHit
        }
    }, [props.visible, friction, restitution, excludeFloatHit])

    /**
     * Update BVH debug helper
     */
    useEffect(() => {
        if (mergedMesh.current) {
            // If bvhHelper.current exist, only targgle visible
            // Else create bvhHelper from mergedMesh.current
            if (bvhHelper.current) {
                bvhHelper.current.visible = debug
            } else {
                bvhHelper.current = new MeshBVHHelper(mergedMesh.current, 20)
                bvhHelper.current.visible = debug
                scene.add(bvhHelper.current)
            }
        }
    }, [debug])

    return (
        <group ref={colliderRef} {...props} dispose={null}>
            {/* Static collider model */}
            {children}
        </group>
    );
})

export default React.memo(InstancedStaticCollider);