// Gate 2, overflow and zero-area. Clip-aware: what counts is what the user could see stick past its viewport.
//   2a  an unclipped node that runs past the screen (its box, untrimmed, is past the 480 x 272 screen).
//   2b  a node that is cut by a clipping ancestor's edge while part of it is still shown: the visible part runs up to the
//       clip and the node goes on past it (a slide 128 px past its viewport edge, with the viewport clipping the rest).
//   2c  a zero-area node with text inside. A node the author hid with `hidden` (display none, unless a breakpoint variant
//       shows it) is not shown, so its text is not a zero-area defect: the label is hidden on purpose (a sr-only label).
// Content clipped away is not overflow: a node that lies wholly outside a clipping ancestor (or outside the intersection of
// all of them) is never shown, so it is counted in clippedAway and not reported. A carousel keeping its off-screen slides
// inside its track is that case. A scroll container exempts its children on its scroll axes (CSS: overflow-y:auto also makes
// x a scroll axis). Stock channel: a node that touches the screen edge is partial, because the box is already screen-clipped.
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
  /** Nodes wholly outside a clipping ancestor: not shown, so not overflow (not reported, counted for the record). */
  clippedAway: number;
}

export const nameOf = (n: NodeMirror): string => n.debugName ?? "node#" + n.id;

/** The author hid the node with `hidden` (display none): no breakpoint variant on the class shows it again. */
function hiddenByClass(n: NodeMirror): boolean {
  const t = classOf(n).split(/\s+/);
  return t.includes("hidden") && !t.some((c) => /^(sm|md|lg|xl|2xl):/.test(c));
}

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

/** A clipping ancestor: its box and the axes it clips (a scroll axis is not a clip, so it is not listed). */
interface Clip {
  rect: Rect;
  axX: boolean;
  axY: boolean;
}

/** True when some part of r lies inside every clipping ancestor at once (the intersection on each clipped axis). */
function shownThrough(r: Rect, clips: Clip[]): boolean {
  let x0 = r.x;
  let x1 = r.x + r.w;
  let y0 = r.y;
  let y1 = r.y + r.h;
  for (const c of clips) {
    if (c.axX) {
      x0 = Math.max(x0, c.rect.x);
      x1 = Math.min(x1, c.rect.x + c.rect.w);
    }
    if (c.axY) {
      y0 = Math.max(y0, c.rect.y);
      y1 = Math.min(y1, c.rect.y + c.rect.h);
    }
  }
  return x1 > x0 && y1 > y0;
}

export function checkOverflow(root: NodeMirror, geo: Geometry): OverflowReport {
  const findings: Finding[] = [];
  const partial: string[] = [];
  let checked = 0;
  let clippedAway = 0;
  walk(root, (n, anc) => {
    if (isText(n)) return;
    const r = geo.rect(n);
    if (!r) return;
    checked++;
    const label = nameOf(n);
    if (r.w === 0 || r.h === 0) {
      if (hasText(n) && !hiddenByClass(n) && !anc.some(hiddenByClass))
        findings.push({ gate: "2c", node: label, overshoot: 0, detail: "zero-area " + r.w + "x" + r.h + " with text inside" });
      return;
    }
    if (geo.channel === "stock" && touchesEdge(r)) {
      partial.push(label);
      return;
    }
    const clips: Array<Clip & { node: NodeMirror }> = [];
    let clipped = false;
    for (let i = anc.length - 1; i >= 0; i--) {
      const ax = clipAxes(classOf(anc[i]));
      if (!(ax.clipX || ax.clipY || ax.scrollX || ax.scrollY)) continue;
      clipped = true;
      const ar = geo.rect(anc[i]);
      if (!ar) continue;
      const axX = ax.clipX && !ax.scrollX;
      const axY = ax.clipY && !ax.scrollY;
      if (axX || axY) clips.push({ node: anc[i], rect: ar, axX, axY });
    }
    if (clipped) {
      if (!shownThrough(r, clips)) {
        clippedAway++;
        return;
      }
      for (const c of clips) {
        const over = past(r, c.rect, c.axX, c.axY);
        if (over > 0) findings.push({ gate: "2b", node: label, overshoot: over, detail: "cut by " + nameOf(c.node) + ": extends " + over + " px past its edge" });
      }
      return;
    }
    const over = past(r, { x: 0, y: 0, w: SCREEN_W, h: SCREEN_H }, true, true);
    if (over > 0) findings.push({ gate: "2a", node: label, overshoot: over, detail: "outside the " + SCREEN_W + "x" + SCREEN_H + " screen" });
  });
  return { channel: geo.channel, checked, findings, partial, clippedAway };
}
