import { afterEach, expect, test } from "bun:test";
import { useState } from "react";
import { BTN, focusNode, getFocused } from "@pocketjs/framework/input";
import { View } from "../../src/index.ts";
import { rootMirror, type NodeMirror } from "../../src/internal/pocket.ts";
import { Button } from "../../src/native/button.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../src/native/tooltip.tsx";
import { topLayer } from "../../src/primitives/layer-stack.ts";
import { geometryFor, walk, type Rect } from "../../tools/qa/acceptance/geometry.ts";
import { triggerNode } from "../../tools/qa/acceptance/interaction.ts";
import { harness, ROOT } from "./support.ts";

const h = harness();
afterEach(() => h.dispose());
const HINT = "Saves the draft";

function rectOf(name: string): Rect {
  let found: NodeMirror | undefined;
  walk(rootMirror, (n) => { if (!found && n.debugName === name) found = n; });
  if (!found) throw new Error("no node " + name);
  return geometryFor(h.core).rect(found)!;
}
function tap(x: number, y: number): void {
  const q = ((globalThis as { __pocketPointer?: unknown[] }).__pocketPointer ??= []);
  q.push({ x, y, down: true });
  h.core.step(0);
  q.push({ x, y, down: false });
  h.core.step(0);
  h.core.step(0);
}
const drawn = () => h.core.texts().map((t) => t.text);

function App(props: { counts: { behind: number } }) {
  return (
    <View className={ROOT}>
      <View style={{ height: 60 }} />
      <View className="flex-row gap-2">
        <Tooltip>
          <TooltipTrigger>Save</TooltipTrigger>
          <TooltipContent>{HINT}</TooltipContent>
        </Tooltip>
        <Button onPress={() => { props.counts.behind++; }}>Behind</Button>
      </View>
    </View>
  );
}

const trigger = () => triggerNode(rootMirror, "Save") as NodeMirror;

test("focusing the trigger opens the tooltip after its delay, counted in frames (300 ms = 18 frames at 60 Hz)", async () => {
  await h.boot(() => <App counts={{ behind: 0 }} />);
  focusNode(trigger() as never);
  let frames = 0;
  while (!drawn().includes(HINT) && frames < 60) { h.core.step(0); h.core.render(); frames++; }
  // The delay is 18 frames; the panel then takes two frames to measure its anchor and place itself (drawn at opacity 0.01 until then).
  expect(frames).toBe(20);
  expect(drawn()).toContain(HINT);
});

test("the delay holds: the tooltip is not drawn in the first 17 frames of focus", async () => {
  await h.boot(() => <App counts={{ behind: 0 }} />);
  focusNode(trigger() as never);
  for (let i = 0; i < 17; i++) { h.core.step(0); h.core.render(); }
  expect(drawn()).not.toContain(HINT);
});

test("the tooltip takes no focus: the trigger keeps it while the tooltip is open", async () => {
  await h.boot(() => <App counts={{ behind: 0 }} />);
  focusNode(trigger() as never);
  for (let i = 0; i < 30; i++) { h.core.step(0); h.core.render(); }
  expect(drawn()).toContain(HINT);
  expect(getFocused()).toBe(trigger() as never);
});

test("the tooltip is not a layer: no dismissal is registered and nothing is captured", async () => {
  await h.boot(() => <App counts={{ behind: 0 }} />);
  focusNode(trigger() as never);
  for (let i = 0; i < 30; i++) { h.core.step(0); h.core.render(); }
  expect(drawn()).toContain(HINT);
  expect(topLayer()).toBeUndefined();
});

test("moving focus closes the tooltip at once", async () => {
  const counts = { behind: 0 };
  await h.boot(() => <App counts={counts} />);
  focusNode(trigger() as never);
  for (let i = 0; i < 30; i++) { h.core.step(0); h.core.render(); }
  expect(drawn()).toContain(HINT);
  focusNode(triggerNode(rootMirror, "Behind") as never);
  h.core.step(0);
  h.core.render();
  expect(drawn()).not.toContain(HINT);
});

