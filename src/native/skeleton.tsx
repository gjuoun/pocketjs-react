// Skeleton: a static placeholder block. DECISION: static, not pulsing. An animation literal in any source file
// (animate-pulse here) breaks the core's runtime-interned classes on the compat route: 11 tests in class-runtime,
// shadcn-compat, shadcn-vendor, host-book and list-dialog fail with it, and all 23 pass without it (2026-10-27).
// Three shapes: line (full width, 16 px), short (120 px), circle (40 px, rounded-[20px]). No state, no focus.
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
