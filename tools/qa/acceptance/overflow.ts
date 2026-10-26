// Gate 2, overflow and zero-area. A node is checked against its clipping ancestors (2b: a hidden axis bounds
// it) and, with no clipping ancestor, against the screen (2a). A zero-area node with text inside is 2c.
// A scroll container exempts its children on both axes (CSS: overflow-y:auto also makes x a scroll axis).
// Stock channel: a node that touches the screen edge is partial, because the box is already screen-clipped.
import type { NodeMirror } from "../../../src/internal/pocket.ts";
import { classOf } from "../../../src/style/class-runtime.ts";
import { clipAxes, type Geometry, isText, type Rect, walk } from "./geometry.ts";
import { SCREEN_H, SCREEN_W } from "./legibility.ts";

export interface Finding {
  gate: "2a" | "2b" | "2c";
  node: string;
  overshoot: number;
  detail: string;
}
export interface OverflowReport {
  channel: "overlay" | "stock";
  checked: number;
  findings: Finding[];
  partial: string[];
}

export const nameOf = (n: NodeMirror): string => n.debugName ?? "node#" + n.id;

function hasText(n: NodeMirror): boolean {
  return n.children.some((c) => (isText(c) && (c as unknown as { text: string }).text !== "") || hasText(c));
}

const touchesEdge = (r: Rect): boolean => r.x <= 0 || r.y <= 0 || r.x + r.w >= SCREEN_W || r.y + r.h >= SCREEN_H;

/** The overshoot of r past box b on the given axes (0 when inside). */
function past(r: Rect, b: { x: number; y: number; w: number; h: number }, axX: boolean, axY: boolean): number {
  const left = axX ? b.x - r.x : 0;
  const right = axX ? r.x + r.w - (b.x + b.w) : 0;
  const top = axY ? b.y - r.y : 0;
  const bottom = axY ? r.y + r.h - (b.y + b.h) : 0;
  return Math.max(0, left, right, top, bottom);
}

export function checkOverflow(root: NodeMirror, geo: Geometry): OverflowReport {
  const findings: Finding[] = [];
  const partial: string[] = [];
  let checked = 0;
  walk(root, (n, anc) => {
    if (isText(n)) return;
    const r = geo.rect(n);
    if (!r) return;
    checked++;
    const label = nameOf(n);
    if (r.w === 0 || r.h === 0) {
      if (hasText(n))
        findings.push({ gate: "2c", node: label, overshoot: 0, detail: "zero-area " + r.w + "x" + r.h + " with text inside" });
      return;
    }
    if (geo.channel === "stock" && touchesEdge(r)) {
      partial.push(label);
      return;
    }
    let clipped = false;
    for (let i = anc.length - 1; i >= 0; i--) {
      const ax = clipAxes(classOf(anc[i]));
      if (!(ax.clipX || ax.clipY || ax.scrollX || ax.scrollY)) continue;
      clipped = true;
      const ar = geo.rect(anc[i]);
      if (!ar) continue;
      const axX = ax.clipX && !ax.scrollX;
      const axY = ax.clipY && !ax.scrollY;
      const over = past(r, ar, axX, axY);
      if (over > 0)
        findings.push({ gate: "2b", node: label, overshoot: over, detail: "extends " + over + " px past " + nameOf(anc[i]) });
    }
    if (!clipped) {
      const over = past(r, { x: 0, y: 0, w: SCREEN_W, h: SCREEN_H }, true, true);
      if (over > 0) findings.push({ gate: "2a", node: label, overshoot: over, detail: "outside the " + SCREEN_W + "x" + SCREEN_H + " screen" });
    }
  });
  return { channel: geo.channel, checked, findings, partial };
}
