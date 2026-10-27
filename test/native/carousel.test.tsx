import { afterEach, expect, test } from "bun:test";
import { BTN, focusNode } from "@pocketjs/framework/input";
import { useState } from "react";
import { View } from "../../src/index.ts";
import { rootMirror, type NodeMirror } from "../../src/internal/pocket.ts";
import { geometryFor, walk, type Rect } from "../../tools/qa/acceptance/geometry.ts";
import { triggerNode } from "../../tools/qa/acceptance/interaction.ts";
import { Carousel, stepIndex } from "../../src/native/carousel.tsx";
import { harness, ROOT } from "./support.ts";

const h = harness();
afterEach(() => h.dispose());

const SLIDES = ["Welcome", "Pricing", "Support"];
const SLIDE_W = 168;

function rectNamed(name: string): Rect {
  let found: NodeMirror | undefined;
  walk(rootMirror, (n) => { if (!found && n.debugName === name) found = n; });
  const r = found && geometryFor(h.core).rect(found);
  if (!r) throw new Error("no rect for " + name);
  return r;
}
/** The slide's offset from the viewport's left edge: 0 when it sits in the viewport, +168 when it waits on the right. */
function slideOffset(): number {
  return rectNamed("carousel-slide").x - rectNamed("carousel-viewport").x;
}
function indicator(): string {
  const t = h.core.texts().map((r) => r.text).find((s) => /^\d+ \/ \d+$/.test(s));
  if (!t) throw new Error("no position readout");
  return t;
}
function frames(n: number) { for (let i = 0; i < n; i++) { h.core.step(0); h.core.render(); } }
function press(label: string) {
  const n = triggerNode(rootMirror, label);
  if (!n) throw new Error("no " + label);
  focusNode(n);
  h.core.press(BTN.CIRCLE);
  frames(12);
}

test("the step rule wraps at both ends when looping and stops at the ends when not", () => {
  expect(stepIndex(3, 2, 1, true)).toBe(0);
  expect(stepIndex(3, 0, -1, true)).toBe(2);
  expect(stepIndex(3, 0, -1, false)).toBeNull();
  expect(stepIndex(3, 2, 1, false)).toBeNull();
  expect(stepIndex(3, 1, 1, false)).toBe(2);
  expect(stepIndex(0, 0, 1, true)).toBeNull();
});

test("a move slides the next slide in from the right and settles at offset 0; the readout follows", async () => {
  await h.boot(() => <View className={ROOT}><Carousel slides={SLIDES} /></View>);
  frames(3);
  expect(indicator()).toBe("1 / 3");
  expect(slideOffset()).toBe(0);
  focusNode(triggerNode(rootMirror, "Next slide")!);
  // Sample the offset through the move: the slide is off to the right (positive), closes in on 0 in steps, and rests at 0.
  // The press frame already has the transition under way (the core eases out), so the first sample is inside the travel.
  const seen: number[] = [];
  h.core.press(BTN.CIRCLE);
  for (let f = 0; f < 14; f++) { h.core.step(0); h.core.render(); seen.push(slideOffset()); }
  expect(seen[0]).toBeGreaterThan(0);
  expect(seen[0]).toBeLessThan(SLIDE_W);
  expect(seen.filter((d) => d > 0 && d < SLIDE_W).length).toBeGreaterThanOrEqual(3);
  for (let i = 1; i < seen.length; i++) expect(seen[i]).toBeLessThanOrEqual(seen[i - 1]);
  expect(seen[seen.length - 1]).toBe(0);
  expect(indicator()).toBe("2 / 3");
});

test("the offset is 0 after each move, and Next then Prev return to the first slide", async () => {
  await h.boot(() => <View className={ROOT}><Carousel slides={SLIDES} /></View>);
  frames(3);
  press("Next slide");
  expect(indicator()).toBe("2 / 3");
  expect(slideOffset()).toBe(0);
  press("Next slide");
  expect(indicator()).toBe("3 / 3");
  expect(slideOffset()).toBe(0);
  press("Prev slide");
  expect(indicator()).toBe("2 / 3");
  expect(slideOffset()).toBe(0);
});

test("looping: Next on the last slide goes to the first, entering from the right", async () => {
  await h.boot(() => <View className={ROOT}><Carousel slides={SLIDES} defaultIndex={2} /></View>);
  frames(3);
  expect(indicator()).toBe("3 / 3");
  focusNode(triggerNode(rootMirror, "Next slide")!);
  h.core.press(BTN.CIRCLE);
  h.core.step(0); h.core.render();
  expect(indicator()).toBe("1 / 3");
  expect(h.core.texts().map((t) => t.text)).toContain("Welcome");
  expect(slideOffset()).toBeGreaterThan(0); // entering from the right
  frames(12);
  expect(slideOffset()).toBe(0);
});

test("looping: Prev on the first slide goes to the last, entering from the left", async () => {
  await h.boot(() => <View className={ROOT}><Carousel slides={SLIDES} /></View>);
  frames(3);
  focusNode(triggerNode(rootMirror, "Prev slide")!);
  h.core.press(BTN.CIRCLE);
  h.core.step(0); h.core.render();
  expect(indicator()).toBe("3 / 3");
  expect(slideOffset()).toBeLessThan(0); // entering from the left
  frames(12);
  expect(slideOffset()).toBe(0);
});

test("loop={false}: the end does not wrap; a press at the end moves nothing", async () => {
  const log: number[] = [];
  function App() {
    const [i, setI] = useState(0);
    return <View className={ROOT}><Carousel slides={SLIDES} index={i} onIndexChange={(n) => { log.push(n); setI(n); }} loop={false} /></View>;
  }
  await h.boot(() => <App />);
  frames(3);
  press("Next slide");
  press("Next slide");
  expect(log).toEqual([1, 2]);
  press("Next slide");
  expect(log).toEqual([1, 2]);
  expect(indicator()).toBe("3 / 3");
});
