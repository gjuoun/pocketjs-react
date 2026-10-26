// Focus ring (compat only). One absolute overlay node per mount, drawn just outside the box of the
// focused DOM-mapped focusable: the ring the default focus used to draw as a layout border, now a node
// that never takes part in layout, so focusing never moves the control. The node is a root child
// added after the overlay layer, so it paints above every app and popup layer. hitPass keeps the band
// hit-transparent: a click on it still reaches the control or row underneath.
//
// Geometry is measureBox: nodeRect on an overlay core (re-measured every frame, one call), the
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
import { hoverClaimsHighlight } from "../input/hover.ts";
import { cssToCore } from "../style/css.ts";

/** Default-core frames between re-measures of a target that measured as absent. */
const MISS_FRAMES = 20;

/** True when `node` is under the root (a detached control has no ring). */
function inRoot(node: NodeMirror): boolean {
  for (let n: NodeMirror | null = node; n; n = n.parent) if (n === rootMirror) return true;
  return false;
}

/**
 * Install the ring: a frame pump (registered through `pump`) that shows the ring on the focused
 * target, moves it with the target, and hides it. Returns the teardown: the pump is removed and the
 * node leaves the root.
 */
export function installFocusRing(pump: (fn: () => void) => () => void): () => void {
  const node = createElement("view");
  const hasRect = typeof (getOps() as { nodeRect?: unknown }).nodeRect === "function";
  let attached = false;
  let lastStyle = "";
  let target: NodeMirror | null = null;
  let box: Box | null = null;
  let missed = 0;

  // Hiding keeps the node in the root and sets display none: a removed node is swept (destroyed), so
  // it cannot come back. Only the teardown removes it.
  const hidden = JSON.stringify(cssToCore({ display: "none" }));
  const hide = (): void => {
    if (!attached || lastStyle === hidden) return;
    setProp(node, "style", cssToCore({ display: "none" }) as never);
    lastStyle = hidden;
  };

  const tick = (): void => {
    const focus = getFocused() as NodeMirror | null;
    const ring = focus ? ringTargetOf(focus) : undefined;
    if (!focus || !ring || !inRoot(focus)) {
      target = null;
      box = null;
      return hide();
    }
    // Hover owns the highlight while a row is lit: the ring waits (the target and its box are kept).
    if (hoverClaimsHighlight()) return hide();
    if (focus !== target) {
      target = focus;
      box = null;
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
    }
    const w = ring.width;
    const style = {
      ...cssToCore({
        position: "absolute",
        display: "flex", // explicit: an inline display:none written earlier must not stick
        left: box.x - w,
        top: box.y - w,
        width: box.w + 2 * w,
        height: box.h + 2 * w,
        borderWidth: w,
        borderColor: ring.colour,
      }),
      hitPass: 1,
    };
    if (!attached) {
      insertNode(rootMirror, node);
      attached = true;
      lastStyle = "";
    }
    const key = JSON.stringify(style);
    if (key !== lastStyle) {
      setProp(node, "style", style as never);
      lastStyle = key;
    }
  };

  const removePump = pump(tick);
  return () => {
    removePump();
    target = null;
    box = null;
    if (attached) removeNode(rootMirror, node);
    attached = false;
    lastStyle = "";
  };
}
