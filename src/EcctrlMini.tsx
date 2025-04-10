import * as THREE from "three";
import React, { useEffect, useRef, useMemo, useState, type ReactNode, forwardRef, type ForwardedRef, type RefObject, type JSX, Suspense, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Helper, PivotControls, TransformControls, useKeyboardControls } from "@react-three/drei";
import { useEcctrlStore, type staticProps } from "./stores/useEcctrlStore";

export interface EcctrlProps extends Omit<React.ComponentProps<'group'>, 'ref'> {
    children?: ReactNode;
    debug?: boolean;
    colliderCapsuleArgs?: [radius: number, length: number, capSegments: number, radialSegments: number];
    initPos?: [x: number, y: number, z: number];
    enablePhysics?: boolean;
    gravity?: number;
    mass?: number;
    maxWalkSpeed?: number;
    maxRunSpeed?: number;
    acceleration?: number;
    jumpVel?: number;
    floatHeight?: number;
    floatForgiveness?: number;
    floatSensorRadius?: number;
    collisionCheckIteration?: number
};

const EcctrlMini = forwardRef<THREE.Group, EcctrlProps>(({
    children,
    debug = true,
    // Character collider props
    colliderCapsuleArgs = [0.3, 0.5, 4, 8],
    initPos = [0, 0, 0],
    // Physics props
    enablePhysics = true,
    gravity = 9.81,
    mass = 1,
    // Controller props
    maxWalkSpeed = 3,
    maxRunSpeed = 5,
    acceleration = 10,
    jumpVel = 5,
    floatHeight = 0.3,
    floatForgiveness = 0.1,
    floatSensorRadius = 0.1,
    // Collision check props
    collisionCheckIteration = 3,
    // Other props
    ...props
}, ref) => {
    /**
     * Initialize setups
     */
    const capsuleRadius = useMemo(() => colliderCapsuleArgs[0], [])
    const capsuleLength = useMemo(() => colliderCapsuleArgs[1], [])
    // Ref for meshes
    const characterGroupRef = (ref as RefObject<THREE.Group>) ?? useRef<THREE.Group | null>(null);
    const characterColliderRef = useRef<THREE.Mesh | null>(null);
    const characterModelRef = useRef<THREE.Group | null>(null);
    // Mutable character collision objects
    const characterBbox = useRef<THREE.Box3>(new THREE.Box3())
    const characterBboxSize = useRef<THREE.Vector3>(new THREE.Vector3())
    const characterBboxCenter = useRef<THREE.Vector3>(new THREE.Vector3())
    const characterSegment = useRef<THREE.Line3>(new THREE.Line3())
    // Mutable float sensor objects
    const floatSensorBbox = useRef<THREE.Box3>(new THREE.Box3())
    const floatSensorBboxSize = useRef<THREE.Vector3>(new THREE.Vector3())
    const floatSensorBboxCenter = useRef<THREE.Vector3>(new THREE.Vector3())
    const floatSensorSegment = useRef<THREE.Line3>(new THREE.Line3())
    // Debug indicators initialize
    const debugBbox = useRef<THREE.Mesh | null>(null)
    const debugLineStart = useRef<THREE.Mesh | null>(null)
    const debugLineEnd = useRef<THREE.Mesh | null>(null)
    const debugFloatBbox = useRef<THREE.Mesh | null>(null)
    const debugFloatStart = useRef<THREE.Mesh | null>(null)
    const debugFloatEnd = useRef<THREE.Mesh | null>(null)
    const contactPointRef = useRef<THREE.Mesh | null>(null)
    const standPointRef = useRef<THREE.Mesh | null>(null)

    /**
     * Globle store values/functions
     */
    const setCharacterCollider = useEcctrlStore((state) => state.setCharacterCollider)
    const setCharacterGroupRef = useEcctrlStore((state) => state.setCharacterGroupRef)
    const setCharacterBbox = useEcctrlStore((state) => state.setCharacterBbox)
    const setCharacterSegment = useEcctrlStore((state) => state.setCharacterSegment)
    const setCharacterCurrentStatus = useEcctrlStore((state) => state.setCharacterCurrentStatus)
    // Update character cpsule collider/segment/bbox/groupref to globle store when app initialized
    // useEffect(() => {
    //     // Update character capsule collider
    //     // setCharacterCollider({
    //     //     radius: colliderCapsuleArgs[0],
    //     //     length: colliderCapsuleArgs[1],
    //     //     capSegments: colliderCapsuleArgs[2],
    //     //     radialSegments: colliderCapsuleArgs[3],
    //     // })

    //     // Update character capsule segment
    //     characterSegment.current.start.set(initPos[0], initPos[1] + colliderCapsuleArgs[1] / 2, initPos[2])
    //     characterSegment.current.end.set(initPos[0], initPos[1] - colliderCapsuleArgs[1] / 2, initPos[2])
    //     // setCharacterSegment(characterSegment.current)

    //     // Update character bounding box
    //     characterBbox.current
    //         .makeEmpty()
    //         .expandByPoint(characterSegment.current.start)
    //         .expandByPoint(characterSegment.current.end)
    //         .expandByScalar(colliderCapsuleArgs[0]);
    //     // setCharacterBbox(characterBbox.current)

    //     // Update character groupref
    //     // if (characterGroupRef.current) setCharacterGroupRef(characterGroupRef);
    // }, [])

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
    // const { scene } = useThree()
    // const staticCollidersSet = useRef<Set<StaticColliderInfo>>(new Set());
    // useEffect(() => {
    //     const timeOut = setTimeout(() => {            
    //         staticCollidersSet.current.clear()
    //         scene.traverse((obj) => {
    //             if (obj.type === 'Group' && (obj as THREE.Group).userData?.isStaticCollider) {
    //                 console.log(obj.userData);

    //                 const restitution = obj.userData.restitution
    //                 const mergedMesh = obj.userData.mergedMesh
    //                 staticCollidersSet.current.add({ restitution, mergedMesh });
    //             }
    //         });
    //     }, 5000)
    //     return () => clearTimeout(timeOut)
    // }, [])

    /**
     * Check if inside keyboardcontrols
     */
    function useIsInsideKeyboardControls() {
        try {
            return !!useKeyboardControls()
        } catch {
            return false
        }
    }
    const isInsideKeyboardControls = useIsInsideKeyboardControls();

    /**
     * keyboard controls setup
     */
    const [subscribeKeys, getKeys] = isInsideKeyboardControls ? useKeyboardControls() : [null];
    const presetKeys = { forward: false, backward: false, leftward: false, rightward: false, jump: false, run: false };

    /**
     * Keyboard controls subscribe setup
     */
    // If inside keyboardcontrols, active subscribeKeys
    if (isInsideKeyboardControls && subscribeKeys) {
        useEffect(() => {
            // Jump key subscribe for special animation
            const unSubscribeJump = subscribeKeys(
                (state) => state.jump,
                (value) => {
                    if (value) currentLinVel.current.addScaledVector(upAxis, jumpVel)
                }
            );

            return () => {
                unSubscribeJump();
            };
        });
    }

    /**
     * Physics preset
     */
    const upAxis = useMemo(() => new THREE.Vector3(0, 1, 0), [])
    const gravityDir = useMemo(() => new THREE.Vector3(0, -1, 0), [])
    const currentLinVel = useRef<THREE.Vector3>(new THREE.Vector3())

    /**
     * Controls preset
     */
    const inputDir = useRef<THREE.Vector3>(new THREE.Vector3())
    const wantToMoveVel = useRef<THREE.Vector3>(new THREE.Vector3())
    const characterXAxis = useMemo(() => new THREE.Vector3(1, 0, 0), [])
    const characterYAxis = useMemo(() => new THREE.Vector3(0, 1, 0), [])
    const characterZAxis = useMemo(() => new THREE.Vector3(0, 0, 1), [])

    /**
     * Collision preset
     */
    const contactDepth = useRef<number>(0)
    const contactNormal = useRef<THREE.Vector3>(new THREE.Vector3())
    const triContactPoint = useRef<THREE.Vector3>(new THREE.Vector3())
    const capsuleContactPoint = useRef<THREE.Vector3>(new THREE.Vector3())
    const floatHitPoint = useRef<THREE.Vector3>(new THREE.Vector3())
    const floatHitPointOnPlane = useRef<THREE.Vector3>(new THREE.Vector3())
    const floatHitPointOnGAxis = useRef<THREE.Vector3>(new THREE.Vector3())

    /**
     * Gravity funtion
     */
    const applyGravity = useCallback((delta: number) => {
        currentLinVel.current.y -= gravity * delta;
        if (characterGroupRef.current) {
            characterGroupRef.current.position.y += currentLinVel.current.y * delta;
        }
    }, [])

    /**
     * Get moving direction function
     * Getting Character moving direction from user inputs
     */
    const getMovingDirection = useCallback((
        forward: boolean,
        backward: boolean,
        leftward: boolean,
        rightward: boolean,)
        : THREE.Vector3 => {
        inputDir.current.set(0, 0, 0)
        if (forward) inputDir.current.z = -1
        if (backward) inputDir.current.z = 1
        if (leftward) inputDir.current.x = -1
        if (rightward) inputDir.current.x = 1
        return inputDir.current.normalize()
    }, [])

    /**
     * Handle character movement function
     */
    const handleCharacterMovement = useCallback((direction: THREE.Vector3, runState: boolean, delta: number) => {
        if (direction.length() > 0) {
            wantToMoveVel.current.copy(direction).multiplyScalar(runState ? maxRunSpeed : maxWalkSpeed);
            currentLinVel.current.lerp(wantToMoveVel.current, acceleration * delta)
        } else {
            currentLinVel.current.lerp(new THREE.Vector3(), acceleration * delta)
        }
    }, [])

    /**
     * Update character segment/bbox function
     */
    const updateSegmentBBox = useCallback(() => {
        // Update character capsule segment
        characterSegment.current.start.set(0, capsuleLength / 2, 0).add(characterGroupRef.current.position)
        characterSegment.current.end.set(0, -capsuleLength / 2, 0).add(characterGroupRef.current.position)

        // Update character bounding box
        characterBbox.current
            .makeEmpty()
            .expandByPoint(characterSegment.current.start)
            .expandByPoint(characterSegment.current.end)
            .expandByScalar(capsuleRadius)

        // Update float sensor segment
        floatSensorSegment.current.start.copy(characterSegment.current.end)
        floatSensorSegment.current.end.copy(floatSensorSegment.current.start).addScaledVector(upAxis, -capsuleRadius - floatHeight)

        // Update float sensor bounding box
        floatSensorBbox.current
            .makeEmpty()
            .expandByPoint(floatSensorSegment.current.start)
            .expandByPoint(floatSensorSegment.current.end)
            .expandByScalar(floatSensorRadius)
    }, [])

    /**
     * Handle character collision response function
     */
    const handleCollisionResponse = useCallback((staticPropsArray: staticProps[]) => {
        /**
         * Collision Check
         * Check if character segment range is collider with map bvh
         * If so, getting contact point depth and direction, then apply to character velocity
         */
        // Check collisions multiple times for better precision 
        for (let i = 0; i < collisionCheckIteration; i++) {
            for (const props of staticPropsArray) {
                // Early exit if map geometry boundsTree is not ready
                if (!props.boundsTree) return;

                // Reset contact point info
                contactDepth.current = 0
                contactNormal.current.set(0, 0, 0)
                triContactPoint.current.set(0, 0, 0)
                capsuleContactPoint.current.set(0, 0, 0)

                // Bounds tree conllision check, finding contact normal and depth
                props.boundsTree.shapecast({
                    // If not intersects with character bbox, just stop entire shapecast
                    intersectsBounds: box => box.intersectsBox(characterBbox.current),
                    // If intersects with character bbox, deeply check collision with character segment
                    intersectsTriangle: tri => {
                        // Find closest distance to character segment
                        const distance = tri.closestPointToSegment(characterSegment.current, triContactPoint.current, capsuleContactPoint.current);                        
                        
                        // If distance is less then character capsule radius, means there is a collision happening
                        if (distance < capsuleRadius) {
                            // Calculate collision contact depth and normal
                            contactDepth.current = capsuleRadius - distance;
                            contactNormal.current.subVectors(capsuleContactPoint.current, triContactPoint.current).normalize();

                            /**
                             * Resolve character collision velocity
                             * Absorb velocity at direction into collider, 
                             * optionly apply bounce velocity from collider (restitution)
                             */
                            const dot = currentLinVel.current.dot(contactNormal.current);
                            if (dot < 0) {
                                const bounceVel = contactNormal.current.clone().multiplyScalar(-dot * (1 + props.restitution))
                                currentLinVel.current.add(bounceVel);
                            }
                        }
                    }
                });
            }
        }
    }, [])

    /**
     * Handle character floating response function
     */
    const handleFloatingResponse = useCallback((staticPropsArray: staticProps[]) => {
        /**
         * Floating Check
         * Check if closest distance is less then floating height, float character up
         */
        for (const props of staticPropsArray) {
            // Early exit if map geometry boundsTree is not ready
            if (!props.boundsTree) return;

            floatHitPoint.current.set(0, 0, 0)
            const testpoint = new THREE.Vector3()

            props.boundsTree.shapecast({
                intersectsBounds: box => box.intersectsBox(floatSensorBbox.current),
                intersectsTriangle: tri => {
                    // const distance = tri.closestPointToSegment(floatSensorSegment.current, floatHitPoint.current, testpoint);
                    tri.closestPointToPoint(floatSensorSegment.current.start, floatHitPoint.current);
                    floatHitPointOnPlane.current.copy(floatHitPoint.current).projectOnPlane(upAxis)
                    // if (floatHitPointOnPlane.current.distanceTo(floatSensorSegment.current.start) < floatSensorRadius) {
                        // standPointRef.current?.position.copy(floatHitPoint.current)
                        // console.log(standPointRef.current?.position);
                    // }
                }
            })
        }
    }, [])

    /**
     * Update debug indicators function
     */
    const updateDebugger = useCallback(() => {
        // Get bbox size and center
        characterBbox.current.getSize(characterBboxSize.current);
        characterBbox.current.getCenter(characterBboxCenter.current);

        // Apply the updated values to the bbox mesh
        debugBbox.current?.position.copy(characterBboxCenter.current);
        debugBbox.current?.scale.set(characterBboxSize.current.x, characterBboxSize.current.y, characterBboxSize.current.z);

        // Apply the updated values to character segment start/end
        debugLineStart.current?.position.copy(characterSegment.current.start)
        debugLineEnd.current?.position.copy(characterSegment.current.end)

        // Get float sensor bbox size and center
        floatSensorBbox.current.getSize(floatSensorBboxSize.current);
        floatSensorBbox.current.getCenter(floatSensorBboxCenter.current);

        // Apply the updated values to the float sensor bbox mesh
        debugFloatBbox.current?.position.copy(floatSensorBboxCenter.current);
        debugFloatBbox.current?.scale.set(floatSensorBboxSize.current.x, floatSensorBboxSize.current.y, floatSensorBboxSize.current.z);

        // Apply the updated values to character float sensor segment start/end
        debugFloatStart.current?.position.copy(floatSensorSegment.current.start)
        debugFloatEnd.current?.position.copy(floatSensorSegment.current.end)

        // Apply the updated values to contact indicator
        contactPointRef.current?.position.copy(triContactPoint.current)
        contactPointRef.current?.lookAt(contactNormal.current)
    }, [])

    useFrame((state, delta) => {
        /**
         * Globle store values
         * Getting static collider props array from store
         */
        const staticPropsArray = useEcctrlStore.getState().staticMapPropsArray;

        /**
         * Getting all the useful keys from useKeyboardControls
         */
        const { forward, backward, leftward, rightward, jump, run } = isInsideKeyboardControls && getKeys ? getKeys() : presetKeys;

        /**
         * Handle character movement input
         */
        const movingDirection = getMovingDirection(forward, backward, leftward, rightward)
        // Apply user input to character moving velocity
        handleCharacterMovement(movingDirection, run, delta)

        /**
         * Apply custom gravity to character current velocity
         */
        // if (characterGroupRef.current && enablePhysics) applyGravity(delta)

        /**
         * Update collider segement/bbox to temp new position for collision check
         */
        if (currentLinVel.current.length() > 0) updateSegmentBBox()

        /**
         * Handle character collision response
         * Apply contact normal and contact depth to character current velocity
         */
        if (currentLinVel.current.length() > 0 && staticPropsArray.length !== 0) handleCollisionResponse(staticPropsArray)

        /**
         * Handle character floating response
         */
        if (currentLinVel.current.length() > 0 && staticPropsArray.length !== 0) handleFloatingResponse(staticPropsArray)

        /**
         * Limit minimum velocity (sleep)
         */
        if (currentLinVel.current.length() < 0.01) currentLinVel.current.set(0, 0, 0)

        /**
         * Apply sum up velocity to move character position
         */
        characterGroupRef.current.position.addScaledVector(currentLinVel.current, delta)

        /**
         * Update character status for exporting
         */
        characterGroupRef.current.getWorldPosition(characterStatus.position)
        characterGroupRef.current.getWorldQuaternion(characterStatus.quaternion)
        characterStatus.linvel.copy(currentLinVel.current)

        /**
         * Update debug indicators
         */
        if (debug) updateDebugger()
    })

    return (
        <Suspense fallback={null} >
            <group ref={characterGroupRef} position={initPos} {...props} dispose={null}>
                {/* Character capsule collider */}
                <mesh ref={characterColliderRef} visible={debug}>
                    <capsuleGeometry args={colliderCapsuleArgs} />
                    <meshNormalMaterial wireframe />
                </mesh>
                {/* Character model */}
                <group name="EcctrlMini-Model" ref={characterModelRef}>
                    {children}
                </group>
            </group>

            {/* Debug helper */}
            {debug &&
                <group>
                    <TransformControls object={characterGroupRef} />
                    {/* <TransformControls mode="rotate" object={characterGroupRef} scale={2} /> */}
                    {/* Character bunding box debugger */}
                    <mesh ref={debugBbox}>
                        <boxGeometry />
                        <meshBasicMaterial color={"yellow"} wireframe />
                    </mesh>
                    {/* Character segment debugger */}
                    <mesh ref={debugLineStart}>
                        <octahedronGeometry args={[0.05, 0]} />
                        <meshNormalMaterial />
                    </mesh>
                    <mesh ref={debugLineEnd}>
                        <octahedronGeometry args={[0.05, 0]} />
                        <meshNormalMaterial />
                    </mesh>
                    {/* Float sensor bunding box debugger */}
                    <mesh ref={debugFloatBbox}>
                        <boxGeometry />
                        <meshBasicMaterial color={"yellow"} wireframe />
                    </mesh>
                    {/* Float sensor segment debugger */}
                    <mesh ref={debugFloatStart}>
                        <octahedronGeometry args={[0.05, 0]} />
                        <meshBasicMaterial color={"green"} wireframe />
                    </mesh>
                    <mesh ref={debugFloatEnd}>
                        <octahedronGeometry args={[0.05, 0]} />
                        <meshBasicMaterial color={"yellow"} wireframe />
                    </mesh>
                    {/* Collision contact point debugger */}
                    <mesh ref={contactPointRef} scale={[1, 2, 1]}>
                        <octahedronGeometry args={[0.1, 0]} />
                        <meshNormalMaterial />
                    </mesh>
                    {/* Character standing point debugger */}
                    <mesh ref={standPointRef} >
                        <octahedronGeometry args={[0.2, 0]} />
                        <meshBasicMaterial color={"red"} />
                    </mesh>
                </group>
            }
        </Suspense>
    );
})

export default React.memo(EcctrlMini);

export const characterStatus = {
    position: new THREE.Vector3(),
    linvel: new THREE.Vector3(),
    quaternion: new THREE.Quaternion(),
};