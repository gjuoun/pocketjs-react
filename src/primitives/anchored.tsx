// Anchored placement shared by every floating panel (C6 and batch 2). A panel that has an anchor
// mounts hidden at the corner (opacity 0.01) so the core lays it out; a frame pump then measures it and
// places it beside the anchor (placePopper). Without an anchor the panel keeps its own flow.
import { getOps, hostViewport } from "@pocketjs/framework/host";
import { type MutableRefObject, useEffect, useState } from "react";
import type { PocketCSSProperties } from "../elements.ts";
import type { NodeMirror } from "../internal/pocket.ts";
import { addFramePump } from "../renderer/mount.ts";
import { type Align, type Box, measureBox, type Placement, placePopper, type Side } from "./anchor.ts";

/** Where a panel goes: the anchor box (null: no placement) and the placement options. */
export interface Anchoring {
  anchor: Box | null;
  side?: Side;
  align?: Align;
  sideOffset?: number;
  alignOffset?: number;
  collisionPadding?: number;
}

/**
 * The absolute style that puts a panel beside its anchor. Null when there is no anchor. Hidden at the
 * corner until the first measured frame, then at its placed spot (never drawn at the corner).
 */
export function usePlacedStyle(
  node: MutableRefObject<NodeMirror | null>,
  anchoring: Anchoring | undefined,
): PocketCSSProperties | undefined {
  const [placed, setPlaced] = useState<Placement | null>(null);
  const anchor = anchoring?.anchor ?? null;
  const side = anchoring?.side;
  const align = anchoring?.align;
  const sideOffset = anchoring?.sideOffset;
  const alignOffset = anchoring?.alignOffset;
  const collisionPadding = anchoring?.collisionPadding;

  useEffect(() => {
    if (!anchor || placed) return;
    return addFramePump(() => {
      const current = node.current;
      const box = current ? measureBox(current) : null;
      const viewport = hostViewport(getOps());
      if (!box || !viewport) return; // not laid out yet: try the next frame
      setPlaced(
        placePopper({
          anchor,
          panel: { w: box.w, h: box.h },
          viewport,
          side,
          align,
          sideOffset,
          alignOffset,
          collisionPadding,
        }),
      );
    });
  }, [anchor, placed, side, align, sideOffset, alignOffset, collisionPadding, node]);

  if (anchor === null) return undefined;
  return placed
    ? { position: "absolute", left: placed.x, top: placed.y }
    : { position: "absolute", left: 0, top: 0, opacity: 0.01 };
}
