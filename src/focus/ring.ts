// Focus ring (compat only). One ring per mount, drawn just outside the box of the focused DOM-mapped
// focusable, so the ring the default focus used to draw as a layout border takes no part in layout and
// focusing never moves the control. Two shapes, both root children added after the overlay layer (they
// paint above every app and popup layer) and both hit-transparent (hitPass), so a click on the band
// still reaches the control or row underneath:
//
//   - the rounded ring: one bordered node, border-box = the box grown by the ring width, corner radius
//     = the target's radius + the ring width (when the target has a corner). The core draws a bordered
//     rounded box as an outer rounded rect and an inner one of radius (outer - width), so the band
//     follows the target's corner arc exactly. A square target (radius 0) gets a square ring.
//   - the edge bars: four bars (top, bottom, left, right) cut to the clip of the overflow-hidden
//     ancestors. Used only when the ring would leave a clipping box, so a ring at a clip edge is cut
//     where CSS cuts it. A cut corner is square (no arc is drawn across a clip line).
//
// Geometry is measureBox: nodeRect on an overlay core (re-measured every frame, one call per box), the
// hit-test search otherwise (re-measured on a focus change, when the liveness probe fails, and every
// MISS_FRAMES while the target is unmeasurable, since the search is expensive).
import { getOps } from "@pocketjs/framework/host";
import { getFocused } from "@pocketjs/framework/input";
import { ringTargetOf } from "../compat/ring.ts";
import {
  createElement,
  insertNode,
  type NodeMirror,
  removeNode,
  rootMirror,
  setProp,
} from "../internal/pocket.ts";
import { type Box, hitsWithin, measureBox } from "../primitives/anchor.ts";
import { cssToCore } from "../style/css.ts";

/** Default-core frames between re-measures of a target that measured as absent. */
const MISS_FRAMES = 20;
/** Edge bars: top, bottom, left, right. */
const BARS = 4;
/** Node 0 is the rounded ring; nodes 1..BARS are the edge bars. */
const NODES = 1 + BARS;

/** A rect in root (screen) pixels, half-open: [x0, x1) x [y0, y1). */
interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** The overflow-hidden ancestors, by node. Set by the compat layer at bind. */
const clippers = new WeakSet<NodeMirror>();

/** Mark a node as an overflow-hidden clipper (its box clips the ring of a focused descendant). */
export function setClipper(node: NodeMirror, clips: boolean): void {
  if (clips) clippers.add(node);
  else clippers.delete(node);
}

/** True when a className or style clips its overflow (overflow-hidden, or style overflow "hidden"). */
export function clipsOverflow(className: unknown, style: unknown): boolean {
  if (style !== null && typeof style === "object" && (style as { overflow?: unknown }).overflow === "hidden") return true;
  return typeof className === "string" && className.split(/\s+/).some((t) => /^overflow(-[xy])?-hidden$/.test(t));
}

/** True when `node` is under the root (a detached control has no ring). */
function inRoot(node: NodeMirror): boolean {
  for (let n: NodeMirror | null = node; n; n = n.parent) if (n === rootMirror) return true;
  return false;
}

function toRect(b: Box): Rect {
  return { x0: b.x, y0: b.y, x1: b.x + b.w, y1: b.y + b.h };
}

function meet(a: Rect, b: Rect): Rect {
  return { x0: Math.max(a.x0, b.x0), y0: Math.max(a.y0, b.y0), x1: Math.min(a.x1, b.x1), y1: Math.min(a.y1, b.y1) };
}

function contains(outer: Rect, inner: Rect): boolean {
  return inner.x0 >= outer.x0 && inner.y0 >= outer.y0 && inner.x1 <= outer.x1 && inner.y1 <= outer.y1;
}

/**
 * The clip of a node: the intersection of its overflow-hidden ancestors' boxes (null = no clipper).
 * "gone" when a clipper has no box on screen, so nothing of the ring is visible.
 */
function clipOf(node: NodeMirror): Rect | null | "gone" {
  let clip: Rect | null = null;
  for (let a = node.parent; a && a !== rootMirror; a = a.parent) {
    if (!clippers.has(a)) continue;
    const box = measureBox(a);
    if (box === null) return "gone";
    clip = clip === null ? toRect(box) : meet(clip, toRect(box));
  }
  return clip;
}

/**
 * The outer corner radius of the rounded ring: the target's radius (clamped to half its short side)
 * plus the ring width, so the band is concentric with the target's corner. A square target stays square.
 */
export function outerRadius(radius: number, box: Box, width: number): number {
  const r = Math.min(radius, Math.floor(Math.min(box.w, box.h) / 2));
  return r > 0 ? r + width : 0;
}

