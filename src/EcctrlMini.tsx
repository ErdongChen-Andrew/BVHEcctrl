import * as THREE from "three";
import React, { useEffect, useRef, useMemo, useState, type ReactNode, forwardRef, type ForwardedRef, type RefObject, type JSX } from "react";

export interface EcctrlProps extends Omit<React.ComponentProps<'group'>, 'ref'> {
    children?: ReactNode;
};

const EcctrlMini = (
    { children, ...props }: EcctrlProps,
    characterRef: ForwardedRef<THREE.Group>
) => {
    return (
        <group ref={characterRef} {...props}>
            {children}
        </group>
    );
};

export default React.memo(forwardRef(EcctrlMini));