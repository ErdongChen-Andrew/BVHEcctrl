import * as THREE from "three";
import React, { useEffect, useRef, useMemo, useState, type ReactNode, forwardRef, type ForwardedRef, type RefObject, type JSX, Suspense, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Helper, PivotControls, TransformControls, useKeyboardControls } from "@react-three/drei";
import { useEcctrlStore } from "./stores/useEcctrlStore";
import { clamp, lerp } from "three/src/math/MathUtils";

/**
 * Physics formulas:
 * 1. F = m * a
 * 2. v = d / t (constant velocity)
 * 3. a = Δv / t
 * 4. d = v0t + 1/2 * a * t^2
 * 5. v = v0 + a * t
 * 6. J = F * Δt
 * 7. Δv = F * Δt / m
 * 8. E = 1/2 * m * v^2
 * 9. F_drag = -kv
 * 
 * Usefull formulas in ecctrl mini:
 * 1. pos += velocity * delta
 * 2. vel += acceleration * delta
 * 3. Fg = mass * gravity
 * 4. F(spring) = -k(x - x0)
 * 5. F(damping) = -c * v
 */

// const getAzimuthalAngle = (camera: THREE.Camera, upAxis: THREE.Vector3): number => {
//     const viewDir = new THREE.Vector3();
//     const projDir = new THREE.Vector3();
//     const refDir = new THREE.Vector3(); // reference direction on the plane

//     // Step 1: Calculate camera view direction
//     camera.getWorldDirection(viewDir); // points FROM camera TO target

//     // Step 2: Project view direction onto plane orthogonal to upAxis
//     projDir.copy(viewDir).projectOnPlane(upAxis).normalize();

//     // Step 3: Pick a reference direction on the plane (e.g., X axis projected onto the same plane)
//     refDir.set(0, 0, -1).projectOnPlane(upAxis).normalize();

//     // Step 4: Compute angle between refDir and projected viewDir
//     let angle = Math.acos(THREE.MathUtils.clamp(refDir.dot(projDir), -1, 1)); // in radians

//     // Step 5: Determine sign using cross product
//     const cross = new THREE.Vector3().crossVectors(refDir, projDir);
//     if (cross.dot(upAxis) < 0) {
//         angle = -angle;
//     }

//     return angle; // in radians
// }

export interface EcctrlProps extends Omit<React.ComponentProps<'group'>, 'ref'> {
    children?: ReactNode;
    debug?: boolean;
    colliderCapsuleArgs?: [radius: number, length: number, capSegments: number, radialSegments: number];
    enableGravity?: boolean;
    gravity?: number;
    mass?: number;
    maxWalkSpeed?: number;
    maxRunSpeed?: number;
    acceleration?: number;
    deceleration?: number;
    counterVelFactor?: number;
    airDragFactor?: number;
    jumpVel?: number;
    maxSlope?: number;
    floatHeight?: number;
    floatPullBackHeight?: number;
    floatSensorRadius?: number;
    floatSpringK?: number;
    floatDampingC?: number;
    collisionCheckIteration?: number;
    collisionPushBackStrength?: number;
    collisionPushBackVelocity?: number;
    collisionPushBackThreshold?: number;
    collisionStairThreshold?: number;
};

