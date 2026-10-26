// Focus ring (compat only). One ring per mount, drawn just outside the box of the focused DOM-mapped
// focusable: the ring the default focus used to draw as a layout border, now absolute nodes that take
// no part in layout, so focusing never moves the control. The ring is four edge bars (top, bottom,
// left, right), each a root child added after the overlay layer, so it paints above every app and
// popup layer. hitPass keeps the bars hit-transparent: a click on the band still reaches the control or
// row underneath.
//
// Clipping (CSS parity): a bar is cut to the intersection of every overflow-hidden ancestor's box, so a
// ring at the edge of a clipping container is clipped exactly where CSS would clip it.
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
/** Number of ring bars: top, bottom, left, right. */
const BARS = 4;

/** A rect in root (screen) pixels, half-open: [x0, x1) x [y0, y1). */
interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** The overflow-hidden ancestors, by node. Set by the compat layer at create and update. */
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
 * Install the ring: a frame pump (registered through `pump`) that shows the ring on the focused
 * target, moves it with the target, and hides it. Returns the teardown: the pump is removed and the
 * bars leave the root.
 */
export function installFocusRing(pump: (fn: () => void) => () => void): () => void {
  const bars: NodeMirror[] = Array.from({ length: BARS }, () => createElement("view"));
  const attached: boolean[] = bars.map(() => false);
  const lastStyle: string[] = bars.map(() => "");
  const hidden = JSON.stringify(cssToCore({ display: "none" }));
  const hasRect = typeof (getOps() as { nodeRect?: unknown }).nodeRect === "function";
  let target: NodeMirror | null = null;
  let box: Box | null = null;
  let clip: Rect | null | "gone" = null;
  let missed = 0;

  // Hiding keeps the bars in the root and sets display none: a removed node is swept (destroyed), so
  // it cannot come back. Only the teardown removes them.
  const hideBar = (i: number): void => {
    if (!attached[i] || lastStyle[i] === hidden) return;
    setProp(bars[i], "style", cssToCore({ display: "none" }) as never);
    lastStyle[i] = hidden;
  };
  const hide = (): void => {
    for (let i = 0; i < BARS; i++) hideBar(i);
  };

  const showBar = (i: number, r: Rect, colour: string): void => {
    const style = {
      ...cssToCore({
        position: "absolute",
        display: "flex", // explicit: an inline display:none written earlier must not stick
        left: r.x0,
        top: r.y0,
        width: r.x1 - r.x0,
        height: r.y1 - r.y0,
        backgroundColor: colour,
      }),
      hitPass: 1,
    };
    if (!attached[i]) {
      insertNode(rootMirror, bars[i]);
      attached[i] = true;
      lastStyle[i] = "";
    }
    const key = JSON.stringify(style);
    if (key !== lastStyle[i]) {
      setProp(bars[i], "style", style as never);
      lastStyle[i] = key;
    }
  };

  const tick = (): void => {
    const focus = getFocused() as NodeMirror | null;
    const ring = focus ? ringTargetOf(focus) : undefined;
    if (!focus || !ring || !inRoot(focus)) {
      target = null;
      box = null;
      return hide();
    }
    if (focus !== target) {
      target = focus;
      box = null;
      clip = null;
      missed = 0;
    }
    if (!hasRect && box !== null && !hitsWithin(focus, box.x + Math.floor(box.w / 2), box.y + Math.floor(box.h / 2))) box = null;
    if (hasRect || box === null) {
      if (box === null && missed > 0 && --missed > 0) return hide();
      box = measureBox(focus);
      if (box === null) {
        missed = MISS_FRAMES;
        return hide();
      }
      clip = clipOf(focus);
    }
    if (clip === "gone") return hide();
    const cut: Rect | null = clip;
    const w = ring.width;
    const outer: Rect = { x0: box.x - w, y0: box.y - w, x1: box.x + box.w + w, y1: box.y + box.h + w };
    const edges: Rect[] = [
      { x0: outer.x0, y0: outer.y0, x1: outer.x1, y1: box.y }, // top
      { x0: outer.x0, y0: box.y + box.h, x1: outer.x1, y1: outer.y1 }, // bottom
      { x0: outer.x0, y0: box.y, x1: box.x, y1: box.y + box.h }, // left
      { x0: box.x + box.w, y0: box.y, x1: outer.x1, y1: box.y + box.h }, // right
    ];
    edges.forEach((edge, i) => {
      const r = cut === null ? edge : meet(edge, cut);
      if (r.x1 <= r.x0 || r.y1 <= r.y0) hideBar(i);
      else showBar(i, r, ring.colour);
    });
  };

  const removePump = pump(tick);
  return () => {
    removePump();
    target = null;
    box = null;
    bars.forEach((bar, i) => {
      if (attached[i]) removeNode(rootMirror, bar);
      attached[i] = false;
      lastStyle[i] = "";
    });
  };
}
