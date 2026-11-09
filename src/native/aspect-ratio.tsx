// AspectRatio: a box whose height is its width divided by the ratio (16/9, 1, 4/3). The width comes from the parent
// through the percent seam (useParentExtent at 100 percent: the core has no aspect-ratio and no calc), and the height is
// set from it, so one React write sizes the box and the pixels follow. Children are clipped to the box (overflow-hidden),
// so an oversized child never draws past the ratio. Until the parent has a box the frame is transparent (opacity 0.01).
import type { ReactNode } from "react";
import { useRef } from "react";
import { View } from "../elements.ts";
import type { NodeMirror } from "../internal/pocket.ts";
import { useParentExtent } from "./percent.ts";
import { useTokens } from "./theme.tsx";

export interface AspectRatioProps {
  /** width / height; a value of 0 or less is treated as 1 (a square). */
  ratio: number;
  children?: ReactNode;
}

/** The height for a width and a ratio, in whole pixels. */
export function heightFor(width: number, ratio: number): number {
  const r = ratio > 0 ? ratio : 1;
  return Math.round(width / r);
}

export function AspectRatio(props: AspectRatioProps) {
  const T = useTokens() as Record<string, string>;
  const box = useRef<NodeMirror | null>(null);
  const width = useParentExtent(box, "w", 100);
  // One px tall until the parent is measured: the percent seam finds the parent through the layout hit test, and a
  // zero-height box paints nothing to find (the frame stays near-transparent until the first read lands).
  const style = width === null ? { height: 1, opacity: 0.01 } : { width, height: heightFor(width, props.ratio) };
  return (
    <View ref={box} className={T["aspect.box"]} style={style} debugName="aspect-ratio">
      {props.children}
    </View>
  );
}