test("a tap on another control while the tooltip is open still reaches that control", async () => {
  const counts = { behind: 0 };
  await h.boot(() => <App counts={counts} />);
  focusNode(trigger() as never);
  for (let i = 0; i < 30; i++) { h.core.step(0); h.core.render(); }
  const b = geometryFor(h.core).rect(triggerNode(rootMirror, "Behind") as NodeMirror)!;
  tap(b.x + 6, b.y + Math.floor(b.h / 2));
  h.core.step(0);
  expect(counts.behind).toBe(1);
});

test("the tooltip sits above the trigger, 4 px clear of it", async () => {
  await h.boot(() => <App counts={{ behind: 0 }} />);
  focusNode(trigger() as never);
  for (let i = 0; i < 30; i++) { h.core.step(0); h.core.render(); }
  const t = geometryFor(h.core).rect(trigger())!;
  const p = rectOf("tooltip-panel");
  expect(p.y + p.h).toBe(t.y - 4);
});

// A page switch: the tooltip's trigger lives in a page. "hidden" is the gallery's display:none page (focus stays on its trigger);
// "unmounted" removes the page. A tooltip left open must draw nothing once its page is gone.
type Mode = "shown" | "hidden" | "unmounted";
let setMode: ((m: Mode) => void) | undefined;
function Paged() {
  const [mode, set] = useState<Mode>("shown");
  setMode = set;
  return (
    <View className={ROOT}>
      {mode !== "unmounted" ? (
        <View className="flex-row" style={{ display: mode === "hidden" ? "none" : "flex" }}>
          <Tooltip>
            <TooltipTrigger>Save</TooltipTrigger>
            <TooltipContent>{HINT}</TooltipContent>
          </Tooltip>
        </View>
      ) : (
        <View className="flex-row"><Button>Other</Button></View>
      )}
    </View>
  );
}
// setState from outside a press is flushed on the scheduler's next turn, so the switch waits one macrotask.
const turn = () => new Promise((r) => setTimeout(r, 5));
function panelsInMirror(): number {
  let n = 0;
  walk(rootMirror, (m) => { if (m.debugName === "tooltip-panel") n++; });
  return n;
}

test("a page hidden under an open tooltip closes it within two frames: no tooltip text is drawn after the switch", async () => {
  await h.boot(() => <Paged />);
  focusNode(trigger() as never);
  for (let i = 0; i < 30; i++) { h.core.step(0); h.core.render(); }
  expect(drawn()).toContain(HINT);
  setMode!("hidden");
  await turn();
  // The core lays the hidden trigger out on the frame after its style changes, and the tooltip reads that layout: two frames.
  h.core.step(0);
  h.core.step(0);
  h.core.render();
  // The premise: the core leaves focus on the hidden trigger, so focus alone cannot close the tooltip.
  expect(getFocused()).toBe(trigger() as never);
  expect(drawn()).not.toContain(HINT);
  expect(panelsInMirror()).toBe(0);
  expect(topLayer()).toBeUndefined();
});

test("an unmounted tooltip draws nothing on the next frame", async () => {
  await h.boot(() => <Paged />);
  focusNode(trigger() as never);
  for (let i = 0; i < 30; i++) { h.core.step(0); h.core.render(); }
  expect(drawn()).toContain(HINT);
  setMode!("unmounted");
  await turn();
  h.core.step(0);
  h.core.render();
  expect(drawn()).not.toContain(HINT);
  expect(panelsInMirror()).toBe(0);
  expect(topLayer()).toBeUndefined();
});

test("showing the hidden page again reopens the tooltip after its delay, with focus still on the trigger", async () => {
  await h.boot(() => <Paged />);
  focusNode(trigger() as never);
  for (let i = 0; i < 30; i++) { h.core.step(0); h.core.render(); }
  setMode!("hidden");
  await turn();
  h.core.step(0);
  h.core.step(0);
  h.core.render();
  expect(drawn()).not.toContain(HINT);
  setMode!("shown");
  await turn();
  for (let i = 0; i < 30; i++) { h.core.step(0); h.core.render(); }
  expect(drawn()).toContain(HINT);
});
