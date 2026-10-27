// Percentage against the parent, owned by the library: the core has no percent sizes and no calc(). A component that takes
// a percent reads its parent's layout box on the frame pump (measureBox: the overlay nodeRect, or the hit-test search on the
// stock core) and sets a px size from it. Until the first successful read the size is null, and the component keeps its
// panel invisible (opacity 0.01) rather than drawing at a guessed size. A later change of the parent is read every READ_EVERY frames.
import { type RefObject, useRef, useState } from "react";
import type { NodeMirror } from "../internal/pocket.ts";
import { measureBox } from "../primitives/anchor.ts";
import { useFrame } from "../renderer/use-frame.ts";

const READ_EVERY = 4;

/** pct of parentPx, rounded to whole pixels; pct is clamped to 0..100. */
export function percentOf(pct: number, parentPx: number): number {
  const clamped = Math.min(100, Math.max(0, pct));
  return Math.round((parentPx * clamped) / 100);
}

/**
 * The px extent of a node that is pct percent of its parent along one axis, or null until the parent has a box. Read on the
 * frame pump; the node is the element whose parent is measured (its own box is not used).
 */
export function useParentExtent(node: RefObject<NodeMirror | null>, axis: "w" | "h", pct: number): number | null {
  const [px, setPx] = useState<number | null>(null);
  const seen = useRef<{ extent: number; pct: number } | null>(null);
  useFrame((frame) => {
    if (px !== null && frame % READ_EVERY !== 0) return;
    const parent = node.current?.parent;
    const box = parent ? measureBox(parent) : null;
    if (!box) return;
    const extent = axis === "w" ? box.w : box.h;
    if (seen.current?.extent === extent && seen.current.pct === pct) return;
    seen.current = { extent, pct };
    setPx(percentOf(pct, extent));
  });
  return px;
}
