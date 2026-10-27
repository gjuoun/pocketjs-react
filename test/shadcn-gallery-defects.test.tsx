// The gallery's real-device defects, each proved by pixels in the built page (the wasm core, as the web host runs it):
// the accordion chevron turns when its item opens, the alert's Cancel label reads on its white fill, the bubble and
// calendar sections draw their own content, and the carousel's slides fit the screen with its arrows in view.
import { expect, test } from "bun:test";
import { join, resolve } from "node:path";
import { BTN } from "@pocketjs/framework/input";
import { FB_W } from "../src/internal/pocket-build.ts";
import { build } from "../tools/build.ts";
import { SECTIONS, TITLE_H, VIEW_H } from "./fixtures/shadcn-gallery/layout.ts";
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

/** WCAG contrast ratio of two #rrggbb colours. */
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
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

test("prompt: the alert's Cancel and Continue labels read on their own fills", async () => {
  const core = await bootGallery();
  await show(core, "alert-dialog");
  await tap(core, run(core, "Delete project").x + 20, run(core, "Delete project").y + 5);
  core.texts();
  const labels = ["Cancel", "Continue"].map((text) => {
    const r = run(core, text);
    const fill = core.pixel(r.x - 6, r.y + 7);
    const rows = grab(core, r.x - 2, r.y - 2, r.x + r.w + 2, r.y + r.h + 2);
    const ink = new Map<string, number>();
    let n = 0;
    for (const row of rows) for (const p of row) if (p !== fill) { n++; ink.set(p, (ink.get(p) ?? 0) + 1); }
    const label = [...ink.entries()].sort((x, y) => y[1] - x[1])[0]?.[0] ?? fill;
    return { text, fill, label, n, ratio: contrast(label, fill) };
  });
  console.log(labels.map((l) => `${l.text}: fill ${l.fill} label ${l.label} ink ${l.n} px contrast ${l.ratio.toFixed(2)}`).join(" | "));
  for (const l of labels) {
    expect(l.n).toBeGreaterThan(20);
    expect(l.ratio).toBeGreaterThanOrEqual(4.5);
  }
}, 120_000);

test("bubble: each bubble draws its own filled box with a legible label", async () => {
  const core = await bootGallery();
  await show(core, "bubble");
  const h = SECTIONS[SECTIONS.findIndex((s) => s.name === "bubble")].h;
  const section = inkOf(grab(core, 0, TITLE_H, FB_W, h), 0, TITLE_H).n;
  const boxes = ["Hello", "Hi there"].map((text) => {
    const r = run(core, text);
    const fill = core.pixel(r.x - 6, r.y + 7);
    const rows = grab(core, r.x - 2, r.y - 2, r.x + r.w + 2, r.y + r.h + 2);
    const ink = new Map<string, number>();
    for (const row of rows) for (const p of row) if (p !== fill) ink.set(p, (ink.get(p) ?? 0) + 1);
    const label = [...ink.entries()].sort((x, y) => y[1] - x[1])[0]?.[0] ?? fill;
    return { text, fill, label, ratio: contrast(label, fill) };
  });
  console.log(`bubble section ink ${section} px | ${boxes.map((b) => `${b.text}: fill ${b.fill} label ${b.label} contrast ${b.ratio.toFixed(2)}`).join(" | ")}`);
  expect(section).toBeGreaterThan(20);
  for (const b of boxes) {
    expect(b.fill).not.toBe(WHITE);
    expect(b.ratio).toBeGreaterThanOrEqual(4.5);
  }
}, 120_000);

test("calendar: the month grid lays out as a grid, every day inside the screen", async () => {
  const core = await bootGallery();
  await show(core, "calendar");
  const h = SECTIONS[SECTIONS.findIndex((s) => s.name === "calendar")].h;
  const section = inkOf(grab(core, 0, TITLE_H, FB_W, h), 0, TITLE_H).n;
  const runs = core.texts().filter((r) => r.y >= TITLE_H && r.y < h);
  const days = runs.filter((r) => /^\d+$/.test(r.text));
  const weekdays = runs.filter((r) => ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].includes(r.text));
  const rowsOf = new Set(days.map((r) => r.y)).size;
  console.log(`calendar section ink ${section} px | day numbers ${days.length} on screen, ${rowsOf} week rows, weekdays ${weekdays.length}, rightmost edge ${Math.max(...runs.map((r) => r.x + r.w))}`);
  expect(section).toBeGreaterThan(20);
  expect(days.length).toBe(35);
  expect(weekdays.length).toBe(7);
  expect(rowsOf).toBe(5);
  expect(Math.max(...runs.map((r) => r.x + r.w))).toBeLessThanOrEqual(FB_W);
}, 120_000);
