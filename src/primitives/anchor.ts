// C6 anchor measurement. The core has no node-rect query, so a node's border box is recovered from
// the layout bounds hit test (op 42, hitTestBounds): a point inside the node seeds a binary search
// per edge. Hit ids are native node ids, so 'inside the node' is a walk of its subtree.
import { getOps, hostViewport } from "@pocketjs/framework/host";
import { getFocused } from "@pocketjs/framework/input";
import type { NodeMirror } from "../internal/pocket.ts";

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Grid step for finding a seed point when the caller has none. */
const GRID = 4;

function containsId(node: NodeMirror, id: number): boolean {
  if (node.id === id) return true;
  for (const child of node.children) if (containsId(child, id)) return true;
  return false;
}

/** True when the topmost layout-bounds hit at (x, y) is the node or one of its descendants. */
function hitsWithin(node: NodeMirror, x: number, y: number): boolean {
  const ops = getOps();
  const query = ops.hitTestBounds ?? ops.hitTest;
  if (!query) return false;
  const id = query(x, y);
  return id !== 0 && containsId(node, id);
}

/**
 * The border box of a node in screen pixels, or null when it is not visible in the viewport. An
 * overflow clip or a higher sibling trims it: the result is the part a tap can reach. Coordinates
 * are whole pixels (the hit test is integer-addressed).
 */
export function measureBox(node: NodeMirror): Box | null {
  const vp = hostViewport(getOps());
  if (!vp || vp.w <= 0 || vp.h <= 0) return null;
  const inside = (x: number, y: number): boolean =>
    x >= 0 && y >= 0 && x < vp.w && y < vp.h && hitsWithin(node, x, y);

  let sx = -1;
  let sy = -1;
  for (let y = 0; y < vp.h && sy < 0; y += GRID) {
    for (let x = 0; x < vp.w; x += GRID) {
      if (inside(x, y)) {
        sx = x;
        sy = y;
        break;
      }
    }
  }
  if (sx < 0) return null;

  // Smallest inside coordinate in (outside, inside]; the probe is true at `inside`, false at `outside`.
  const first = (
    outside: number,
    inside_: number,
    probe: (v: number) => boolean,
  ): number => {
    let lo = outside;
    let hi = inside_;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (probe(mid)) hi = mid;
      else lo = mid;
    }
    return hi;
  };
  // First outside coordinate after `inside` (exclusive end of the run); `limit` is outside.
  const past = (
    inside_: number,
    limit: number,
    probe: (v: number) => boolean,
  ): number => {
    let lo = inside_;
    let hi = limit;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (probe(mid)) lo = mid;
      else hi = mid;
    }
    return hi;
  };

  const left = first(-1, sx, (v) => inside(v, sy));
  const right = past(sx, vp.w, (v) => inside(v, sy));
  const top = first(-1, sy, (v) => inside(sx, v));
  const bottom = past(sy, vp.h, (v) => inside(sx, v));
  return { x: left, y: top, w: right - left, h: bottom - top };
}

export type Side = "top" | "right" | "bottom" | "left";
export type Align = "start" | "center" | "end";

export interface PlaceInput {
  anchor: Box;
  panel: { w: number; h: number };
  viewport: { w: number; h: number };
  side?: Side;
  align?: Align;
  sideOffset?: number;
  collisionPadding?: number;
}

export interface Placement {
  x: number;
  y: number;
  side: Side;
}

const OPPOSITE: Record<Side, Side> = {
  top: "bottom",
  bottom: "top",
  left: "right",
  right: "left",
};

/**
 * Where a panel goes next to its anchor. The requested side is kept unless it has no room and the
 * opposite side has more; the panel then aligns on the cross axis and is clamped inside the viewport
 * (inset by collisionPadding). Pure geometry: no core access.
 */
export function placePopper(input: PlaceInput): Placement {
  const { anchor, panel, viewport } = input;
  const requested = input.side ?? "bottom";
  const align = input.align ?? "start";
  const offset = input.sideOffset ?? 0;
  const pad = input.collisionPadding ?? 0;

  const room = (side: Side): number => {
    switch (side) {
      case "bottom":
        return viewport.h - (anchor.y + anchor.h) - offset - pad;
      case "top":
        return anchor.y - offset - pad;
      case "right":
        return viewport.w - (anchor.x + anchor.w) - offset - pad;
      case "left":
        return anchor.x - offset - pad;
    }
  };
  const need = (side: Side): number =>
    side === "top" || side === "bottom" ? panel.h : panel.w;
  const fits = (side: Side): boolean => room(side) >= need(side);
  const side =
    !fits(requested) && fits(OPPOSITE[requested])
      ? OPPOSITE[requested]
      : requested;

  // Cross-axis start for the chosen alignment.
  const cross = (
    anchorStart: number,
    anchorSize: number,
    panelSize: number,
  ): number => {
    if (align === "center") return anchorStart + anchorSize / 2 - panelSize / 2;
    if (align === "end") return anchorStart + anchorSize - panelSize;
    return anchorStart;
  };
  let x: number;
  let y: number;
  if (side === "bottom") {
    y = anchor.y + anchor.h + offset;
    x = cross(anchor.x, anchor.w, panel.w);
  } else if (side === "top") {
    y = anchor.y - offset - panel.h;
    x = cross(anchor.x, anchor.w, panel.w);
  } else if (side === "right") {
    x = anchor.x + anchor.w + offset;
    y = cross(anchor.y, anchor.h, panel.h);
  } else {
    x = anchor.x - offset - panel.w;
    y = cross(anchor.y, anchor.h, panel.h);
  }

  const clamp = (v: number, size: number, limit: number): number =>
    Math.max(pad, Math.min(v, limit - size - pad));
  return {
    x: Math.round(clamp(x, panel.w, viewport.w)),
    y: Math.round(clamp(y, panel.h, viewport.h)),
    side,
  };
}
/** The border box of the focused node (the trigger a press just landed on), or null. */
export function measureFocused(): Box | null {
  const node = getFocused() as NodeMirror | null;
  return node ? measureBox(node) : null;
}
