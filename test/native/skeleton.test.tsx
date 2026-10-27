import { afterEach, expect, test } from "bun:test";
import { View } from "../../src/index.ts";
import { PULSE_FRAMES, Skeleton } from "../../src/native/skeleton.tsx";
import { ThemeProvider } from "../../src/native/theme.tsx";
import { THEMES, TOKENS } from "../../src/native/tokens.ts";
import { harness, ROOT } from "./support.ts";

const h = harness();
afterEach(() => h.dispose());
const PAGE = "#ffffff";
const FILL = "#e2e8f0";
/** The fill at 40% opacity over white: the lo phase. */
const LO = "#f3f6f9";

/** The non-page box of the drawn shape. */
function boxOf() {
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = 0; y < 272; y++) for (let x = 0; x < 480; x++) {
    if (h.core.pixel(x, y) === PAGE) continue;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

function channels(hex: string): number[] { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }

test("a line is full width and 16 px high", async () => {
  await h.boot(() => <View className={ROOT}><Skeleton /></View>);
  const b = boxOf();
  expect(b.w).toBe(480);
  expect(b.h).toBe(16);
});

test("a short line is 120 px wide", async () => {
  await h.boot(() => <View className={ROOT}><Skeleton shape="short" /></View>);
  expect(boxOf().w).toBe(120);
});

test("a circle is 40 px and its corners are the page", async () => {
  await h.boot(() => <View className={ROOT}><Skeleton shape="circle" /></View>);
  const b = boxOf();
  expect(b.w).toBe(40);
  expect(b.h).toBe(40);
  expect(h.core.pixel(b.x, b.y)).toBe(PAGE);
});

test("pulse: the fill moves between the hi and lo phases through the core's own interpolation", async () => {
  await h.boot(() => <View className={ROOT}><Skeleton /></View>);
  const ops = h.core.ops as unknown as Record<string, unknown>;
  let writes = 0;
  const reads = new Set(["captureTexts", "capturedTexts", "nodeRect", "render", "tick", "debugInspect", "debugRectXY", "debugRectWH", "pixel"]);
  for (const k of Object.keys(ops)) {
    const f = ops[k];
    if (typeof f !== "function" || reads.has(k)) continue;
    ops[k] = (...args: unknown[]) => { writes++; return (f as (...a: unknown[]) => unknown).apply(ops, args); };
  }
  const frames = PULSE_FRAMES * 4;
  const seen = new Set<string>();
  const seq: string[] = [];
  for (let f = 0; f < frames; f++) { h.core.step(0); h.core.render(); const p = h.core.pixel(240, 8); seq.push(p); seen.add(p); }
  // Both ends are drawn: the hi phase is the token colour, the lo phase is the colour at 40% opacity.
  expect(seq).toContain(FILL);
  const lo = seq.reduce((a, b) => (channels(b)[0] > channels(a)[0] ? b : a));
  for (let c = 0; c < 3; c++) expect(Math.abs(channels(lo)[c] - channels(LO)[c])).toBeLessThanOrEqual(3);
  // The core interpolates: many distinct values between the two phases, each frame one step from the last.
  expect(seen.size).toBeGreaterThan(10);
  for (let i = 1; i < seq.length; i++) expect(Math.abs(channels(seq[i])[0] - channels(seq[i - 1])[0])).toBeLessThanOrEqual(12);
  // React writes at the phase changes only (four in these frames), not once a frame.
  expect(writes).toBeGreaterThan(0);
  expect(writes).toBeLessThan(frames);
});

test("the dark theme pulses a slate-700 block", async () => {
  await h.boot(() => <ThemeProvider theme="dark"><View className={THEMES.dark["theme.page"]}><Skeleton /></View></ThemeProvider>);
  expect(h.core.pixel(240, 8)).toBe("#334155");
});

test("every shape has a hi and a lo token (structure)", () => {
  for (const s of ["line", "short", "circle"]) for (const p of ["hi", "lo"]) {
    expect(TOKENS[("skeleton." + s + "." + p) as keyof typeof TOKENS]).toMatch(/transition-opacity duration-500/);
  }
});
