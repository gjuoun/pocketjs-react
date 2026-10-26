// The gallery's real-device defects, each proved by pixels in the built page (the wasm core, as the web host runs it):
// the accordion chevron turns when its item opens, the alert's Cancel label reads on its white fill, the bubble and
// calendar sections draw their own content, and the carousel's slides fit the screen with its arrows in view.
import { expect, test } from "bun:test";
import { join, resolve } from "node:path";
import { BTN } from "@pocketjs/framework/input";
import { FB_W } from "../src/internal/pocket-build.ts";
import { build } from "../tools/build.ts";
import { SECTIONS, TOPS, TITLE_H, VIEW_H } from "./fixtures/shadcn-gallery/layout.ts";
import { bootApp, type Core, type TextRun } from "./harness.ts";

const ROOT = resolve(import.meta.dir, "..");
const ENTRY = join(ROOT, "test/fixtures/shadcn-gallery/main.tsx");
const WHITE = "#ffffff";

/** A fresh gallery core, built from the host page sources. */
async function bootGallery(): Promise<Core> {
  const built = await build(ENTRY, { outdir: join(ROOT, "dist"), name: "shadcn-gallery" });
  return bootApp(built);
}

/** Yield one frame to the event loop so React's scheduled work runs (as overlay-scene's frame does). */
async function frame(core: Core, buttons = 0): Promise<void> {
  core.step(buttons);
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

/** A d-pad press: held for two frames, released, settled. */
async function press(core: Core, buttons: number): Promise<void> {
  await frame(core, buttons);
  await frame(core, buttons);
  await frame(core, 0);
  await frame(core, 0);
}

/** A pointer tap on (x, y), the same queue overlay-scene's tap feeds. */
async function tap(core: Core, x: number, y: number): Promise<void> {
  const g = globalThis as { __pocketPointer?: { x: number; y: number; down: boolean }[] };
  (g.__pocketPointer ??= []).push({ x, y, down: true });
  await frame(core);
  g.__pocketPointer!.push({ x, y, down: false });
  for (let i = 0; i < 6; i++) await frame(core);
}

/** The section's index, then DOWN presses until it is the one at the top of the screen. */
async function show(core: Core, name: string): Promise<number> {
  const i = SECTIONS.findIndex((s) => s.name === name);
  for (let k = 0; k < i; k++) await press(core, BTN.DOWN);
  core.texts();
  return i;
}

function run(core: Core, text: string): TextRun {
  const r = core.texts().find((t) => t.text === text);
  if (!r) throw new Error("no text run " + JSON.stringify(text));
  return r;
}

/** The pixels of a rect, row by row, as #rrggbb. */
function grab(core: Core, x0: number, y0: number, x1: number, y1: number): string[][] {
  core.render();
  const rows: string[][] = [];
  for (let y = y0; y < y1; y++) {
    const row: string[] = [];
    for (let x = x0; x < x1; x++) row.push(core.pixel(x, y));
    rows.push(row);
  }
  return rows;
}

/** The ink of a grabbed rect: pixels that differ from the background, with their count and centroid. */
function inkOf(rows: string[][], x0: number, y0: number, bg = WHITE) {
  let n = 0;
  let sx = 0;
  let sy = 0;
  rows.forEach((row, j) =>
    row.forEach((p, i) => {
      if (p === bg) return;
      n++;
      sx += i + x0;
      sy += j + y0;
    }),
  );
  return { n, cx: n ? sx / n : 0, cy: n ? sy / n : 0 };
}

/** Pixels that differ between two grabs of the same rect. */
function changed(a: string[][], b: string[][]): number {
  let d = 0;
  a.forEach((row, j) => row.forEach((p, i) => { if (p !== b[j][i]) d++; }));
  return d;
}

test("accordion: the chevron turns 180 degrees when its item opens", async () => {
  const core = await bootGallery();
  await show(core, "accordion");
  const t = run(core, "Is it accessible?");
  // The chevron sits at the right edge of the trigger row; its box is the same open and closed (the turn is about its centre).
  const box = [440, t.y - 8, 478, t.y + 22] as const;
  const open = grab(core, ...box);
  await tap(core, t.x + 10, t.y + 5);
  core.texts();
  const closed = grab(core, ...box);
  await tap(core, t.x + 10, t.y + 5);
  core.texts();
  const reopened = grab(core, ...box);
  const a = inkOf(open, box[0], box[1]);
  const b = inkOf(closed, box[0], box[1]);
  console.log(`accordion chevron ink open ${a.n} @${a.cx.toFixed(2)},${a.cy.toFixed(2)} | closed ${b.n} @${b.cx.toFixed(2)},${b.cy.toFixed(2)} | changed px ${changed(open, closed)}`);
  expect(changed(open, closed)).toBeGreaterThan(20);
  expect(Math.abs(a.cy - b.cy)).toBeGreaterThan(0.3);
  expect(changed(open, reopened)).toBe(0);
}, 120_000);
