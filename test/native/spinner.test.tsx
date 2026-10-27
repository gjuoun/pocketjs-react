import { afterEach, expect, test } from "bun:test";
import { View } from "../../src/index.ts";
import { Spinner, type SpinnerSize, SPINNER_STEPS, SPINNER_STEP_FRAMES } from "../../src/native/spinner.tsx";
import { ThemeProvider } from "../../src/native/theme.tsx";
import { THEMES, TOKENS } from "../../src/native/tokens.ts";
import { harness, ROOT } from "./support.ts";

const h = harness();
afterEach(() => h.dispose());
const PAGE = "#ffffff";
const INK = "#0f172a";

/** The ring's box: the bounding box of the ring colour on the screen (one spinner per test). */
function ring(ink = INK) {
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = 0; y < 272; y++) for (let x = 0; x < 480; x++) if (h.core.pixel(x, y) === ink) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, cx: x0 + (x1 - x0 + 1) / 2, cy: y0 + (y1 - y0 + 1) / 2 };
}

/** Clockwise angle from 12 o'clock of the ring's ink centroid. */
function centroidAngle(ink = INK): number {
  const r = ring(ink);
  let sx = 0, sy = 0, n = 0;
  for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (h.core.pixel(x, y) === ink) { sx += x + 0.5 - r.cx; sy += y + 0.5 - r.cy; n++; }
  return (Math.atan2(sx / n, -(sy / n)) * 180 / Math.PI + 360) % 360;
}

const SIZES: Array<[SpinnerSize, number, number]> = [["sm", 16, 2], ["md", 24, 3], ["lg", 32, 4]];
for (const [size, px, width] of SIZES) {
  test(size + " spinner is a " + px + " px ring, " + width + " px thick, with its gap at the top left at step 0", async () => {
    await h.boot(() => <View className={ROOT}><Spinner size={size} /></View>);
    const r = ring();
    expect(Math.abs(r.w - px)).toBeLessThanOrEqual(1);
    expect(Math.abs(r.h - px)).toBeLessThanOrEqual(1);
    expect(h.core.pixel(Math.floor(r.cx), Math.floor(r.cy))).toBe(PAGE);
    expect(h.core.pixel(Math.floor(r.cx), r.y + 1)).toBe(INK);
    expect(h.core.pixel(Math.floor(r.cx), r.y + r.h - 2)).toBe(INK);
    const gap = Math.floor(r.cx - r.w * 0.36);
    expect(h.core.pixel(gap, Math.floor(r.cy - r.h * 0.36))).toBe(PAGE);
    const row = Math.floor(r.cy);
    let run = 0;
    for (let x = r.x + r.w - 1; x >= r.x && h.core.pixel(x, row) === INK; x--) run++;
    expect(Math.abs(run - width)).toBeLessThanOrEqual(1);
  });
}

test("the arc advances one 45-degree step every " + SPINNER_STEP_FRAMES + " frames, one revolution in " + SPINNER_STEPS + " steps", async () => {
  await h.boot(() => <View className={ROOT}><Spinner size="lg" /></View>);
  const changes: number[] = [];
  let last = centroidAngle();
  let lastChangeFrame = -1;
  const frames = SPINNER_STEP_FRAMES * SPINNER_STEPS;
  const cadence: number[] = [];
  for (let f = 0; f < frames; f++) {
    h.core.step(0);
    h.core.render();
    const a = centroidAngle();
    const moved = Math.abs(((a - last + 540) % 360) - 180) > 8;
    if (moved) { changes.push(a); if (lastChangeFrame >= 0) cadence.push(f - lastChangeFrame); lastChangeFrame = f; }
    last = a;
  }
  // Eight steps in forty frames: one arc move per step, each step held for SPINNER_STEP_FRAMES frames.
  expect(changes.length).toBe(SPINNER_STEPS);
  for (const c of cadence) expect(c).toBe(SPINNER_STEP_FRAMES);
  // Each move is 45 degrees clockwise (the centroid is within 15 degrees of the ideal).
  for (let i = 1; i < changes.length; i++) {
    const d = ((changes[i] - changes[i - 1] + 360) % 360);
    expect(Math.abs(d - 45)).toBeLessThanOrEqual(15);
  }
  // After a full revolution the arc is back where it started.
  const start = 135;
  expect(Math.abs(((centroidAngle() - start + 540) % 360) - 180)).toBeLessThanOrEqual(15);
});

test("the dark theme draws the ring in white", async () => {
  await h.boot(() => <ThemeProvider theme="dark"><View className={THEMES.dark["theme.page"]}><Spinner size="md" /></View></ThemeProvider>);
  const r = ring("#ffffff");
  expect(Math.abs(r.w - 24)).toBeLessThanOrEqual(1);
});

test("every size has a token for every step, in both themes (structure)", () => {
  for (const s of ["sm", "md", "lg"]) for (let k = 0; k < SPINNER_STEPS; k++) {
    expect(TOKENS[("spinner." + s + "." + k) as keyof typeof TOKENS]).toBeDefined();
    expect(THEMES.dark[("spinner." + s + "." + k) as keyof typeof TOKENS]).toMatch(/bg-white$/);
  }
});
