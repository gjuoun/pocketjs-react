import { afterEach, expect, test } from "bun:test";
import { View } from "../../src/index.ts";
import { Spinner, type SpinnerSize } from "../../src/native/spinner.tsx";
import { ThemeProvider } from "../../src/native/theme.tsx";
import { THEMES, TOKENS } from "../../src/native/tokens.ts";
import { harness, ROOT } from "./support.ts";

const h = harness();
afterEach(() => h.dispose());
const PAGE = "#ffffff";
const INK = "#0f172a";
/** One revolution at the 60 Hz tick (1.5 s). */
const PERIOD_FRAMES = 90;
/** The mutant: the same ring with its timeline removed (the class string the build would carry without the animation). */
const still = (size: SpinnerSize) => (TOKENS as Record<string, string>)["spinner." + size].replace(" animate-spin-arc", "");

/** The ring's box: the bounding box of the ink on the screen (one spinner per test). */
function ring(ink = INK) {
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = 0; y < 272; y++) for (let x = 0; x < 480; x++) if (h.core.pixel(x, y) === ink) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, cx: x0 + (x1 - x0 + 1) / 2, cy: y0 + (y1 - y0 + 1) / 2 };
}

/** The ring window as a signature of its pixels, one character per pixel, drawn on the last render. */
function mask(box: { x: number; y: number; w: number; h: number }): string {
  h.core.render();
  let s = "";
  for (let y = box.y; y < box.y + box.h; y++) for (let x = box.x; x < box.x + box.w; x++) s += h.core.pixel(x, y) === INK ? "1" : "0";
  return s;
}

/** The signature before the first step (index 0), then after each of `frames` core ticks (index f = after f frames). */
function frameMasks(frames: number): string[] {
  const box = ring();
  const out = [mask(box)];
  for (let f = 0; f < frames; f++) { h.core.step(0); out.push(mask(box)); }
  return out;
}

/** The arc gates over a run of frames: orientations in one second, the longest identical run, and the revolution. */
function arcGates(masks: string[]) {
  const orientations = new Set(masks.slice(1, 61)).size;
  let longest = 1, run = 1;
  for (let f = 2; f < masks.length; f++) { run = masks[f] === masks[f - 1] ? run + 1 : 1; if (run > longest) longest = run; }
  let period = -1;
  for (let f = 1; f < masks.length; f++) if (masks[f] === masks[0]) { period = f; break; }
  return { orientations, longest, period, seconds: period / 60 };
}

const SIZES: Array<[SpinnerSize, number, number]> = [["sm", 16, 2], ["md", 24, 3], ["lg", 32, 4]];
for (const [size, px, width] of SIZES) {
  test(size + " spinner is a " + px + " px ring, " + width + " px thick, with its gap at the top left at the first frame", async () => {
    // The boot steps two frames: the arc start is then about 8 degrees, so the gap (278 to 368 degrees) is at the top left
    // and the arc covers 3 o'clock, 6 o'clock and 9 o'clock.
    await h.boot(() => <View className={ROOT}><Spinner size={size} /></View>);
    const r = ring();
    expect(Math.abs(r.w - px)).toBeLessThanOrEqual(1);
    expect(Math.abs(r.h - px)).toBeLessThanOrEqual(1);
    expect(h.core.pixel(Math.floor(r.cx), Math.floor(r.cy))).toBe(PAGE);
    const gap = Math.floor(r.cx - r.w * 0.36);
    expect(h.core.pixel(gap, Math.floor(r.cy - r.h * 0.36))).toBe(PAGE);
    expect(h.core.pixel(Math.floor(r.cx), r.y + r.h - 2)).toBe(INK);
    const row = Math.floor(r.cy);
    let run = 0;
    for (let x = r.x + r.w - 1; x >= r.x && h.core.pixel(x, row) === INK; x--) run++;
    expect(Math.abs(run - width)).toBeLessThanOrEqual(1);
  });
}

// The longest identical-frame run allowed per size. md and lg hold no frame. sm (16 px) repeats one frame at 8 points per
// revolution (measured: runs of 2, never 3): the 16 px raster does not change on every 4-degree step. Known exception, not a pass.
const HOLD_LIMIT: Record<SpinnerSize, number> = { sm: 2, md: 1, lg: 1 };

for (const [size] of SIZES) {
  test(size + " spinner turns: at least 55 orientations in one second (a 12-step ring shows 12)", async () => {
    await h.boot(() => <View className={ROOT}><Spinner size={size} /></View>);
    const g = arcGates(frameMasks(60));
    expect(g.orientations).toBeGreaterThanOrEqual(55);
  });

  test(size + " spinner holds at most " + HOLD_LIMIT[size] + " identical frame(s) in a row", async () => {
    await h.boot(() => <View className={ROOT}><Spinner size={size} /></View>);
    expect(arcGates(frameMasks(120)).longest).toBeLessThanOrEqual(HOLD_LIMIT[size]);
  });

  test(size + " spinner revolves in 1.5 s +- 0.1 s (the ring first repeats after " + PERIOD_FRAMES + " frames)", async () => {
    await h.boot(() => <View className={ROOT}><Spinner size={size} /></View>);
    const g = arcGates(frameMasks(PERIOD_FRAMES * 2));
    expect(g.period).toBe(PERIOD_FRAMES);
    expect(Math.abs(g.seconds - 1.5)).toBeLessThanOrEqual(0.1);
  });
}

test("mutant: a ring whose timeline is missing fails the orientation and hold gates", async () => {
  await h.boot(() => <View className={ROOT}><View className={still("lg")} /></View>, [still("lg")]);
  const g = arcGates(frameMasks(120));
  expect(g.orientations).toBeLessThan(55);
  expect(g.longest).toBeGreaterThan(HOLD_LIMIT.lg);
});

test("the dark theme draws the ring in white", async () => {
  await h.boot(() => <ThemeProvider theme="dark"><View className={THEMES.dark["theme.page"]}><Spinner size="md" /></View></ThemeProvider>);
  const r = ring("#ffffff");
  expect(Math.abs(r.w - 24)).toBeLessThanOrEqual(1);
});

test("every size has a turning token in both themes (structure)", () => {
  for (const s of ["sm", "md", "lg"]) {
    const key = "spinner." + s;
    expect(TOKENS[key as keyof typeof TOKENS]).toMatch(/ animate-spin-arc/);
    expect(TOKENS[key as keyof typeof TOKENS]).toMatch(/ arc-start-\[0\] /);
    expect(THEMES.dark[key as keyof typeof TOKENS]).toMatch(/bg-white animate-spin-arc$/);
  }
});
