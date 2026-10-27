// Gate 4, interaction response. A scripted input must change something measurable: a new layer that has text
// (sheet, dialog), a text run added, ink changed in the trigger's box, or a node moved. Any one metric is enough.
// Snapshots are taken after the frames settle (two identical samples in a row, at most 120 frames).
import { BTN, focusNode } from "@pocketjs/framework/input";
import type { NodeMirror } from "../../../src/internal/pocket.ts";
import type { Core } from "../../../test/harness.ts";
import type { Driver, Metric } from "./drivers.ts";
import { type Geometry, isText, type Rect, walk } from "./geometry.ts";
import { SCREEN_H, SCREEN_W } from "./legibility.ts";

const MIN_INK = 20;
const MIN_MOVE = 4;

interface Snap {
  texts: string[];
  ids: Set<number>;
  rects: Map<number, Rect | null>;
  px: Uint32Array;
}

function sample(core: Core): string {
  let s = "";
  for (let y = 0; y < SCREEN_H; y += 8) for (let x = 0; x < SCREEN_W; x += 8) s += core.pixel(x, y);
  return s;
}

/** Step frames until two samples in a row are identical (120 frames at most). */
export function settle(core: Core): void {
  let prev = "";
  let same = 0;
  for (let i = 0; i < 120 && same < 2; i++) {
    core.step(0);
    core.render();
    const now = sample(core);
    same = now === prev ? same + 1 : 0;
    prev = now;
  }
}

function snap(core: Core, root: NodeMirror, geo: Geometry): Snap {
  const texts = core.texts().map((t) => t.text);
  core.render();
  const ids = new Set<number>();
  const rects = new Map<number, Rect | null>();
  walk(root, (n) => {
    if (isText(n)) return;
    ids.add(n.id);
    rects.set(n.id, geo.rect(n));
  });
  const px = new Uint32Array(SCREEN_W * SCREEN_H);
  for (let y = 0; y < SCREEN_H; y++)
    for (let x = 0; x < SCREEN_W; x++) px[y * SCREEN_W + x] = parseInt(core.pixel(x, y).slice(1), 16);
  return { texts, ids, rects, px };
}

/** Pixels in a box that differ from the box's most common colour (its fill). */
function inkIn(px: Uint32Array, r: Rect): number {
  const x0 = Math.max(0, r.x);
  const y0 = Math.max(0, r.y);
  const x1 = Math.min(SCREEN_W, r.x + r.w);
  const y1 = Math.min(SCREEN_H, r.y + r.h);
  if (x1 <= x0 || y1 <= y0) return 0;
  const hist = new Map<number, number>();
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) hist.set(px[y * SCREEN_W + x], (hist.get(px[y * SCREEN_W + x]) ?? 0) + 1);
  const fill = [...hist.entries()].sort((a, b) => b[1] - a[1])[0][0];
  let n = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (px[y * SCREEN_W + x] !== fill) n++;
  return n;
}

export interface Verdict {
  status: "pass" | "fail" | "n/a" | "unresolved";
  metric?: Metric;
  reason: string;
}

/** The element to focus: the host of the first text run whose text is the label. */
export function triggerNode(root: NodeMirror, label: string): NodeMirror | undefined {
  let found: NodeMirror | undefined;
  walk(root, (n) => {
    if (!found && isText(n) && (n as unknown as { text: string }).text === label) found = n.parent ?? undefined;
  });
  return found;
}

/** Run one driver: settle, snapshot, press the trigger, settle, snapshot, then the metrics (any one passes). */
export function runDriver(core: Core, root: NodeMirror, geo: Geometry, driver: Driver): Verdict {
  if (driver.kind === "static") return { status: "n/a", reason: driver.reason };
  if (driver.kind === "unresolved") return { status: "unresolved", reason: driver.reason };
  settle(core);
  const before = snap(core, root, geo);
  const target = triggerNode(root, driver.trigger);
  if (!target) return { status: "unresolved", reason: "no element with text " + JSON.stringify(driver.trigger) };
  const targetRect = geo.rect(target);
  focusNode(target);
  core.press(BTN.CIRCLE, 4);
  settle(core);
  const after = snap(core, root, geo);
  // A one-character run is an icon glyph on this runtime (the close X is an ASCII placeholder), not content.
  const addedTexts = after.texts.filter((t) => !before.texts.includes(t) && t.trim().length >= 2);
  const added = addedTexts.length;
  const reasons: string[] = [];
  for (const m of driver.metrics) {
    if (m === "text") {
      if (added >= 1) return { status: "pass", metric: "text", reason: added + " text run(s) added: " + JSON.stringify(addedTexts) };
      reasons.push("no text run added");
    }
    if (m === "layer") {
      const fresh = [...after.ids]
        .filter((id) => !before.ids.has(id))
        .map((id) => after.rects.get(id))
        .filter((r): r is Rect => !!r);
      if (fresh.length === 0) {
        reasons.push("no new layer");
        continue;
      }
      const layer = fresh.reduce((a, b) => (b.w * b.h > a.w * a.h ? b : a));
      const ink = inkIn(after.px, layer);
      if (ink >= MIN_INK && added >= 1)
        return { status: "pass", metric: "layer", reason: "layer ink " + ink + " px, text added: " + JSON.stringify(addedTexts) };
      reasons.push("no text run added in the layer (layer ink " + ink + " px, texts added " + JSON.stringify(addedTexts) + ")");
    }
    if (m === "ink" && targetRect) {
      const delta = Math.abs(inkIn(after.px, targetRect) - inkIn(before.px, targetRect));
      if (delta >= MIN_INK) return { status: "pass", metric: "ink", reason: "trigger ink changed by " + delta + " px" };
      reasons.push("trigger ink unchanged");
    }
    if (m === "offset") {
      let moved = 0;
      for (const id of before.ids) {
        const a = before.rects.get(id);
        const b = after.rects.get(id);
        if (a && b && (Math.abs(a.y - b.y) >= MIN_MOVE || Math.abs(a.x - b.x) >= MIN_MOVE)) moved++;
      }
      if (moved > 0) return { status: "pass", metric: "offset", reason: moved + " node(s) moved" };
      reasons.push("no node moved");
    }
  }
  return { status: "fail", reason: reasons.join("; ") || "no metric passed" };
}
