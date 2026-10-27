import { afterEach, expect, test } from "bun:test";
import { View } from "../../src/index.ts";
import { Skeleton } from "../../src/native/skeleton.tsx";
import { ThemeProvider } from "../../src/native/theme.tsx";
import { THEMES, TOKENS } from "../../src/native/tokens.ts";
import { harness, ROOT } from "./support.ts";

const h = harness();
afterEach(() => h.dispose());
const PAGE = "#ffffff";
const FILL = "#e2e8f0";

/** The pixels of a fill colour: bounding box and count. */
function boxOf(fill: string) {
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, n = 0;
  for (let y = 0; y < 272; y++) for (let x = 0; x < 480; x++) {
    const c = h.core.pixel(x, y);
    if (c === PAGE) continue;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; n++;
  }
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, n, fill };
}

test("a line is full width and 16 px high", async () => {
  await h.boot(() => <View className={ROOT}><Skeleton /></View>);
  const b = boxOf(FILL);
  expect(b.w).toBe(480);
  expect(b.h).toBe(16);
});

test("a short line is 120 px wide", async () => {
  await h.boot(() => <View className={ROOT}><Skeleton shape="short" /></View>);
  expect(boxOf(FILL).w).toBe(120);
});

test("a circle is 40 px and its corners are the page", async () => {
  await h.boot(() => <View className={ROOT}><Skeleton shape="circle" /></View>);
  const b = boxOf(FILL);
  expect(b.w).toBe(40);
  expect(b.h).toBe(40);
  expect(h.core.pixel(b.x, b.y)).toBe(PAGE);
});

/** Every JS-to-core call except the reads the test itself makes. */
function countWrites(): { count: () => number } {
  const ops = h.core.ops as unknown as Record<string, unknown>;
  const reads = new Set(["captureTexts", "capturedTexts", "nodeRect", "render", "tick", "debugInspect", "debugRectXY", "debugRectWH"]);
  let n = 0;
  for (const k of Object.keys(ops)) {
    const f = ops[k];
    if (typeof f !== "function" || reads.has(k)) continue;
    ops[k] = (...args: unknown[]) => { n++; return (f as (...a: unknown[]) => unknown).apply(ops, args); };
  }
  return { count: () => n };
}

test("the pulse changes the drawn colour over frames, within the opacity band 0.5 to 1", async () => {
  await h.boot(() => <View className={ROOT}><Skeleton /></View>);
  const seen = new Set<string>();
  for (let f = 0; f < 120; f++) { h.core.step(0); h.core.render(); seen.add(h.core.pixel(240, 8)); }
  expect(seen.size).toBeGreaterThan(4);
  for (const c of seen) {
    const r = parseInt(c.slice(1, 3), 16);
    // slate-200 red is 226; at half opacity over white it is 240.5. The band is 226..241, with a 2-step tolerance.
    expect(r).toBeGreaterThanOrEqual(224);
    expect(r).toBeLessThanOrEqual(242);
  }
});

test("the pulse is native: no JS-to-core writes while it runs", async () => {
  await h.boot(() => <View className={ROOT}><Skeleton /></View>);
  for (let f = 0; f < 10; f++) { h.core.step(0); h.core.render(); }
  const w = countWrites();
  for (let f = 0; f < 60; f++) { h.core.step(0); h.core.render(); }
  expect(w.count()).toBe(0);
});

test("the dark theme pulses a slate-700 block", async () => {
  await h.boot(() => <ThemeProvider theme="dark"><View className={THEMES.dark["theme.page"]}><Skeleton /></View></ThemeProvider>);
  expect(h.core.pixel(240, 8)).toMatch(/^#[0-9a-f]{6}$/);
  const r = parseInt(h.core.pixel(240, 8).slice(1, 3), 16);
  expect(r).toBeLessThanOrEqual(0x33 + 2);
  expect(r).toBeGreaterThanOrEqual(0x0f);
});

test("every shape has a token (structure)", () => {
  for (const s of ["line", "short", "circle"]) expect(TOKENS[("skeleton." + s) as keyof typeof TOKENS]).toBeDefined();
});
