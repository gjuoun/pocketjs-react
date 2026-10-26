// Proof for the shadcn gallery: the app built by tools/build.ts, booted on the wasm core (the pixel harness).
// Every section must draw ink in its own rect, the page must scroll to the last section with DOWN presses,
// the page must show 61 distinct titles, the topmost section must be each section in turn on the way down
// (the counter walks 1..61), and no section may print its `failed:` notice.
import { expect, test } from "bun:test";
import { mkdirSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { BTN } from "@pocketjs/framework/input";
import { FB_H, FB_W } from "../src/internal/pocket-build.ts";
import { build } from "../tools/build.ts";
import {
  MAX_OFFSET,
  nextTop,
  prevTop,
  SECTIONS,
  TAIL_H,
  TITLE_H,
  TOPS,
  TOTAL,
  VIEW_H,
} from "./fixtures/shadcn-gallery/layout.ts";
import { bootApp, type Core, type TextRun } from "./harness.ts";
import { encodePng } from "./png.ts";

const ROOT = resolve(import.meta.dir, "..");
const ENTRY = join(ROOT, "test/fixtures/shadcn-gallery/main.tsx");
const UI = join(ROOT, "test/fixtures/shadcn-full/ui");
const SHOTS = join(ROOT, "dist/shadcn-gallery-shots");
const WHITE = "#ffffff"; // the section card surface (bg-white)
const BAR = "#0f172a"; // the title bar (bg-slate-900)
const INK_MIN = 20; // pixels in a section body that differ from the card surface
const N = SECTIONS.length;
const titleOf = (i: number) =>
  `${String(i + 1).padStart(2, "0")}/${N} ${SECTIONS[i].name}`;
const byTitle = new Map(SECTIONS.map((_, i) => [titleOf(i), i] as const));

/** The section at the top of the screen: the visible title bar with the smallest y (the counter's section). */
function topmostTitle(runs: TextRun[]): number {
  let best = -1;
  let bestY = Infinity;
  for (const r of runs) {
    const i = byTitle.get(r.text);
    if (i === undefined || r.y < 0 || r.y >= VIEW_H || r.y >= bestY) continue;
    best = i;
    bestY = r.y;
  }
  return best;
}

/** Top row of a section: walk up from its title text while the bar colour continues. */
function frameTop(core: Core, run: TextRun): number {
  let y = run.y;
  while (y > 0 && core.pixel(2, y - 1) === BAR) y--;
  return y;
}

/** Pixels in rows [y0, y1) that differ from the card surface. */
function inkIn(core: Core, y0: number, y1: number): number {
  let n = 0;
  for (let y = y0; y < y1; y++)
    for (let x = 0; x < FB_W; x++) if (core.pixel(x, y) !== WHITE) n++;
  return n;
}

function writePng(core: Core, file: string): void {
  core.render();
  const rgba = new Uint8Array(FB_W * FB_H * 4);
  for (let y = 0; y < FB_H; y++)
    for (let x = 0; x < FB_W; x++) {
      const hex = core.pixel(x, y);
      const i = (y * FB_W + x) * 4;
      rgba[i] = parseInt(hex.slice(1, 3), 16);
      rgba[i + 1] = parseInt(hex.slice(3, 5), 16);
      rgba[i + 2] = parseInt(hex.slice(5, 7), 16);
      rgba[i + 3] = 255;
    }
  mkdirSync(SHOTS, { recursive: true });
  Bun.write(join(SHOTS, file), encodePng(rgba, FB_W, FB_H));
}

test("the section list is the vendored set: 61 components, one section each", () => {
  const files = readdirSync(UI)
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => f.replace(/\.tsx$/, ""))
    .sort();
  expect(N).toBe(61);
  const names: string[] = SECTIONS.map((s): string => s.name);
  expect(names.sort()).toEqual(files);
});

test("the scroll arithmetic: DOWN and UP snap between section tops and clamp at the end", () => {
  expect(nextTop(0)).toBe(TOPS[1]);
  expect(prevTop(TOPS[1])).toBe(0);
  expect(nextTop(MAX_OFFSET)).toBe(MAX_OFFSET);
  expect(MAX_OFFSET).toBe(TOTAL - VIEW_H);
  // The last section's top is the largest offset: it snaps to the top of the screen, the tail fills below it.
  expect(MAX_OFFSET).toBe(TOPS[N - 1]);
  expect(TAIL_H).toBe(VIEW_H - SECTIONS[N - 1].h);
  expect(nextTop(TOPS[N - 2])).toBe(TOPS[N - 1]);
  expect(prevTop(MAX_OFFSET)).toBe(TOPS[N - 2]);
});

test("the built gallery draws all 61 sections, scrolls to the last one, and shows 61 titles", async () => {
  const built = await build(ENTRY, {
    outdir: join(ROOT, "dist"),
    name: "shadcn-gallery",
  });
  const core = await bootApp(built);
  const passed = new Set<number>();
  const best = new Map<number, number>();
  const titles = new Set<number>();
  const failed: string[] = [];
  let lastTop = NaN;
  const topmostAt: number[] = [];
  const topText: string[] = [];
  for (let press = 0; press <= N + 5; press++) {
    const runs = core.texts();
    for (const r of runs) if (r.text.startsWith("failed:")) failed.push(r.text);
    const topIdx = topmostTitle(runs);
    topmostAt.push(topIdx);
    topText.push(topIdx < 0 ? "" : titleOf(topIdx));
    for (let i = 0; i < N; i++) {
      const run = runs.find((r) => r.text === titleOf(i));
      if (!run) continue;
      titles.add(i);
      const top = frameTop(core, run);
      if (i === N - 1) lastTop = top;
      if (passed.has(i) || top < 0 || top + SECTIONS[i].h > VIEW_H) continue;
      const n = inkIn(core, top + TITLE_H, top + SECTIONS[i].h);
      best.set(i, Math.max(best.get(i) ?? 0, n));
      if (n >= INK_MIN) passed.add(i);
    }
    if (press === 0) writePng(core, "shadcn-gallery-top.png");
    if (press === 30) writePng(core, "shadcn-gallery-middle.png");
    core.press(BTN.DOWN);
  }
  writePng(core, "shadcn-gallery-bottom.png");
  const missing = [...Array(N).keys()].filter((i) => !passed.has(i));
  const counter = [0, 29, 57, 58, 59, 60].map((p) => String(topmostAt[p] + 1));
  const minInk = Math.min(...[...best.values()]);
  console.log(
    `bundle ${built.bundleBytes} B, pak ${built.pakBytes} B | sections inked ${passed.size}/${N} | titles seen ${titles.size}/${N} | min ink ${minInk} px | counter after 0/29/57/58/59/60 DOWN: ${counter.join('/')} | last section top ${lastTop} | failed ${failed.length}`,
  );
  expect(failed).toEqual([]);
  expect(missing.map((i) => titleOf(i))).toEqual([]);
  expect(titles.size).toBe(N);
  // Every section is the topmost one on the way down, 59 and 60 included.
  expect(topmostAt.slice(0, N)).toEqual([...Array(N).keys()]);
  // The bottom: the last section sits at the top of the screen and its title bar reads 61/61.
  expect(Math.abs(lastTop)).toBeLessThanOrEqual(1);
  expect(topText.at(-1)).toBe(titleOf(N - 1));
  expect(topText.at(-1)?.startsWith("61/61 ")).toBe(true);
}, 600_000);
