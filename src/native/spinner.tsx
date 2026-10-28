// Spinner: a loading ring, a 270-degree arc in three sizes: sm 16 px, md 24 px, lg 32 px. No focus, no press.
// DECISION: the arc turns on a core timeline, not a React frame pump. The spin-arc timeline (src/internal/animation-theme.ts)
// moves arcStart from 0 to 360 degrees in 1.5 s, linear and infinite; the core interpolates it on every tick, so the arc
// changes orientation every frame (60 a second at the realm's 60 Hz tick) and React writes nothing while it turns.
// The constraint: a class transition cannot move arcStart (it is not in the transition mask), but a timeline can (arcStart
// is a degree prop in the keyframe table). The arc is painted axis-aligned, so the turn is the arc start, not a node rotation.
import { View } from "../elements.ts";
import { useTokens } from "./theme.tsx";

export type SpinnerSize = "sm" | "md" | "lg";

export interface SpinnerProps {
  size?: SpinnerSize;
}

export function Spinner(props: SpinnerProps) {
  const T = useTokens() as Record<string, string>;
  return <View className={T["spinner." + (props.size ?? "md")]} />;
}
