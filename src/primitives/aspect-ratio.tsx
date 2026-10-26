// Native AspectRatio (batch A), shaped like Radix's AspectRatio namespace so the vendored shadcn aspect-ratio
// imports it unchanged. The core has no aspect-ratio and no percent padding, so the height is measured:
// the box is `PROBE` px tall while it measures, with no children mounted (nothing is drawn), reads its
// own width from the frame pump, and then mounts its children at width / ratio. A box must be at least
// `PROBE` px tall for the hit-test search that the stock core measures with (a zero-height box has no
// interior to hit). A later width change re-measures every READ_EVERY frames.

import { type ReactNode, useRef, useState } from "react";
import { View } from "../elements.ts";
import type { NodeMirror } from "../internal/pocket.ts";
import { useFrame } from "../renderer/use-frame.ts";
import { cn } from "../style/cn.ts";
import { measureBox } from "./anchor.ts";

/** Height of the box while it measures: tall enough for the hit-test search to find it. */
const PROBE = 4;
const READ_EVERY = 4;

export interface AspectRatioProps {
  ratio?: number;
  className?: string;
  children?: ReactNode;
}

export function Root(props: AspectRatioProps) {
  const ratio =
    props.ratio !== undefined && Number.isFinite(props.ratio) && props.ratio > 0
      ? props.ratio
      : 1;
  const outer = useRef<NodeMirror | null>(null);
  const seen = useRef<{ w: number; ratio: number } | null>(null);
  // null while measuring; then the settled height in px.
  const [settled, setSettled] = useState<number | null>(null);
  useFrame((frame) => {
    if (frame >= READ_EVERY && frame % READ_EVERY !== 0) return;
    const node = outer.current;
    const box = node ? measureBox(node) : null;
    if (!box) return;
    if (seen.current?.w === box.w && seen.current.ratio === ratio) return;
    seen.current = { w: box.w, ratio };
    setSettled(Math.round(box.w / ratio));
  });
  const height = Math.max(PROBE, settled ?? PROBE);
  return (
    <View ref={outer} className="relative w-full" style={{ height }}>
      {settled === null ? null : (
        <View className={cn("absolute inset-0", props.className)}>{props.children}</View>
      )}
    </View>
  );
}
