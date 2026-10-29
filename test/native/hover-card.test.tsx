import { afterEach, expect, test } from "bun:test";
import { BTN, focusNode } from "@pocketjs/framework/input";
import { Text, View } from "../../src/index.ts";
import { rootMirror, type NodeMirror } from "../../src/internal/pocket.ts";
import { Button } from "../../src/native/button.tsx";
import { Focusable } from "../../src/native/focusable.tsx";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "../../src/native/hover-card.tsx";
import { geometryFor, walk, type Rect } from "../../tools/qa/acceptance/geometry.ts";
import { triggerNode } from "../../tools/qa/acceptance/interaction.ts";
import { harness, ROOT } from "./support.ts";

const h = harness();
afterEach(() => h.dispose());

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
function drawn(): string[] { return h.core.texts().map((t) => t.text); }
function frames(n = 6): void { for (let i = 0; i < n; i++) { h.core.step(0); h.core.render(); } }
function tap(x: number, y: number): void {
  const q = ((globalThis as { __pocketPointer?: unknown[] }).__pocketPointer ??= []);
  q.push({ x, y, down: true });
  h.core.step(0);
  q.push({ x, y, down: false });
  h.core.step(0);
  h.core.step(0);
}

function App(props: { open?: boolean }) {
  return (
    <View className={ROOT}>
      <View className="flex-row items-center gap-2">
        <HoverCard open={props.open}>
          <HoverCardTrigger>@design</HoverCardTrigger>
          <HoverCardContent>
            <Text className="text-sm font-bold text-slate-900">Design team</Text>
            <Text className="text-sm text-slate-500">Three people, one channel.</Text>
          </HoverCardContent>
        </HoverCard>
        <Button>Elsewhere</Button>
      </View>
    </View>
  );
}

test("focusing the trigger opens the panel: its text is drawn beside the trigger", async () => {
  await h.boot(() => <App />);
  expect(drawn()).not.toContain("Design team");
  focusNode(triggerNode(rootMirror, "@design") as never);
  frames();
  expect(drawn()).toContain("Design team");
  expect(drawn()).toContain("Three people, one channel.");
  const panel = rectOf("hover-card-panel");
  const trigger = rectOf("hover-card-trigger");
  expect(panel.y).toBeGreaterThanOrEqual(trigger.y + trigger.h);
});

test("focus leaving the trigger closes the panel", async () => {
  await h.boot(() => <App />);
  focusNode(triggerNode(rootMirror, "@design") as never);
  frames();
  expect(drawn()).toContain("Design team");
  focusNode(triggerNode(rootMirror, "Elsewhere") as never);
  frames();
  expect(drawn()).not.toContain("Design team");
});

test("an outside press closes the panel and it stays closed while the trigger keeps focus", async () => {
  await h.boot(() => <App />);
  focusNode(triggerNode(rootMirror, "@design") as never);
  frames();
  expect(drawn()).toContain("Design team");
  const panel = rectOf("hover-card-panel");
  tap(panel.x + panel.w + 20, panel.y + panel.h + 20);
  frames();
  expect(drawn()).not.toContain("Design team");
  frames();
  expect(drawn()).not.toContain("Design team");
  // Focus leaves and returns: the latch is released on the leave, so the card opens again.
  h.core.press(BTN.RIGHT);
  frames();
  focusNode(triggerNode(rootMirror, "@design") as never);
  frames();
  expect(drawn()).toContain("Design team");
});

test("controlled open shows the panel with no focus on the trigger", async () => {
  await h.boot(() => <App open />);
  frames();
  expect(drawn()).toContain("Design team");
});

test("mutant: a trigger that never opens leaves the panel undrawn (the open check above fails on it)", async () => {
  // The defect body: a focusable label with no card behind it.
  const Never = () => (
    <View className={ROOT}>
      <Focusable look="h-8 px-1 bg-white" debugName="hover-card-trigger"><Text className="text-sm font-bold text-slate-900">@design</Text></Focusable>
    </View>
  );
  await h.boot(() => <Never />);
  focusNode(triggerNode(rootMirror, "@design") as never);
  frames();
  expect(drawn()).not.toContain("Design team");
  expect(nodeNamed("hover-card-panel")).toBeUndefined();
});
