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

/** The non-page box of the drawn shape. */
function boxOf() {
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = 0; y < 272; y++) for (let x = 0; x < 480; x++) {
    if (h.core.pixel(x, y) === PAGE) continue;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

test("a line is full width and 16 px high", async () => {
  await h.boot(() => <View className={ROOT}><Skeleton /></View>);
  const b = boxOf();
  expect(b.w).toBe(480);
  expect(b.h).toBe(16);
  expect(h.core.pixel(240, 8)).toBe(FILL);
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

test("static by decision: the drawn colour is the same over 120 frames and the core is written nothing", async () => {
  await h.boot(() => <View className={ROOT}><Skeleton /></View>);
  const seen = new Set<string>();
  const ops = h.core.ops as unknown as Record<string, unknown>;
  let writes = 0;
  const reads = new Set(["captureTexts", "capturedTexts", "nodeRect", "render", "tick", "debugInspect", "debugRectXY", "debugRectWH"]);
  for (const k of Object.keys(ops)) {
    const f = ops[k];
    if (typeof f !== "function" || reads.has(k)) continue;
    ops[k] = (...args: unknown[]) => { writes++; return (f as (...a: unknown[]) => unknown).apply(ops, args); };
  }
  for (let f = 0; f < 120; f++) { h.core.step(0); h.core.render(); seen.add(h.core.pixel(240, 8)); }
  expect([...seen]).toEqual([FILL]);
  expect(writes).toBe(0);
});

test("the dark theme draws a slate-700 block", async () => {
  await h.boot(() => <ThemeProvider theme="dark"><View className={THEMES.dark["theme.page"]}><Skeleton /></View></ThemeProvider>);
  expect(h.core.pixel(240, 8)).toBe("#334155");
});

test("every shape has a token (structure)", () => {
  for (const s of ["line", "short", "circle"]) expect(TOKENS[("skeleton." + s) as keyof typeof TOKENS]).toBeDefined();
});
