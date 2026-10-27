import { afterEach, expect, test } from "bun:test";
import { BTN, focusNode, getFocused } from "@pocketjs/framework/input";
import { View } from "../../src/index.ts";
import { rootMirror, type NodeMirror } from "../../src/internal/pocket.ts";
import { Button } from "../../src/native/button.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "../../src/native/popover.tsx";
import { within } from "../../src/primitives/anchored.tsx";
import { topLayer } from "../../src/primitives/layer-stack.ts";
import { geometryFor, walk, type Rect } from "../../tools/qa/acceptance/geometry.ts";
import { triggerNode } from "../../tools/qa/acceptance/interaction.ts";
import { harness, ROOT } from "./support.ts";

const h = harness();
afterEach(() => h.dispose());
const BORDER = "#e2e8f0"; // slate-200: the panel's border, drawn over the page
const FILL = "#0f172a"; // slate-900: the trigger's default fill

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
function tap(x: number, y: number): void {
  const q = ((globalThis as { __pocketPointer?: unknown[] }).__pocketPointer ??= []);
  q.push({ x, y, down: true });
  h.core.step(0);
  q.push({ x, y, down: false });
  h.core.step(0);
  h.core.step(0);
}
function frames(n = 6): void { for (let i = 0; i < n; i++) { h.core.step(0); h.core.render(); } }
const drawn = () => h.core.texts().map((t) => t.text);

interface Counts { behind: number; copy: number; email: number }
function App(props: { open?: boolean; counts: Counts }) {
  return (
    <View className={ROOT}>
      <Button onPress={() => { props.counts.behind++; }}>Behind</Button>
      <Popover defaultOpen={props.open}>
        <PopoverTrigger>Share</PopoverTrigger>
        <PopoverContent>
          <Button onPress={() => { props.counts.copy++; }}>Copy link</Button>
          <Button variant="outline" onPress={() => { props.counts.email++; }}>Email</Button>
        </PopoverContent>
      </Popover>
    </View>
  );
}

function openIt(): void {
  focusNode(triggerNode(rootMirror, "Share") as never);
  h.core.press(BTN.CIRCLE);
  frames();
}

test("CIRCLE on the trigger opens the popover and draws its content", async () => {
  await h.boot(() => <App counts={{ behind: 0, copy: 0, email: 0 }} />);
  expect(drawn()).not.toContain("Copy link");
  openIt();
  expect(drawn()).toContain("Copy link");
  expect(drawn()).toContain("Email");
});

test("the panel is placed below its trigger, 4 px clear of it, and does not cover it", async () => {
  await h.boot(() => <App counts={{ behind: 0, copy: 0, email: 0 }} />);
  const trig = geometryFor(h.core).rect(triggerNode(rootMirror, "Share") as NodeMirror)!;
  openIt();
  const panel = rectOf("popover-panel");
  expect(panel.y).toBe(trig.y + trig.h + 4);
  expect(panel.y).toBeGreaterThanOrEqual(trig.y + trig.h);
  // centred under the trigger (align center): the centres agree to a pixel
  expect(Math.abs(panel.x + panel.w / 2 - (trig.x + trig.w / 2))).toBeLessThanOrEqual(1);
  // the trigger's fill is still the trigger's fill at its centre-left: nothing was drawn over it
  h.core.render();
  expect(h.core.pixel(trig.x + 4, trig.y + Math.floor(trig.h / 2))).toBe(FILL);
  // the panel's border is drawn on the page
  expect(h.core.pixel(panel.x, panel.y + Math.floor(panel.h / 2))).toBe(BORDER);
});

test("focus moves into the content when the popover opens", async () => {
  await h.boot(() => <App counts={{ behind: 0, copy: 0, email: 0 }} />);
  openIt();
  const panel = nodeNamed("popover-panel")!;
  expect(within(panel, getFocused() as unknown as NodeMirror)).toBe(true);
});

test("the content is focusable: DOWN moves to Email, and CIRCLE presses the focused item", async () => {
  const counts = { behind: 0, copy: 0, email: 0 };
  await h.boot(() => <App counts={counts} />);
  openIt();
  h.core.press(BTN.CIRCLE);
  frames();
  h.core.press(BTN.DOWN);
  frames(2);
  h.core.press(BTN.CIRCLE);
  frames();
  expect(counts.copy).toBe(1);
  expect(counts.email).toBe(1);
  expect(drawn()).toContain("Copy link"); // pressing content does not close the popover
});

test("a tap outside the panel closes it and is swallowed: the button behind does not press", async () => {
  const counts = { behind: 0, copy: 0, email: 0 };
  await h.boot(() => <App counts={counts} />);
  openIt();
  const b = geometryFor(h.core).rect(triggerNode(rootMirror, "Behind") as NodeMirror)!;
  tap(b.x + 6, b.y + Math.floor(b.h / 2));
  frames();
  expect(drawn()).not.toContain("Copy link");
  expect(counts.behind).toBe(0);
  expect(topLayer()).toBeUndefined();
});

test("CROSS closes the popover and gives focus back to the trigger", async () => {
  await h.boot(() => <App counts={{ behind: 0, copy: 0, email: 0 }} />);
  const trigger = triggerNode(rootMirror, "Share") as NodeMirror;
  openIt();
  h.core.press(BTN.CROSS);
  frames();
  expect(drawn()).not.toContain("Copy link");
  expect(getFocused()).toBe(trigger as never);
});
