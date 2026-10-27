import { afterEach, expect, test } from "bun:test";
import { BTN } from "@pocketjs/framework/input";
import { useState } from "react";
import { View } from "../../src/index.ts";
import { rootMirror, type NodeMirror } from "../../src/internal/pocket.ts";
import { geometryFor, walk, type Rect } from "../../tools/qa/acceptance/geometry.ts";
import { triggerNode } from "../../tools/qa/acceptance/interaction.ts";
import { percentOf } from "../../src/native/percent.ts";
import { clampSize, Resizable, sizeAtX } from "../../src/native/resizable.tsx";
import { harness, ROOT } from "./support.ts";

const h = harness();
afterEach(() => { h.dispose(); (globalThis as { __pocketPointer?: unknown[] }).__pocketPointer = []; });

function rectOf(n: NodeMirror | undefined, what: string): Rect {
  const r = n && geometryFor(h.core).rect(n);
  if (!r) throw new Error("no rect for " + what);
  return r;
}
function groupRect(): Rect {
  let g: NodeMirror | undefined;
  walk(rootMirror, (n) => { if (!g && n.debugName === "resizable") g = n; });
  return rectOf(g, "group");
}
function firstRect(): Rect {
  let f: NodeMirror | undefined;
  walk(rootMirror, (n) => { if (!f && n.debugName === "resizable-first") f = n; });
  return rectOf(f, "first pane");
}
/** The divider's box: the focusable ancestor of its grip text. Its left edge is the divider position. */
function dividerRect(): Rect {
  return rectOf(triggerNode(rootMirror, "::"), "divider");
}
function frames(n: number) { for (let i = 0; i < n; i++) { h.core.step(0); h.core.render(); } }
type P = { x: number; y: number; down: boolean };
/** A press at xs[0], a move through the rest, and a release at the last point: the pointer is up when the test ends. */
function drag(xs: number[], y: number) {
  const q: P[] = xs.map((x) => ({ x, y, down: true }));
  q.push({ x: xs[xs.length - 1], y, down: false });
  (globalThis as { __pocketPointer?: P[] }).__pocketPointer = q;
  frames(xs.length + 3);
}

test("the size helpers round to a whole percent and keep both panes at the minimum", () => {
  expect(clampSize(33.4, 20)).toBe(33);
  expect(clampSize(5, 20)).toBe(20);
  expect(clampSize(95, 20)).toBe(80);
  expect(clampSize(50, 30)).toBe(50);
  expect(sizeAtX(100 + 150, 100, 400, 20)).toBe(38);
  expect(sizeAtX(0, 100, 400, 20)).toBe(20);
});

test("the first pane is size percent of the group, and the divider sits at its right edge", async () => {
  await h.boot(() => <View className={ROOT}><Resizable first={null} second={null} defaultSize={50} /></View>);
  frames(3);
  const g = groupRect();
  expect(firstRect().w).toBe(percentOf(50, g.w));
  expect(dividerRect().x - g.x).toBe(percentOf(50, g.w));
});

test("the divider position is asserted before and after a drag", async () => {
  await h.boot(() => <View className={ROOT}><Resizable first={null} second={null} defaultSize={50} /></View>);
  frames(3);
  const g = groupRect();
  const before = dividerRect();
  expect(before.x - g.x).toBe(percentOf(50, g.w));
  // Press on the divider's centre and drag to 70 percent of the group.
  drag([before.x + 8, g.x + Math.round(g.w * 0.7)], before.y + 4);
  const after = dividerRect();
  expect(after.x - g.x).toBe(percentOf(70, g.w));
  expect(after.x).toBeGreaterThan(before.x);
});

test("a drag past either end stops at the minimum: 20 and 80 percent", async () => {
  const log: number[] = [];
  function App() {
    const [s, setS] = useState(50);
    return <View className={ROOT}><Resizable first={null} second={null} size={s} onSizeChange={(n) => { log.push(n); setS(n); }} /></View>;
  }
  await h.boot(() => <App />);
  frames(3);
  const g = groupRect();
  const d = dividerRect();
  drag([d.x + 8, g.x + g.w - 2], d.y + 4);
  expect(log[log.length - 1]).toBe(80);
  const d2 = dividerRect();
  drag([d2.x + 8, g.x + 1], d2.y + 4);
  expect(log[log.length - 1]).toBe(20);
});

test("RIGHT and LEFT on the divider step by 10 and clamp at the minimum and maximum", async () => {
  const log: number[] = [];
  function App() {
    const [s, setS] = useState(50);
    return <View className={ROOT}><Resizable first={null} second={null} size={s} onSizeChange={(n) => { log.push(n); setS(n); }} /></View>;
  }
  await h.boot(() => <App />);
  h.core.press(BTN.DOWN); // focus the divider (the first focusable)
  h.core.press(BTN.RIGHT);
  h.core.press(BTN.RIGHT);
  expect(log).toEqual([60, 70]);
  h.core.press(BTN.LEFT);
  expect(log).toEqual([60, 70, 60]);
  for (let i = 0; i < 10; i++) h.core.press(BTN.RIGHT);
  expect(log[log.length - 1]).toBe(80);
  h.core.press(BTN.RIGHT);
  expect(log[log.length - 1]).toBe(80);
});
