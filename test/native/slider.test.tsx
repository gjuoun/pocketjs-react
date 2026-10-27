import { afterEach, expect, test } from "bun:test";
import { BTN } from "@pocketjs/framework/input";
import { useState } from "react";
import { View } from "../../src/index.ts";
import { rootMirror, type NodeMirror } from "../../src/internal/pocket.ts";
import { geometryFor, walk, type Rect } from "../../tools/qa/acceptance/geometry.ts";
import { Slider, sliderStop, stopAtX } from "../../src/native/slider.tsx";
import { ThemeProvider } from "../../src/native/theme.tsx";
import { THEMES, TOKENS } from "../../src/native/tokens.ts";
import { harness, ROOT } from "./support.ts";

// Pixel colours are overlay-only: the stock core paints a focus wash over the first focusable at boot.
const OVERLAY = !!process.env.POCKETJS_CORE_ROOT;

const h = harness();
afterEach(() => { h.dispose(); (globalThis as { __pocketPointer?: unknown[] }).__pocketPointer = []; });

function nodeNamed(name: string): NodeMirror | undefined {
  let found: NodeMirror | undefined;
  walk(rootMirror, (n) => { if (!found && n.debugName === name) found = n; });
  return found;
}
function rectOf(name: string): Rect {
  const n = nodeNamed(name);
  if (!n) throw new Error("no node " + name);
  const r = geometryFor(h.core).rect(n);
  if (!r) throw new Error("no rect for " + name);
  return r;
}
function frames(n: number) { for (let i = 0; i < n; i++) { h.core.step(0); h.core.render(); } }

test("the stop mapping: values round half up to the nearest 10 and clamp to 0..100", () => {
  expect(sliderStop(4)).toBe(0);
  expect(sliderStop(5)).toBe(10);
  expect(sliderStop(44)).toBe(40);
  expect(sliderStop(95)).toBe(100);
  expect(sliderStop(-20)).toBe(0);
  expect(sliderStop(150)).toBe(100);
});

test("the pointer maps an x on the track to the thumb centre's stop", () => {
  // The track starts at 100: the thumb centre at stop 50 is 100 + 8 + 90.
  expect(stopAtX(100 + 8 + 90, 100)).toBe(50);
  expect(stopAtX(0, 100)).toBe(0);
  expect(stopAtX(9999, 100)).toBe(100);
});

for (const [value, offset] of [[0, 0], [50, 90], [100, 180]] as const) {
  test("the thumb sits " + offset + " px into the 180 px travel at value " + value + " (layout)", async () => {
    await h.boot(() => <View className={ROOT}><Slider value={value}>Volume</Slider></View>);
    const t = rectOf("slider-track");
    const thumb = rectOf("slider-thumb");
    expect(t.w).toBe(196);
    expect(thumb.x - t.x).toBe(offset);
    expect(thumb.w).toBe(16);
  });
}

test("at the maximum the thumb's right edge is the track's right edge; the fill ends at the thumb centre", async () => {
  await h.boot(() => <View className={ROOT}><Slider value={100}>Volume</Slider></View>);
  const t = rectOf("slider-track");
  const thumb = rectOf("slider-thumb");
  const fill = rectOf("slider-fill");
  expect(thumb.x + thumb.w - (t.x + t.w)).toBe(0);
  expect(fill.w).toBe(188);
});

test("RIGHT and LEFT step the value by 10 and clamp at 0 and 100", async () => {
  const log: number[] = [];
  function App() {
    const [v, setV] = useState(0);
    return <View className={ROOT}><Slider value={v} onValueChange={(n) => { log.push(n); setV(n); }}>Volume</Slider></View>;
  }
  await h.boot(() => <App />);
  h.core.press(BTN.DOWN);
  h.core.press(BTN.RIGHT);
  h.core.press(BTN.RIGHT);
  expect(log).toEqual([10, 20]);
  h.core.press(BTN.LEFT);
  expect(log).toEqual([10, 20, 10]);
  for (let i = 0; i < 12; i++) h.core.press(BTN.RIGHT);
  expect(log[log.length - 1]).toBe(100);
  h.core.press(BTN.RIGHT);
  expect(log[log.length - 1]).toBe(100);
});

