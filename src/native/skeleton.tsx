// Skeleton: a placeholder block that pulses. The pulse is animate-pulse: the core interpolates the opacity itself, so
// JS writes nothing per frame. DECISION: pulsing, not static (the shadcn default). Its judge is static (no input).
// Three shapes: line (full width, 16 px), short (120 px), circle (40 px, rounded-[20px]).
import { View } from "../elements.ts";
import { useTokens } from "./theme.tsx";

export type SkeletonShape = "line" | "short" | "circle";

export interface SkeletonProps {
  shape?: SkeletonShape;
}

export function Skeleton(props: SkeletonProps) {
  const T = useTokens() as Record<string, string>;
  return <View className={T["skeleton." + (props.shape ?? "line")]} />;
}
