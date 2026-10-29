import { afterEach, expect, test } from "bun:test";
import { BTN, focusNode, getFocused } from "@pocketjs/framework/input";
import { useState } from "react";
import { View } from "../../src/index.ts";
import { rootMirror, type NodeMirror } from "../../src/internal/pocket.ts";
import { Focusable } from "../../src/native/focusable.tsx";
import { Toggle } from "../../src/native/toggle.tsx";
import { ToggleGroup, ToggleGroupItem, toggleGroupValues } from "../../src/native/toggle-group.tsx";
import { TOKENS } from "../../src/native/tokens.ts";
import { geometryFor, walk, type Rect } from "../../tools/qa/acceptance/geometry.ts";
import { triggerNode } from "../../tools/qa/acceptance/interaction.ts";
import { harness, ROOT } from "./support.ts";

const h = harness();
afterEach(() => h.dispose());
// The stock core draws a translucent focus wash over the first focusable at boot, so a fill is classified by brightness
// there; the exact token colours are asserted on the overlay core, which draws a border only.
const OVERLAY = !!process.env.POCKETJS_CORE_ROOT;
const WHITE = "#ffffff";
const ON = "#0f172a";
const DISABLED = "#e2e8f0";
const brightness = (hex: string) => { const n = parseInt(hex.slice(1), 16); return ((n >> 16) & 255) + ((n >> 8) & 255) + (n & 255); };

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
/** The fill of a box, a frame after its state changed: past the 2 px border, before the 12 px label padding. */
function fillOf(name: string): string {
  for (let i = 0; i < 3; i++) { h.core.step(0); h.core.render(); }
  const r = rectOf(name);
  return h.core.pixel(Math.round(r.x + 10), Math.round(r.y + r.h / 2));
}
function expectPressed(name: string): void {
  const c = fillOf(name);
  if (OVERLAY) expect(c).toBe(ON);
  else expect(brightness(c)).toBeLessThan(300);
}
function expectRest(name: string): void {
  const c = fillOf(name);
  if (OVERLAY) expect(c).toBe(WHITE);
  else expect(brightness(c)).toBeGreaterThan(500);
}
function focusedLabel(): string | null {
  const f = getFocused() as unknown as NodeMirror | null;
  if (!f) return null;
  let found: string | null = null;
  const visit = (n: NodeMirror): void => {
    if (found !== null) return;
    if (typeof (n as { text?: unknown }).text === "string") { found = (n as unknown as { text: string }).text; return; }
    for (const k of n.children) visit(k);
  };
  visit(f);
  return found;
}

test("a toggle rests on a light fill and fills dark when CIRCLE presses it", async () => {
  await h.boot(() => <View className={ROOT}><Toggle>Bold</Toggle></View>);
  expectRest("toggle");
  focusNode(triggerNode(rootMirror, "Bold") as never);
  h.core.press(BTN.CIRCLE);
  expectPressed("toggle");
  h.core.press(BTN.CIRCLE);
  expectRest("toggle");
});

test("a disabled toggle keeps its box and takes neither focus nor press", async () => {
  const log: boolean[] = [];
  await h.boot(() => (
    <View className={ROOT}><Toggle disabled onPressedChange={(p) => log.push(p)}>Locked</Toggle></View>
  ));
  const node = nodeNamed("toggle")!;
  expect(node.focusable).toBeFalsy();
  h.core.press(BTN.CIRCLE);
  for (let i = 0; i < 3; i++) h.core.step(0);
  expect(log).toEqual([]);
  if (OVERLAY) expect(fillOf("toggle")).toBe(DISABLED);
});

function Single(props: { log: Array<string | string[]> }) {
  const [value, setValue] = useState("left");
  return (
    <View className={ROOT}>
      <ToggleGroup type="single" value={value} onValueChange={(next) => { props.log.push(next); setValue(next as string); }}>
        <ToggleGroupItem value="left">Left</ToggleGroupItem>
        <ToggleGroupItem value="center">Center</ToggleGroupItem>
        <ToggleGroupItem value="right">Right</ToggleGroupItem>
      </ToggleGroup>
    </View>
  );
}

