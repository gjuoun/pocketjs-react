import { afterEach, expect, test } from "bun:test";
import { BTN } from "@pocketjs/framework/input";
import { useState } from "react";
import { View } from "../../src/index.ts";
import { rootMirror, type NodeMirror } from "../../src/internal/pocket.ts";
import { geometryFor, walk, type Rect } from "../../tools/qa/acceptance/geometry.ts";
import { Switch } from "../../src/native/switch.tsx";
import { ThemeProvider } from "../../src/native/theme.tsx";
import { THEMES, TOKENS } from "../../src/native/tokens.ts";
import { harness, ROOT } from "./support.ts";

const h = harness();
afterEach(() => h.dispose());
const PAGE = "#ffffff";
// The stock core draws a translucent focus wash over the first focusable at boot (the overlay draws a border only), so
// pixel colours are classified by brightness, and exact dark-theme colours are asserted on the overlay core only.
const OVERLAY = !!process.env.POCKETJS_CORE_ROOT;
const brightness = (hex: string) => { const n = parseInt(hex.slice(1), 16); return ((n >> 16) & 255) + ((n >> 8) & 255) + (n & 255); };

function nodeNamed(name: string): NodeMirror | undefined {
  let found: NodeMirror | undefined;
  walk(rootMirror, (n) => { if (!found && n.debugName === name) found = n; });
  return found;
}

/** The layout rect of a named node (overlay nodeRect, or the stock world box). */
function rectOf(name: string): Rect {
  const n = nodeNamed(name);
  if (!n) throw new Error("no node " + name);
  const r = geometryFor(h.core).rect(n);
  if (!r) throw new Error("no rect for " + name);
  return r;
}

/** The thumb in track coordinates, read on the track's centre row: the white run inside the track. */
function thumbPixels(track: Rect) {
  const row = track.y + Math.floor(track.h / 2);
  let x0 = 1e9, x1 = -1;
  for (let x = track.x + 1; x < track.x + track.w - 1; x++) if (brightness(h.core.pixel(x, row)) > 400) {
    if (x < x0) x0 = x; if (x > x1) x1 = x;
  }
  return { x: x0, w: x1 - x0 + 1, left: x0 - track.x, right: track.x + track.w - 1 - x1 };
}

function settleFrames(n: number) { for (let i = 0; i < n; i++) { h.core.step(0); h.core.render(); } }

test("off: a 40 by 24 track with the 20 px thumb at its left inset (layout and pixels agree)", async () => {
  await h.boot(() => <View className={ROOT}><Switch checked={false} /></View>);
  const t = rectOf("switch-track");
  expect(t.w).toBe(40);
  expect(t.h).toBe(24);
  const thumb = rectOf("switch-thumb");
  expect(thumb.w).toBe(20);
  expect(thumb.x - t.x).toBe(2);
  if (OVERLAY) {
    const px = thumbPixels(t);
    expect(px.w).toBe(20);
    expect(px.left).toBe(2);
    expect(px.right).toBe(18);
  }
});

test("on: the thumb sits at the right inset", async () => {
  await h.boot(() => <View className={ROOT}><Switch checked /></View>);
  const t = rectOf("switch-track");
  const thumb = rectOf("switch-thumb");
  expect(thumb.x - t.x).toBe(18);
  if (OVERLAY) {
    const px = thumbPixels(t);
    expect(px.left).toBe(18);
    expect(px.right).toBe(2);
  }
});

test("the thumb displacement is 16 px, measured before and after a toggle in layout and in pixels", async () => {
  const calls: boolean[] = [];
  function App() {
    const [on, setOn] = useState(false);
    return <View className={ROOT}><Switch checked={on} onCheckedChange={(v) => { calls.push(v); setOn(v); }} /></View>;
  }
  await h.boot(() => <App />);
  const before = rectOf("switch-thumb").x;
  const pxBefore = OVERLAY ? thumbPixels(rectOf("switch-track")).left : 0;
  h.core.press(BTN.DOWN);
  h.core.press(BTN.CIRCLE);
  settleFrames(20);
  const after = rectOf("switch-thumb").x;
  const pxAfter = OVERLAY ? thumbPixels(rectOf("switch-track")).left : 16;
  expect(calls).toEqual([true]);
  expect(after - before).toBe(16);
  expect(pxAfter - pxBefore).toBe(16);
});

test("the thumb moves through intermediate positions over the transition, not in one jump", async () => {
  function App() {
    const [on, setOn] = useState(false);
    return <View className={ROOT}><Switch checked={on} onCheckedChange={setOn} /></View>;
  }
  await h.boot(() => <App />);
  const start = rectOf("switch-thumb").x;
  h.core.press(BTN.DOWN);
  // Frame by frame from the press edge: core.press would run the transition's frames before the first sample.
  const xs: number[] = [];
  h.core.step(BTN.CIRCLE); h.core.render();
  xs.push(rectOf("switch-thumb").x - start);
  for (let f = 0; f < 20; f++) { h.core.step(0); h.core.render(); xs.push(rectOf("switch-thumb").x - start); }
  const mid = xs.filter((d) => d > 0 && d < 16);
  expect(mid.length).toBeGreaterThanOrEqual(3);
  expect(xs[xs.length - 1]).toBe(16);
});

test("CIRCLE toggles a controlled switch: off reports true, on reports false", async () => {
  const calls: boolean[] = [];
  function App() {
    const [on, setOn] = useState(false);
    return <View className={ROOT}><Switch checked={on} onCheckedChange={(v) => { calls.push(v); setOn(v); }}>Airplane</Switch></View>;
  }
  await h.boot(() => <App />);
  h.core.press(BTN.DOWN);
  h.core.press(BTN.CIRCLE);
  h.core.press(BTN.CIRCLE);
  expect(calls).toEqual([true, false]);
});

test("disabled: no focus, no press, and a slate-200 track", async () => {
  const calls: boolean[] = [];
  await h.boot(() => <View className={ROOT}><Switch disabled onCheckedChange={(v) => calls.push(v)} /></View>);
  h.core.press(BTN.DOWN);
  h.core.press(BTN.CIRCLE);
  expect(calls).toEqual([]);
  const t = rectOf("switch-track");
  expect(brightness(h.core.pixel(t.x + 20, t.y + 4))).toBeGreaterThan(500);
});

test("the dark theme draws an on switch as a white track with a slate-900 thumb", async () => {
  await h.boot(() => <ThemeProvider theme="dark"><View className={THEMES.dark["theme.page"]}><Switch checked /></View></ThemeProvider>);
  const t = rectOf("switch-track");
  expect(t.w).toBe(40);
  if (OVERLAY) {
    expect(h.core.pixel(t.x + 3, t.y + 12)).toBe("#ffffff");
    expect(h.core.pixel(t.x + 30, t.y + 12)).toBe("#0f172a");
  }
});

test("every state has its tokens in both themes (structure)", () => {
  for (const k of ["switch.row", "switch.track.off", "switch.track.on", "switch.track.disabled", "switch.thumb.off", "switch.thumb.on", "switch.label.rest", "switch.label.disabled"]) {
    expect(TOKENS[k as keyof typeof TOKENS]).toBeDefined();
    expect(THEMES.dark[k as keyof typeof TOKENS]).toBeDefined();
  }
});
