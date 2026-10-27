// Spinner: a loading ring, a 270-degree arc in three sizes: sm 16 px, md 24 px, lg 32 px.
// DECISION: rotate the arc geometry in steps, not a static ring. The core cannot animate arcStart (it is timeline-only, not in
// the transition mask), and a rotating node paints its arc as a filled box, so the rotation is a closed set of eight arc-start
// tokens (0 to 315 degrees, 45 apart). A frame pump advances one step every SPINNER_STEP_FRAMES frames: 12 steps a second,
// one revolution every 8 steps (about 0.67 s). Each step is a class change React writes; the core only draws the new arc.
// States: sm, md, lg, each at steps 0 to 7. No focus, no press.
import { useLayoutEffect, useState } from "react";
import { View } from "../elements.ts";
import { addFramePump } from "../renderer/mount.ts";
import { useTokens } from "./theme.tsx";

export type SpinnerSize = "sm" | "md" | "lg";

/** Arc-start steps in one revolution, and the frames each step holds. */
export const SPINNER_STEPS = 8;
export const SPINNER_STEP_FRAMES = 5;

export interface SpinnerProps {
  size?: SpinnerSize;
}

export function Spinner(props: SpinnerProps) {
  const T = useTokens() as Record<string, string>;
  const size = props.size ?? "md";
  const [step, setStep] = useState(0);
  useLayoutEffect(() => {
    let frames = 0;
    return addFramePump(() => {
      frames++;
      if (frames % SPINNER_STEP_FRAMES === 0) setStep((s) => (s + 1) % SPINNER_STEPS);
    });
  }, []);
  return <View className={T["spinner." + size + "." + step]} />;
}