test("single: the pressed item fills, and a press on the active item is a no-op", async () => {
  const log: Array<string | string[]> = [];
  await h.boot(() => <Single log={log} />);
  expectPressed("toggle-item:left");
  expectRest("toggle-item:center");
  focusNode(triggerNode(rootMirror, "Left") as never);
  h.core.press(BTN.CIRCLE);
  expect(log).toEqual([]);
  expectPressed("toggle-item:left");
  focusNode(triggerNode(rootMirror, "Center") as never);
  h.core.press(BTN.CIRCLE);
  expect(log).toEqual(["center"]);
  expectRest("toggle-item:left");
  expectPressed("toggle-item:center");
});

test("multiple: each press adds or removes its value and reports the whole array", async () => {
  const log: Array<string | string[]> = [];
  function Multiple() {
    const [values, setValues] = useState<string[]>([]);
    return (
      <View className={ROOT}>
        <ToggleGroup type="multiple" value={values} onValueChange={(next) => { log.push(next); setValues(next as string[]); }}>
          <ToggleGroupItem value="bold">Bold</ToggleGroupItem>
          <ToggleGroupItem value="italic">Italic</ToggleGroupItem>
        </ToggleGroup>
      </View>
    );
  }
  await h.boot(() => <Multiple />);
  focusNode(triggerNode(rootMirror, "Bold") as never);
  h.core.press(BTN.CIRCLE);
  expect(log).toEqual([["bold"]]);
  focusNode(triggerNode(rootMirror, "Italic") as never);
  h.core.press(BTN.CIRCLE);
  expect(log).toEqual([["bold"], ["bold", "italic"]]);
  focusNode(triggerNode(rootMirror, "Bold") as never);
  h.core.press(BTN.CIRCLE);
  expect(log).toEqual([["bold"], ["bold", "italic"], ["italic"]]);
  expectRest("toggle-item:bold");
  expectPressed("toggle-item:italic");
});

test("the arrows walk the group without toggling, wrapping at the ends", async () => {
  const log: Array<string | string[]> = [];
  await h.boot(() => <Single log={log} />);
  focusNode(triggerNode(rootMirror, "Left") as never);
  h.core.press(BTN.RIGHT);
  expect(focusedLabel()).toBe("Center");
  h.core.press(BTN.RIGHT);
  expect(focusedLabel()).toBe("Right");
  h.core.press(BTN.RIGHT);
  expect(focusedLabel()).toBe("Left");
  h.core.press(BTN.LEFT);
  expect(focusedLabel()).toBe("Right");
  expect(log).toEqual([]);
});

test("the value rules are one function: single keeps the active value, multiple toggles it", () => {
  expect(toggleGroupValues("single", ["left"], "left")).toEqual(["left"]);
  expect(toggleGroupValues("single", ["left"], "right")).toEqual(["right"]);
  expect(toggleGroupValues("multiple", [], "bold")).toEqual(["bold"]);
  expect(toggleGroupValues("multiple", ["bold"], "bold")).toEqual([]);
});

test("mutant: a toggle whose pressed state never paints keeps the rest fill", async () => {
  // The defect body: the pressed fill is never applied (the rest token only). The pressed-fill check above fails on it.
  const T = TOKENS as Record<string, string>;
  const Stuck = () => <Focusable look={[T["toggle.base"], T["toggle.off"]].join(" ")} debugName="toggle">Stuck</Focusable>;
  await h.boot(() => <View className={ROOT}><Stuck /></View>);
  focusNode(triggerNode(rootMirror, "Stuck") as never);
  h.core.press(BTN.CIRCLE);
  expectRest("toggle");
});
