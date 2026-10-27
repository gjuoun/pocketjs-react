// Spinner: a loading ring, a 270-degree arc (arc-start 0, arc-sweep 270) in three sizes: sm 16 px, md 24 px, lg 32 px.
// DECISION: static. The core paints an arc only in axis-aligned worlds, so a rotating node (animate-spin) paints the
// arc as a filled box (probe, 2026-10-27). A spinner that spins needs an arc-start animation the core does not have.
// States: sm, md, lg. No focus, no press.
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
