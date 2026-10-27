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

test("one revolution is " + SPINNER_STEPS * SPINNER_STEP_FRAMES + " frames: the ring first repeats its pixels after that many frames (1.5 s at 60 Hz)", async () => {
  await h.boot(() => <View className={ROOT}><Spinner size="lg" /></View>);
  // The ring window (the lg box, 32 px) as a signature of its pixels, one per frame, over two revolutions.
  const box = ring();
  const sig = (): string => {
    h.core.render();
    let s = "";
    for (let y = box.y; y < box.y + box.h; y++) for (let x = box.x; x < box.x + box.w; x++) s += h.core.pixel(x, y) === INK ? "1" : "0";
    return s;
  };
  const frames = SPINNER_STEPS * SPINNER_STEP_FRAMES * 2;
  const states: string[] = [sig()];
  for (let f = 1; f <= frames; f++) { h.core.step(0); states.push(sig()); }
  // The frames between two identical arc states: the frame a state first shows (an onset) to the next onset of the same
  // state. The boot frames before the test start shift every onset equally, so the difference is the period.
  const onsets: number[] = [];
  for (let f = 1; f < states.length; f++) if (states[f] !== states[f - 1]) onsets.push(f);
  const first = onsets[0];
  const again = onsets.find((f, i) => i > 0 && states[f] === states[first]);
  const period = (again ?? -1) - first;
  expect(period).toBe(SPINNER_STEPS * SPINNER_STEP_FRAMES);
  expect(period / 60).toBe(1.5);
  // Every frame is one of SPINNER_STEPS distinct arcs, each held SPINNER_STEP_FRAMES frames.
  const runs: number[] = [];
  let run = 1;
  for (let f = 1; f < SPINNER_STEPS * SPINNER_STEP_FRAMES + 1; f++) {
    if (states[f] === states[f - 1]) run++; else { runs.push(run); run = 1; }
  }
  for (const r of runs.slice(1)) expect(r).toBe(SPINNER_STEP_FRAMES);
  expect(new Set(states.slice(0, period)).size).toBe(SPINNER_STEPS);
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
