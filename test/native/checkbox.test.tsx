import { afterEach, expect, test } from "bun:test";
import { BTN } from "@pocketjs/framework/input";
import { useState } from "react";
import { View } from "../../src/index.ts";
import { Checkbox } from "../../src/native/checkbox.tsx";
import { ThemeProvider } from "../../src/native/theme.tsx";
import { THEMES, TOKENS } from "../../src/native/tokens.ts";
import { harness, ROOT } from "./support.ts";

const h = harness();
afterEach(() => h.dispose());
const PAGE = "#ffffff";
const BORDER = "#64748b";
const INK = "#0f172a";

/** The bounding box of one colour on the screen (the box in a test that draws one checkbox without a label). */
function bboxOf(colour: string) {
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = 0; y < 272; y++) for (let x = 0; x < 480; x++) if (h.core.pixel(x, y) === colour) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** How many pixels of one colour lie inside the box (its tick, dash or fill). */
function countIn(box: { x: number; y: number; w: number; h: number }, colour: string): number {
  let n = 0;
  for (let y = box.y + 3; y < box.y + box.h - 3; y++) for (let x = box.x + 3; x < box.x + box.w - 3; x++) if (h.core.pixel(x, y) === colour) n++;
  return n;
}

/** The bounding box of the white pixels inside the box (the tick or the dash). */
function markIn(box: { x: number; y: number; w: number; h: number }) {
  let n = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = box.y + 3; y < box.y + box.h - 3; y++) for (let x = box.x + 3; x < box.x + box.w - 3; x++) if (h.core.pixel(x, y) === PAGE) {
    n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return { n, x0, y0, x1, y1 };
}

test("unchecked: a 20 px box with a slate-500 border and an empty white interior", async () => {
  await h.boot(() => <View className={ROOT}><Checkbox checked={false} /></View>);
  const b = bboxOf(BORDER);
  expect(b.w).toBe(20);
  expect(b.h).toBe(20);
  expect(h.core.pixel(b.x + 10, b.y + 10)).toBe(PAGE);
  expect(countIn(b, INK)).toBe(0);
});

test("checked: a slate-900 box with a white tick whose short arm is low left and long arm high right", async () => {
  await h.boot(() => <View className={ROOT}><Checkbox checked /></View>);
  const b = bboxOf(INK);
  expect(b.w).toBe(20);
  expect(b.h).toBe(20);
  // The corners of the box are the fill, not the tick.
  expect(h.core.pixel(b.x + 3, b.y + 3)).toBe(INK);
  const m = markIn(b);
  // The tick spans the middle of the box: the long arm reaches the upper right, the short arm the lower left.
  expect(m.n).toBeGreaterThanOrEqual(20);
  expect(m.x0 - b.x).toBeLessThanOrEqual(7);
  expect(m.x1 - b.x).toBeGreaterThanOrEqual(13);
  expect(m.y0 - b.y).toBeLessThanOrEqual(7);
  expect(m.y1 - b.y).toBeGreaterThanOrEqual(12);
  // The tick is not a dash: its middle row has at most a few white pixels, its upper right has the long arm.
  expect(h.core.pixel(b.x + 12, b.y + 8)).toBe(PAGE);
  expect(h.core.pixel(b.x + 6, b.y + 11)).toBe(PAGE);
});

test("indeterminate: a white dash across the middle row, and no tick", async () => {
  await h.boot(() => <View className={ROOT}><Checkbox checked="indeterminate" /></View>);
  const b = bboxOf(INK);
  const m = markIn(b);
  expect(m.n).toBeGreaterThanOrEqual(12);
  expect(m.y1 - m.y0 + 1).toBeLessThanOrEqual(3);
  expect(m.x1 - m.x0 + 1).toBeGreaterThanOrEqual(7);
});

test("CIRCLE on the row toggles a controlled checkbox: unchecked reports true, checked reports false", async () => {
  const calls: boolean[] = [];
  function App() {
    const [on, setOn] = useState(false);
    return <View className={ROOT}><Checkbox checked={on} onCheckedChange={(v) => { calls.push(v); setOn(v); }}>Accept</Checkbox></View>;
  }
  await h.boot(() => <App />);
  h.core.press(BTN.DOWN);
  h.core.press(BTN.CIRCLE);
  expect(calls).toEqual([true]);
  h.core.press(BTN.CIRCLE);
  expect(calls).toEqual([true, false]);
});

test("controlled: with checked held at false a press reports true and the box stays empty", async () => {
  const calls: boolean[] = [];
  await h.boot(() => <View className={ROOT}><Checkbox checked={false} onCheckedChange={(v) => calls.push(v)}>Hold</Checkbox></View>);
  h.core.press(BTN.DOWN);
  h.core.press(BTN.CIRCLE);
  expect(calls).toEqual([true]);
  expect(countIn(bboxOf(BORDER), INK)).toBe(0);
});

test("an indeterminate press reports true", async () => {
  const calls: boolean[] = [];
  await h.boot(() => <View className={ROOT}><Checkbox checked="indeterminate" onCheckedChange={(v) => calls.push(v)}>All</Checkbox></View>);
  h.core.press(BTN.DOWN);
  h.core.press(BTN.CIRCLE);
  expect(calls).toEqual([true]);
});

test("disabled: no focus and no press; a disabled checked box is slate-500", async () => {
  const calls: boolean[] = [];
  await h.boot(() => <View className={ROOT}><Checkbox checked disabled onCheckedChange={(v) => calls.push(v)} /></View>);
  h.core.press(BTN.DOWN);
  h.core.press(BTN.CIRCLE);
  expect(calls).toEqual([]);
  expect(bboxOf("#64748b").w).toBe(20);
});

test("the dark theme draws a checked box as white with a slate-900 tick", async () => {
  await h.boot(() => <ThemeProvider theme="dark"><View className={THEMES.dark["theme.page"]}><Checkbox checked /></View></ThemeProvider>);
  const b = bboxOf("#ffffff");
  expect(b.w).toBe(20);
  // The box is white and its tick is slate-900: the tick is the ink inside the box.
  expect(countIn(b, INK)).toBeGreaterThanOrEqual(20);
  expect(h.core.pixel(b.x + 3, b.y + 3)).toBe(PAGE);
});

test("every state has its tokens in both themes (structure)", () => {
  for (const k of ["checkbox.row", "checkbox.box", "checkbox.box.off", "checkbox.box.on", "checkbox.box.disabled", "checkbox.box.disabled.on", "checkbox.mark.short", "checkbox.mark.long", "checkbox.dash", "checkbox.label.rest", "checkbox.label.disabled"]) {
    expect(TOKENS[k as keyof typeof TOKENS]).toBeDefined();
    expect(THEMES.dark[k as keyof typeof TOKENS]).toBeDefined();
  }
});
