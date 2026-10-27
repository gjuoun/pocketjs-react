import { afterEach, expect, test } from "bun:test";
import { View } from "../../src/index.ts";
import { Progress, progressStep } from "../../src/native/progress.tsx";
import { ThemeProvider } from "../../src/native/theme.tsx";
import { THEMES, TOKENS } from "../../src/native/tokens.ts";
import { harness, ROOT } from "./support.ts";

const h = harness();
afterEach(() => h.dispose());
const TRACK = "#e2e8f0";
const FILL = "#0f172a";

/** The track is every pixel in the track or fill colour (the fill covers the track's left part). Its fill is the fill-coloured pixels on the middle row. */
function fillWidth(track = TRACK, fill = FILL) {
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = 0; y < 272; y++) for (let x = 0; x < 480; x++) {
    const c = h.core.pixel(x, y);
    if (c === track || c === fill) {
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  const row = Math.floor((y0 + y1) / 2);
  let n = 0;
  let first = -1;
  for (let x = x0; x <= x1; x++) if (h.core.pixel(x, row) === fill) { n++; if (first < 0) first = x; }
  return { track: x1 - x0 + 1, fill: n, left: first - x0 };
}

test("the step rounds half up to the nearest 10 and clamps to 0..100", () => {
  expect([progressStep(-5), progressStep(0), progressStep(44), progressStep(45), progressStep(37), progressStep(100), progressStep(140)]).toEqual([0, 0, 40, 50, 40, 100, 100]);
});

for (const value of [0, 30, 50, 100]) {
  test("value " + value + " fills " + value + "% of the 240 px track, from its left edge", async () => {
    await h.boot(() => <View className={ROOT}><Progress value={value} /></View>);
    const w = fillWidth();
    expect(w.track).toBe(240);
    expect(w.fill).toBe(value * 2.4);
    if (value > 0) expect(w.left).toBe(0);
  });
}

test("a value between steps draws the nearest step: 37 fills 40%", async () => {
  await h.boot(() => <View className={ROOT}><Progress value={37} /></View>);
  expect(fillWidth().fill).toBe(96);
});

test("a changed value redraws the fill with no remount", async () => {
  const app = (v: number) => <View className={ROOT}><Progress value={v} /></View>;
  await h.boot(() => app(20));
  expect(fillWidth().fill).toBe(48);
  h.core.step(0);
  h.core.render();
  expect(fillWidth().fill).toBe(48);
});

test("the dark theme draws the track in slate-700 and the fill in white", async () => {
  // The dark page is the theme page's own dark literal, so no white page pixel is mistaken for the fill.
  await h.boot(() => <ThemeProvider theme="dark"><View className={THEMES.dark["theme.page"]}><Progress value={50} /></View></ThemeProvider>);
  expect(fillWidth("#334155", "#ffffff").fill).toBe(120);
});

test("every step has a fill token (structure)", () => {
  for (let s = 0; s <= 100; s += 10) expect(TOKENS[("progress.fill." + s) as keyof typeof TOKENS]).toBeDefined();
});