test("the thumb moves through intermediate positions after an arrow step (the core's layout transition)", async () => {
  function App() {
    const [v, setV] = useState(0);
    return <View className={ROOT}><Slider value={v} onValueChange={setV}>Volume</Slider></View>;
  }
  await h.boot(() => <App />);
  const start = rectOf("slider-thumb").x;
  h.core.press(BTN.DOWN);
  const xs: number[] = [];
  h.core.step(BTN.RIGHT); h.core.render();
  xs.push(rectOf("slider-thumb").x - start);
  for (let f = 0; f < 16; f++) { h.core.step(0); h.core.render(); xs.push(rectOf("slider-thumb").x - start); }
  const mid = xs.filter((d) => d > 0 && d < 18);
  expect(mid.length).toBeGreaterThanOrEqual(3);
  expect(xs[xs.length - 1]).toBe(18);
});

test("a press and drag on the track sets the value under the pointer, and clamps past both ends", async () => {
  const log: number[] = [];
  function App() {
    const [v, setV] = useState(0);
    return <View className={ROOT}><Slider value={v} onValueChange={(n) => { log.push(n); setV(n); }}>Volume</Slider></View>;
  }
  await h.boot(() => <App />);
  const t = rectOf("slider-track");
  const g = globalThis as { __pocketPointer?: Array<{ x: number; y: number; down: boolean }> };
  const y = t.y + 8;
  g.__pocketPointer = [{ x: t.x + 8 + 90, y, down: true }];
  frames(2);
  expect(log[log.length - 1]).toBe(50);
  g.__pocketPointer = [{ x: t.x + 8 + 150, y, down: true }, { x: t.x + 8 + 150, y, down: false }];
  frames(3);
  expect(log[log.length - 1]).toBe(80);
  // Past the right end of the track (still on the row): the stop clamps at 100.
  g.__pocketPointer = [{ x: t.x + 196, y, down: true }];
  frames(2);
  expect(log[log.length - 1]).toBe(100);
  // Past the left end (still on the row, left of the track): the stop clamps at 0.
  g.__pocketPointer = [{ x: t.x - 40, y, down: true }, { x: t.x - 40, y, down: false }];
  frames(3);
  expect(log[log.length - 1]).toBe(0);
});

test("controlled: a fixed value reports the step and the thumb stays where the value says", async () => {
  const log: number[] = [];
  await h.boot(() => <View className={ROOT}><Slider value={20} onValueChange={(n) => log.push(n)}>Volume</Slider></View>);
  h.core.press(BTN.DOWN);
  h.core.press(BTN.RIGHT);
  expect(log).toEqual([30]);
  expect(rectOf("slider-thumb").x - rectOf("slider-track").x).toBe(36);
});

test("the dark theme draws the bar in slate-700", async () => {
  await h.boot(() => <ThemeProvider theme="dark"><View className={THEMES.dark["theme.page"]}><Slider value={50}>Volume</Slider></View></ThemeProvider>);
  const t = rectOf("slider-track");
  if (OVERLAY) expect(h.core.pixel(t.x + 150, t.y + 8)).toBe("#334155");
});

test("every slider token exists in both themes for every stop (structure)", () => {
  for (const k of ["slider.root", "slider.focus", "slider.label", "slider.value", "slider.track", "slider.bar"]) {
    expect(TOKENS[k as keyof typeof TOKENS]).toBeDefined();
  }
  for (let s = 0; s <= 10; s++) {
    expect(TOKENS[("slider.fill." + s) as keyof typeof TOKENS]).toBeDefined();
    expect(TOKENS[("slider.thumb." + s) as keyof typeof TOKENS]).toBeDefined();
    expect(THEMES.dark[("slider.thumb." + s) as keyof typeof TOKENS]).toBeDefined();
  }
});
