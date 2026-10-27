// Touch paging for the native gallery. A tap that lands on a focusable, or within TAP_EDGE_SLOP logical px of one (a
// finger's margin beside a tab), presses that focusable and never pages. Otherwise a tap in the left eighth of the canvas
// goes back, one in the right eighth goes forward, and the middle is left to the page.
import { hitFocusable, pressNode } from "@pocketjs/framework/input";

/** A finger's margin: the nearest focusable within this many logical px of a tap takes the press. */
export const TAP_EDGE_SLOP = 8;

/** The focusable nearest a point: square rings out to `slop` px, nearest ring first. Null when none is that close. */
export function focusableNear(x: number, y: number, slop: number) {
  for (let r = 0; r <= slop; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const node = hitFocusable(x + dx, y + dy);
        if (node) return node;
      }
    }
  }
  return null;
}

/** One tap on empty canvas (the release of a press that hit no focusable): press a control near it, or page. */
export function touchTap(x: number, y: number, w: number, page: { back(): void; forward(): void }): void {
  const near = focusableNear(x, y, TAP_EDGE_SLOP);
  if (near) {
    pressNode(near);
    return;
  }
  if (x < w / 8) page.back();
  else if (x >= (w * 7) / 8) page.forward();
}
