// Skeleton: a placeholder block that pulses. The pulse is the core's own opacity transition: each shape has a hi token
// (opacity 100) and a lo token (opacity 40), both with transition-opacity duration-500 (about 30 frames). A frame pump flips
// the phase every PULSE_FRAMES frames, so the core interpolates the fade and React writes only at the two phase changes.
// The animate-* utilities are not used: an animation literal in the source breaks the runtime classes on the compat route.
// Three shapes: line (full width, 16 px), short (120 px), circle (40 px, rounded-[20px]). No focus, no press.
import { useLayoutEffect, useState } from "react";
import { View } from "../elements.ts";
import { addFramePump } from "../renderer/mount.ts";
import { useTokens } from "./theme.tsx";

export type SkeletonShape = "line" | "short" | "circle";

/** Frames per phase: one half-cycle, equal to the transition length. */
export const PULSE_FRAMES = 30;

export interface SkeletonProps {
  shape?: SkeletonShape;
}

export function Skeleton(props: SkeletonProps) {
  const T = useTokens() as Record<string, string>;
  const shape = props.shape ?? "line";
  const [lo, setLo] = useState(false);
  useLayoutEffect(() => {
    let frames = 0;
    return addFramePump(() => {
      frames++;
      if (frames % PULSE_FRAMES === 0) setLo((v) => !v);
    });
  }, []);
  return <View className={T["skeleton." + shape + (lo ? ".lo" : ".hi")]} />;
}