const EcctrlMini = forwardRef<THREE.Group, EcctrlProps>(({
    children,
    debug = true,
    // Character collider props
    colliderCapsuleArgs = [0.3, 0.6, 4, 8],
    // Physics props
    enableGravity = true,
    gravity = 9.81,
    mass = 1,
    // Controller props
    maxWalkSpeed = 3,
    maxRunSpeed = 5,
    acceleration = 26,
    deceleration = 10,
    counterVelFactor = 1.5,
    airDragFactor = 0.7,
    jumpVel = 5,
    maxSlope = 1,
    floatHeight = 0.2,
    floatPullBackHeight = 0.25,
    floatSensorRadius = 0.12,
    floatSpringK = 220,
    floatDampingC = 12,
    // Collision check props
    collisionCheckIteration = 3,
    collisionPushBackStrength = 200,
    collisionPushBackVelocity = 3,
    collisionPushBackThreshold = 0.05,
    collisionStairThreshold = 0.8,
    // Other props
    ...props
}, ref) => {
    /**
     * Initialize setups
     */
    const { camera } = useThree()
    const capsuleRadius = useMemo(() => colliderCapsuleArgs[0], [])
    const capsuleLength = useMemo(() => colliderCapsuleArgs[1], [])
    // Ref for meshes
    const characterGroupRef = (ref as RefObject<THREE.Group>) ?? useRef<THREE.Group | null>(null);
    const characterColliderRef = useRef<THREE.Mesh | null>(null);
    const characterModelRef = useRef<THREE.Group | null>(null);
    // Debug indicators meshes
    const debugBbox = useRef<THREE.Mesh | null>(null)
    const debugLineStart = useRef<THREE.Mesh | null>(null)
    const debugLineEnd = useRef<THREE.Mesh | null>(null)
    const debugRaySensorBbox = useRef<THREE.Mesh | null>(null)
    const debugRaySensorStart = useRef<THREE.Mesh | null>(null)
    const debugRaySensorEnd = useRef<THREE.Mesh | null>(null)
    const contactPointRef = useRef<THREE.Mesh | null>(null)
    const standPointRef = useRef<THREE.Mesh | null>(null)
    const moveDirRef = useRef<THREE.Mesh | null>(null)

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
    // if (isInsideKeyboardControls && subscribeKeys) {
    //     useEffect(() => {
    //         // Jump key subscribe for special animation
    //         const unSubscribeJump = subscribeKeys(
    //             (state) => state.jump,
    //             (value) => {
    //                 if (value && isOnGround.current) currentLinVel.current.y = jumpVel
    //             }
    //         );

    //         return () => {
    //             unSubscribeJump();
    //         };
    //     });
    // }

    /**
     * Physics preset
     */
    const upAxis = useMemo(() => new THREE.Vector3(0, 1, 0), [])
    const gravityDir = useMemo(() => new THREE.Vector3(0, -1, 0), [])
    const currentLinVel = useRef<THREE.Vector3>(new THREE.Vector3())

    /**
     * Follow camera prest
     */
    const camViewDir = useRef<THREE.Vector3>(new THREE.Vector3())
    const camProjDir = useRef<THREE.Vector3>(new THREE.Vector3())
    const camRefDir = useRef<THREE.Vector3>(new THREE.Vector3())
    const crossVec = useRef<THREE.Vector3>(new THREE.Vector3())
    const constRefDir = useMemo<THREE.Vector3>(() => {
        camera.updateMatrixWorld(true);
        return camera.getWorldDirection(new THREE.Vector3())
    }, [])

    /**
     * Controls preset
     */
    const inputDir = useRef<THREE.Vector3>(new THREE.Vector3())
    const deltaLinVel = useRef<THREE.Vector3>(new THREE.Vector3())
    const counterVel = useRef<THREE.Vector3>(new THREE.Vector3())
    const wantToMoveVel = useRef<THREE.Vector3>(new THREE.Vector3())
    const isOnGround = useRef<boolean>(false)
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
    const absorbVel = useRef<THREE.Vector3>(new THREE.Vector3())
    // const pushBackAcc = useRef<THREE.Vector3>(new THREE.Vector3())
    const pushBackVel = useRef<THREE.Vector3>(new THREE.Vector3())
    // Mutable character collision objects
    const characterBbox = useRef<THREE.Box3>(new THREE.Box3())
    const characterBboxSize = useRef<THREE.Vector3>(new THREE.Vector3())
    const characterBboxCenter = useRef<THREE.Vector3>(new THREE.Vector3())
    const characterSegment = useRef<THREE.Line3>(new THREE.Line3())

    /**
     * Floating sensor preset
     */
    const currSlopeAngle = useRef<number>(0)
    const isOverMaxSlope = useRef<boolean>(false)
    const isOverSteepSlope = useRef<boolean>(false)
    const localMinDistance = useRef<number>(Infinity)
    const localClosestPoint = useRef<THREE.Vector3>(new THREE.Vector3())
    const localHitNormal = useRef<THREE.Vector3>(new THREE.Vector3())
    const globalMinDistance = useRef<number>(Infinity)
    const globalClosestPoint = useRef<THREE.Vector3>(new THREE.Vector3())
    const triHitPoint = useRef<THREE.Vector3>(new THREE.Vector3())
    const segHitPoint = useRef<THREE.Vector3>(new THREE.Vector3())
    const floatHitVec = useRef<THREE.Vector3>(new THREE.Vector3())
    const floatHitNormal = useRef<THREE.Vector3>(new THREE.Vector3())
    const floatHitMesh = useRef<THREE.Mesh | null>(null)
    const groundFriction = useRef<number>(0.8)
    const closestPointHorizontalDis = useRef<THREE.Vector3>(new THREE.Vector3())
    const closestPointVerticalDis = useRef<THREE.Vector3>(new THREE.Vector3())
    const steepSlopeThreshold = useMemo(() => Math.atan((capsuleRadius + floatHeight + floatPullBackHeight + floatSensorRadius) / (capsuleRadius - floatSensorRadius)), [])
    // Mutable float sensor objects
    const floatSensorBbox = useRef(new THREE.Box3())
    const floatSensorBboxSize = useRef<THREE.Vector3>(new THREE.Vector3())
    const floatSensorBboxCenter = useRef<THREE.Vector3>(new THREE.Vector3())
    const floatSensorBboxExpendPoint = useRef<THREE.Vector3>(new THREE.Vector3())
    const floatSensorSegment = useRef(new THREE.Line3())
    // const floatRaycaster = useRef<THREE.Raycaster>(new THREE.Raycaster())
    // floatRaycaster.current.far = floatHeight + floatForgiveness

    /**
     * Gravity funtion
     */
    const applyGravity = useCallback((delta: number) => {
        currentLinVel.current.addScaledVector(gravityDir, gravity * delta)
    }, [])

    /**
     * Get camera azimuthal angle funtion
     */
    const getAzimuthalAngle = useCallback((camera: THREE.Camera, upAxis: THREE.Vector3): number => {
        camera.getWorldDirection(camViewDir.current);
        camProjDir.current.copy(camViewDir.current).projectOnPlane(upAxis).normalize();
        camRefDir.current.copy(constRefDir).projectOnPlane(upAxis).normalize();
        let angle = Math.acos(clamp(camRefDir.current.dot(camProjDir.current), -1, 1));
        crossVec.current.crossVectors(camRefDir.current, camProjDir.current);
        if (crossVec.current.dot(upAxis) < 0) angle = -angle;
        return angle;
    }, [])

    /**
     * Get moving direction function
     * Getting Character moving direction from user inputs
     */
    const getMovingDirection = useCallback((
        forward: boolean,
        backward: boolean,
        leftward: boolean,
        rightward: boolean,
        upAxis: THREE.Vector3,
        camAngle: number)
        : THREE.Vector3 => {
        inputDir.current.set(0, 0, 0)
        if (forward) inputDir.current.z = -1
        if (backward) inputDir.current.z = 1
        if (leftward) inputDir.current.x = -1
        if (rightward) inputDir.current.x = 1

        // Rotate inputDir according to camera azimuthal angle
        inputDir.current.applyAxisAngle(upAxis, camAngle);

        // Apply slope up/down angle to inputDir if slope is less then max angle
        if (!isOverMaxSlope.current) inputDir.current.projectOnPlane(floatHitNormal.current)

        return inputDir.current.normalize()
    }, [])

    /**
     * Handle character movement function
     */
    const handleCharacterMovement = useCallback((direction: THREE.Vector3, runState: boolean, delta: number) => {
        // Get and clamp groundFriction to a reasonable number
        const friction = Math.max(0.05, Math.min(groundFriction.current, 1));

        // Check if there is a user input to move character
        if (direction.lengthSq() > 0) {
            // Find character desired target velocity and direction
            wantToMoveVel.current.copy(direction).multiplyScalar(runState ? maxRunSpeed : maxWalkSpeed)

            // If currently moving in oppsite direction then wantToMoveVel
            // Consider adding counter velocity to wantToMoveVel to improve control feels
            const dot = characterStatus.movingDir.dot(direction)
            if (dot < -0.5) {
                counterVel.current.copy(currentLinVel.current).multiplyScalar(dot * counterVelFactor * friction).projectOnPlane(floatHitNormal.current)
                counterVel.current.clampLength(0, maxRunSpeed * counterVelFactor) // prevent overshoot
                wantToMoveVel.current.add(counterVel.current)
            }

            // According to this formula: Δv = a * Δt
            // Find Δv which increase currentLinVel in every frame, until reach wantToMoveVel
            deltaLinVel.current.subVectors(wantToMoveVel.current, currentLinVel.current)
            deltaLinVel.current.clampLength(0, acceleration * friction * delta * (isOnGround.current ? 1 : airDragFactor))

            // Add Δv to currentLinVel
            isOnGround.current ? currentLinVel.current.add(deltaLinVel.current) : currentLinVel.current.add(deltaLinVel.current.projectOnPlane(upAxis))
        } else if (isOnGround.current) {
            // If no user inputs & is on ground, apply friction drag to currentLinVel
            currentLinVel.current.multiplyScalar(1 - deceleration * friction * delta);
        }
    }, [])

    /**
     * Update character and float senenor segment/bbox function
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
        floatSensorSegment.current.end.copy(floatSensorSegment.current.start).addScaledVector(gravityDir, floatHeight + capsuleRadius)
        floatSensorBboxExpendPoint.current.copy(floatSensorSegment.current.end).addScaledVector(gravityDir, floatPullBackHeight)

        // Update float sensor bounding box
        floatSensorBbox.current
            .makeEmpty()
            .expandByPoint(floatSensorSegment.current.start)
            .expandByPoint(floatSensorBboxExpendPoint.current)
            .expandByScalar(floatSensorRadius)
    }, [])

    /**
     * Handle character collision response function
     */
    const handleCollisionResponse = useCallback((staticMeshesArray: THREE.Mesh[], delta: number) => {
        /**
         * Collision Check
         * Check if character segment range is collider with map bvh
         * If so, getting contact point depth and direction, then apply to character velocity
         */
        // Check collisions multiple times for better precision 
        for (let i = 0; i < collisionCheckIteration; i++) {
            for (const mesh of staticMeshesArray) {
                // Early exit if map geometry boundsTree is not ready
                const boundsTree = mesh.geometry.boundsTree
                if (!boundsTree) return;

                // Reset contact point info
                contactDepth.current = 0
                contactNormal.current.set(0, 0, 0)
                triContactPoint.current.set(0, 0, 0)
                capsuleContactPoint.current.set(0, 0, 0)

                // Bounds tree conllision check, finding contact normal and depth
                boundsTree.shapecast({
                    // If not intersects with character bbox, just stop entire shapecast
                    intersectsBounds: box => box.intersectsBox(characterBbox.current),
                    // If intersects with character bbox, deeply check collision with character segment
                    intersectsTriangle: tri => {
                        // Find distance to character segment
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
                                absorbVel.current.copy(contactNormal.current).multiplyScalar(-dot * (1 + mesh.userData.restitution))
                                currentLinVel.current.add(absorbVel.current);
                            }

                            /**
                             * If character still collide with something after velocity absorb
                             * Apply push-back force based on contact depth
                             */
                            // if (contactDepth.current > collisionPushBackThreshold) {
                            // pushBackAcc.current.copy(contactNormal.current).multiplyScalar(collisionPushBackStrength * contactDepth.current);
                            // currentLinVel.current.addScaledVector(pushBackAcc.current, delta);
                            // }
                            if (contactDepth.current > collisionPushBackThreshold) {
                                pushBackVel.current.copy(contactNormal.current).multiplyScalar(collisionPushBackVelocity * contactDepth.current);
                                currentLinVel.current.add(pushBackVel.current);
                            }
                        }
                    }
                });
            }
        }
    }, [])

    /**
     * Handle character floating response function
     * Also check if character is on ground
     */
    const handleFloatingResponse = useCallback((staticMeshesArray: THREE.Mesh[], jump: boolean, delta: number) => {
        /**
         * Floating sensor check if character is on ground
         */
        // Reset float sensor hit global info
        globalMinDistance.current = Infinity;
        globalClosestPoint.current.set(0, 0, 0);
        for (const mesh of staticMeshesArray) {
            // Early exit if map geometry boundsTree is not ready
            if (!mesh.geometry.boundsTree) return;

            // Reset float sensor hit point info
            currSlopeAngle.current = 0;
            localMinDistance.current = Infinity;
            localClosestPoint.current.set(0, 0, 0);
            triHitPoint.current.set(0, 0, 0)
            segHitPoint.current.set(0, 0, 0)
            floatHitVec.current.set(0, 0, 0)
            localHitNormal.current.set(0, 0, 0)

            // Check if floating ray hits any map faces, 
            // and find the closest point to sensor start point
            const startPoint = floatSensorSegment.current.start
            mesh.geometry.boundsTree.shapecast({
                // If not intersects with float sensor bbox, just stop entire shapecast                
                intersectsBounds: box => box.intersectsBox(floatSensorBbox.current),
                // If intersects with float sensor bbox, deeply check collision with float sensor segment
                intersectsTriangle: tri => {
                    tri.closestPointToSegment(floatSensorSegment.current, triHitPoint.current, segHitPoint.current);
                    const horizontalDistance = closestPointHorizontalDis.current.subVectors(startPoint, triHitPoint.current).projectOnPlane(upAxis).lengthSq()
                    const verticalDistance = closestPointVerticalDis.current.subVectors(startPoint, triHitPoint.current).projectOnVector(upAxis).lengthSq()

                    // Only accept triangle hit if inside sensor range
                    if (horizontalDistance < floatSensorRadius * floatSensorRadius && verticalDistance < (capsuleRadius + floatHeight + floatPullBackHeight) ** 2) {
                        if (verticalDistance < localMinDistance.current) {
                            localMinDistance.current = verticalDistance;
                            localClosestPoint.current.copy(triHitPoint.current);
                            tri.getNormal(localHitNormal.current);
                        }
                    }
                }
            })

            /**
             * bvh.shapecast might hit multiple faces, 
             * and only the closest one return a valid number, 
             * other faces would return infinity.
             * Store only the closest point to globalMinDistance/globalClosestPoint
             */
            if (localMinDistance.current < globalMinDistance.current) {
                globalMinDistance.current = localMinDistance.current;
                globalClosestPoint.current.copy(localClosestPoint.current);
                floatHitNormal.current.copy(localHitNormal.current);
                currSlopeAngle.current = floatHitNormal.current.angleTo(upAxis)
                isOverMaxSlope.current = currSlopeAngle.current > maxSlope
                isOverSteepSlope.current = currSlopeAngle.current > steepSlopeThreshold
                floatHitMesh.current = mesh
                groundFriction.current = mesh.userData.friction
            }

            // If globalMinDistance.current is valid, sensor hits something. 
            // Apply proper floating force to float character
            if (globalMinDistance.current < Infinity) {
                // Calculate spring force
                floatHitVec.current.subVectors(startPoint, globalClosestPoint.current)
                const springForce = floatSpringK * (floatHeight + capsuleRadius - floatHitVec.current.dot(upAxis));
                // Calculate damping force
                const dampingForce = floatDampingC * currentLinVel.current.dot(upAxis);
                // Total float force
                const floatForce = springForce - dampingForce;
                // Apply force to character's velocity (force * dt / mass)
                if (!jump) currentLinVel.current.addScaledVector(upAxis, floatForce * delta / mass)

                // Character is on ground if not on a steep slope
                // Spacial case: if the slope is too steep (stair verticle faces), treat it as on ground (for now)                
                if (!isOverMaxSlope.current || isOverSteepSlope.current) {
                    isOnGround.current = true
                } else {
                    isOnGround.current = false
                }
            } else {
                isOnGround.current = false
            }
        }
    }, [])

    /**
     * Update character status for exporting
     */
    const updateCharacterStatus = useCallback(() => {
        characterGroupRef.current.getWorldPosition(characterStatus.position)
        characterGroupRef.current.getWorldQuaternion(characterStatus.quaternion)
        characterStatus.linvel.copy(currentLinVel.current)
        characterStatus.movingDir.copy(currentLinVel.current).normalize()
        characterStatus.isOnGround = isOnGround.current
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

        // Apply the updated values to contact indicator
        contactPointRef.current?.position.copy(triContactPoint.current)
        contactPointRef.current?.lookAt(contactNormal.current)

        // Get floating ray sensor bbox size and center
        floatSensorBbox.current.getSize(floatSensorBboxSize.current);
        floatSensorBbox.current.getCenter(floatSensorBboxCenter.current);

        // Apply the updated values to the floating ray sensor bbox mesh
        debugRaySensorBbox.current?.position.copy(floatSensorBboxCenter.current);
        debugRaySensorBbox.current?.scale.set(floatSensorBboxSize.current.x, floatSensorBboxSize.current.y, floatSensorBboxSize.current.z);

        //  Apply the updated values to floating sensor segment start/end
        debugRaySensorStart.current?.position.copy(floatSensorSegment.current.start)
        debugRaySensorEnd.current?.position.copy(floatSensorSegment.current.end)

        // Update stand point to follow globalClosestPoint
        standPointRef.current?.position.copy(globalClosestPoint.current);

        // Update moving direction indicator to follow character pos and moving dir
        moveDirRef.current?.position.copy(characterGroupRef.current.position)
        moveDirRef.current?.lookAt(moveDirRef.current?.position.clone().add(inputDir.current))
    }, [])

    useFrame((state, delta) => {
        /**
         * Global store values
         * Getting static collider props array from store
         */
        const staticMeshesArray = useEcctrlStore.getState().staticMeshesArray;

        /**
         * Get camera azimuthal angle
         */
        const camAngle = getAzimuthalAngle(state.camera, upAxis);

        /**
         * Getting all the useful keys from useKeyboardControls
         */
        const { forward, backward, leftward, rightward, jump, run } = isInsideKeyboardControls && getKeys ? getKeys() : presetKeys;

        /**
         * Handle character movement input
         */
        const movingDirection = getMovingDirection(forward, backward, leftward, rightward, upAxis, camAngle)
        // Apply user input to character moving velocity
        handleCharacterMovement(movingDirection, run, delta)
        // Character jump input
        if (jump && isOnGround.current) currentLinVel.current.y = jumpVel

        /**
         * Apply custom gravity to character current velocity
         */
        if (enableGravity && !isOnGround.current) applyGravity(delta)

        /**
         * Update collider segement/bbox to new position for collision check
         */
        if (currentLinVel.current.lengthSq() > 0) updateSegmentBBox()

        /**
         * Handle character collision response
         * Apply contact normal and contact depth to character current velocity
         */
        if (currentLinVel.current.lengthSq() > 0 && staticMeshesArray.length !== 0) handleCollisionResponse(staticMeshesArray, delta)

        /**
         * Handle character floating response
         */
        if (currentLinVel.current.lengthSq() > 0 && staticMeshesArray.length !== 0) handleFloatingResponse(staticMeshesArray, jump, delta)

        /**
         * Limit minimum velocity (sleep)
         */
        if (currentLinVel.current.lengthSq() < 1e-4) currentLinVel.current.set(0, 0, 0)

        /**
         * Apply sum up velocity to move character position
         */
        characterGroupRef.current.position.addScaledVector(currentLinVel.current, delta)

        /**
         * Update character status for exporting
         */
        updateCharacterStatus()

        /**
         * Update debug indicators
         */
        if (debug) updateDebugger()
    })

    return (
        <Suspense fallback={null} >
            <group ref={characterGroupRef} {...props} dispose={null}>
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
                    {/* Float ray sensor bunding box debugger */}
                    <mesh ref={debugRaySensorBbox}>
                        <boxGeometry />
                        <meshBasicMaterial color={"yellow"} wireframe />
                    </mesh>
                    {/* Float ray sensor segment debugger */}
                    <mesh ref={debugRaySensorStart}>
                        <octahedronGeometry args={[0.1, 0]} />
                        <meshBasicMaterial color={"yellow"} wireframe />
                    </mesh>
                    <mesh ref={debugRaySensorEnd}>
                        <octahedronGeometry args={[0.1, 0]} />
                        <meshBasicMaterial color={"yellow"} wireframe />
                    </mesh>
                    {/* Collision contact point debugger */}
                    <mesh ref={contactPointRef} scale={[1, 2, 1]}>
                        <octahedronGeometry args={[0.1, 0]} />
                        <meshNormalMaterial />
                    </mesh>
                    {/* Character standing point debugger */}
                    <mesh ref={standPointRef} >
                        <octahedronGeometry args={[0.1, 0]} />
                        <meshBasicMaterial color={"red"} />
                    </mesh>
                    {/* Character input moving direction debugger */}
                    <mesh ref={moveDirRef} scale={[1, 1, 5]}>
                        <octahedronGeometry args={[0.1, 0]} />
                        <meshNormalMaterial />
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
    movingDir: new THREE.Vector3(),
    isOnGround: false,
};