/**
 * Install the ring: a frame pump (registered through `pump`) that shows the ring on the focused
 * target, moves it with the target, and hides it. Returns the teardown: the pump is removed and the
 * nodes leave the root.
 */
export function installFocusRing(pump: (fn: () => void) => () => void): () => void {
  const nodes: NodeMirror[] = Array.from({ length: NODES }, () => createElement("view"));
  const attached: boolean[] = nodes.map(() => false);
  const lastStyle: string[] = nodes.map(() => "");
  const hidden = JSON.stringify(cssToCore({ display: "none" }));
  const hasRect = typeof (getOps() as { nodeRect?: unknown }).nodeRect === "function";
  let target: NodeMirror | null = null;
  let box: Box | null = null;
  let clip: Rect | null | "gone" = null;
  let missed = 0;

  // Hiding keeps the nodes in the root and sets display none: a removed node is swept (destroyed), so
  // it cannot come back. Only the teardown removes them.
  const hideNode = (i: number): void => {
    if (!attached[i] || lastStyle[i] === hidden) return;
    setProp(nodes[i], "style", cssToCore({ display: "none" }) as never);
    lastStyle[i] = hidden;
  };
  const hideAll = (): void => {
    for (let i = 0; i < NODES; i++) hideNode(i);
  };
  const showNode = (i: number, style: Record<string, unknown>): void => {
    const full = { ...style, hitPass: 1 };
    if (!attached[i]) {
      insertNode(rootMirror, nodes[i]);
      attached[i] = true;
      lastStyle[i] = "";
    }
    const key = JSON.stringify(full);
    if (key !== lastStyle[i]) {
      setProp(nodes[i], "style", full as never);
      lastStyle[i] = key;
    }
  };

  const tick = (): void => {
    const focus = getFocused() as NodeMirror | null;
    const ring = focus ? ringTargetOf(focus) : undefined;
    if (!focus || !ring || !inRoot(focus)) {
      target = null;
      box = null;
      return hideAll();
    }
    if (focus !== target) {
      target = focus;
      box = null;
      clip = null;
      missed = 0;
    }
    if (!hasRect && box !== null && !hitsWithin(focus, box.x + Math.floor(box.w / 2), box.y + Math.floor(box.h / 2))) box = null;
    if (hasRect || box === null) {
      if (box === null && missed > 0 && --missed > 0) return hideAll();
      box = measureBox(focus);
      if (box === null) {
        missed = MISS_FRAMES;
        return hideAll();
      }
      clip = clipOf(focus);
    }
    if (clip === "gone") return hideAll();
    const cut: Rect | null = clip;
    const w = ring.width;
    const b = box;
    const outer: Rect = { x0: b.x - w, y0: b.y - w, x1: b.x + b.w + w, y1: b.y + b.h + w };
    if (cut === null || contains(cut, outer)) {
      for (let i = 1; i <= BARS; i++) hideNode(i);
      showNode(0, {
        ...cssToCore({
          position: "absolute",
          display: "flex", // explicit: an inline display:none written earlier must not stick
          left: outer.x0,
          top: outer.y0,
          width: outer.x1 - outer.x0,
          height: outer.y1 - outer.y0,
          borderWidth: w,
          borderColor: ring.colour,
          borderRadius: outerRadius(ring.radius, b, w),
        }),
      });
      return;
    }
    hideNode(0);
    const edges: Rect[] = [
      { x0: outer.x0, y0: outer.y0, x1: outer.x1, y1: b.y }, // top
      { x0: outer.x0, y0: b.y + b.h, x1: outer.x1, y1: outer.y1 }, // bottom
      { x0: outer.x0, y0: b.y, x1: b.x, y1: b.y + b.h }, // left
      { x0: b.x + b.w, y0: b.y, x1: outer.x1, y1: b.y + b.h }, // right
    ];
    edges.forEach((edge, i) => {
      const r = meet(edge, cut);
      if (r.x1 <= r.x0 || r.y1 <= r.y0) hideNode(i + 1);
      else
        showNode(i + 1, {
          ...cssToCore({
            position: "absolute",
            display: "flex",
            left: r.x0,
            top: r.y0,
            width: r.x1 - r.x0,
            height: r.y1 - r.y0,
            backgroundColor: ring.colour,
          }),
        });
    });
  };

  const removePump = pump(tick);
  return () => {
    removePump();
    target = null;
    box = null;
    nodes.forEach((node, i) => {
      if (attached[i]) removeNode(rootMirror, node);
      attached[i] = false;
      lastStyle[i] = "";
    });
  };
}
