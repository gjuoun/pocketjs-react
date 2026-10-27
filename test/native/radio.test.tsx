import { afterEach, expect, test } from "bun:test";
import { BTN } from "@pocketjs/framework/input";
import { useState } from "react";
import { View } from "../../src/index.ts";
import { rootMirror, type NodeMirror } from "../../src/internal/pocket.ts";
import { geometryFor, walk, type Rect } from "../../tools/qa/acceptance/geometry.ts";
import { RadioGroup, RadioItem, stepIndex } from "../../src/native/radio.tsx";
import { ThemeProvider } from "../../src/native/theme.tsx";
import { THEMES, TOKENS } from "../../src/native/tokens.ts";
import { harness, ROOT } from "./support.ts";

// Pixel colours are overlay-only: the stock core paints a focus wash over the first focusable at boot.
const OVERLAY = !!process.env.POCKETJS_CORE_ROOT;

const h = harness();
afterEach(() => h.dispose());

function all(name: string): NodeMirror[] {
  const out: NodeMirror[] = [];
  walk(rootMirror, (n) => { if (n.debugName === name) out.push(n); });
  return out;
}
function rectOf(n: NodeMirror): Rect { const r = geometryFor(h.core).rect(n); if (!r) throw new Error("no rect"); return r; }

test("the dot is 8 px and sits in the centre of its 20 px ring (layout)", async () => {
  await h.boot(() => <View className={ROOT}><RadioGroup value="a"><RadioItem value="a">Alpha</RadioItem></RadioGroup></View>);
  const ring = rectOf(all("radio-ring")[0]);
  const dot = rectOf(all("radio-dot")[0]);
  expect(ring.w).toBe(20);
  expect(ring.h).toBe(20);
  expect(dot.w).toBe(8);
  expect(dot.h).toBe(8);
  expect(dot.x + dot.w / 2 - (ring.x + ring.w / 2)).toBe(0);
  expect(dot.y + dot.h / 2 - (ring.y + ring.h / 2)).toBe(0);
});

test("an unselected item draws an empty ring: no dot is in the mirror for it", async () => {
  await h.boot(() => <View className={ROOT}><RadioGroup value="b"><RadioItem value="a">Alpha</RadioItem><RadioItem value="b">Beta</RadioItem></RadioGroup></View>);
  expect(all("radio-ring").length).toBe(2);
  expect(all("radio-dot").length).toBe(1);
});

function Group(props: { start: string; log: string[]; orientation?: "vertical" | "horizontal"; disabledMiddle?: boolean }) {
  const [value, setValue] = useState(props.start);
  return (
    <View className={ROOT}>
      <RadioGroup value={value} orientation={props.orientation} onValueChange={(v) => { props.log.push(v); setValue(v); }}>
        <RadioItem value="a">Alpha</RadioItem>
        <RadioItem value="b" disabled={props.disabledMiddle}>Beta</RadioItem>
        <RadioItem value="c">Gamma</RadioItem>
      </RadioGroup>
    </View>
  );
}

test("DOWN and RIGHT move forward and select, UP and LEFT move back, all wrapping at the ends", async () => {
  const log: string[] = [];
  await h.boot(() => <Group start="a" log={log} />);
  // Boot focus is empty: the first DOWN only focuses the first item, so four DOWNs make three moves (b, c, a wrap).
  h.core.press(BTN.DOWN);
  h.core.press(BTN.DOWN);
  h.core.press(BTN.DOWN);
  h.core.press(BTN.DOWN);
  expect(log).toEqual(["b", "c", "a"]);
  h.core.press(BTN.UP);
  expect(log).toEqual(["b", "c", "a", "c"]);
  h.core.press(BTN.LEFT);
  expect(log).toEqual(["b", "c", "a", "c", "b"]);
});

test("the arrows skip a disabled item", async () => {
  const log: string[] = [];
  await h.boot(() => <Group start="a" log={log} disabledMiddle />);
  // The first DOWN focuses Alpha; the next moves skip the disabled Beta: Gamma, then Alpha again (wrap).
  h.core.press(BTN.DOWN);
  h.core.press(BTN.DOWN);
  expect(log).toEqual(["c"]);
  h.core.press(BTN.DOWN);
  expect(log).toEqual(["c", "a"]);
});

test("horizontal: RIGHT moves forward and LEFT back, and the dot follows the selection", async () => {
  const log: string[] = [];
  await h.boot(() => <Group start="a" log={log} orientation="horizontal" />);
  h.core.press(BTN.DOWN);
  h.core.press(BTN.RIGHT);
  expect(log).toEqual(["b"]);
  h.core.press(BTN.LEFT);
  expect(log).toEqual(["b", "a"]);
  expect(all("radio-dot").length).toBe(1);
});

test("controlled: a fixed value reports the arrow move and the dot stays where the value says", async () => {
  const log: string[] = [];
  await h.boot(() => <View className={ROOT}><RadioGroup value="a" onValueChange={(v) => log.push(v)}><RadioItem value="a">Alpha</RadioItem><RadioItem value="b">Beta</RadioItem></RadioGroup></View>);
  h.core.press(BTN.DOWN);
  h.core.press(BTN.DOWN);
  expect(log).toEqual(["b"]);
  expect(all("radio-dot").length).toBe(1);
  const ring = all("radio-ring");
  expect(rectOf(all("radio-dot")[0]).y).toBeLessThan(rectOf(ring[1]).y);
});

test("CIRCLE selects the focused item", async () => {
  const log: string[] = [];
  await h.boot(() => <Group start="a" log={log} />);
  h.core.press(BTN.DOWN);
  h.core.press(BTN.DOWN);
  h.core.press(BTN.CIRCLE);
  // Selecting the value already selected is not a change, so nothing is reported (the state rule).
  expect(log).toEqual(["b"]);
});

test("the stepping rule: next and previous wrap over the list length", () => {
  expect(stepIndex(3, 2, 1)).toBe(0);
  expect(stepIndex(3, 0, -1)).toBe(2);
  expect(stepIndex(3, 1, 1)).toBe(2);
});

test("the dark theme draws a selected ring in white with a white dot", async () => {
  await h.boot(() => <ThemeProvider theme="dark"><View className={THEMES.dark["theme.page"]}><RadioGroup value="a"><RadioItem value="a">Alpha</RadioItem></RadioGroup></View></ThemeProvider>);
  const ring = rectOf(all("radio-ring")[0]);
  const dot = rectOf(all("radio-dot")[0]);
  expect(dot.w).toBe(8);
  if (OVERLAY) {
    expect(h.core.pixel(dot.x + 4, dot.y + 4)).toBe("#ffffff");
    expect(h.core.pixel(ring.x, ring.y + 10)).toBe("#ffffff");
  }
});

test("every state has its tokens in both themes (structure)", () => {
  for (const k of ["radio.ring.off", "radio.ring.on", "radio.ring.disabled", "radio.dot", "radio.dot.disabled", "radio.label.rest", "radio.label.disabled", "radio.row", "radio.group", "radio.group.row"]) {
    expect(TOKENS[k as keyof typeof TOKENS]).toBeDefined();
    expect(THEMES.dark[k as keyof typeof TOKENS]).toBeDefined();
  }
});
