import { afterEach, expect, test } from "bun:test";
import { BTN, focusNode, getFocused } from "@pocketjs/framework/input";
import { View } from "../../src/index.ts";
import { rootMirror, type NodeMirror } from "../../src/internal/pocket.ts";
import { Button } from "../../src/native/button.tsx";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, wrapIndex } from "../../src/native/dropdown-menu.tsx";
import { within } from "../../src/primitives/anchored.tsx";
import { topLayer } from "../../src/primitives/layer-stack.ts";
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
  return geometryFor(h.core).rect(n)!;
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
const item = (label: string) => triggerNode(rootMirror, label) as NodeMirror;

interface Log { selected: string[]; behind: number }
function App(props: { log: Log; open?: boolean }) {
  return (
    <View className={ROOT}>
      <Button onPress={() => { props.log.behind++; }}>Behind</Button>
      <DropdownMenu defaultOpen={props.open} onSelect={(v) => props.log.selected.push(v)}>
        <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Document</DropdownMenuLabel>
          <DropdownMenuItem value="edit">Edit</DropdownMenuItem>
          <DropdownMenuItem value="duplicate">Duplicate</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem value="archive" disabled>Archive</DropdownMenuItem>
          <DropdownMenuItem value="delete">Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </View>
  );
}

function openIt(): void {
  focusNode(triggerNode(rootMirror, "Actions") as never);
  h.core.press(BTN.CIRCLE);
  frames();
}

test("wrapIndex steps through the items and wraps at both ends", () => {
  expect(wrapIndex(3, 0, 1)).toBe(1);
  expect(wrapIndex(3, 2, 1)).toBe(0);
  expect(wrapIndex(3, 0, -1)).toBe(2);
  expect(wrapIndex(3, -1, 1)).toBe(0);
  expect(wrapIndex(0, 0, 1)).toBe(-1);
});

test("CIRCLE on the trigger opens the menu and draws its items", async () => {
  await h.boot(() => <App log={{ selected: [], behind: 0 }} />);
  expect(drawn()).not.toContain("Edit");
  openIt();
  expect(drawn()).toContain("Edit");
  expect(drawn()).toContain("Duplicate");
  expect(drawn()).toContain("Document");
});

test("the menu opens with focus on its first enabled item, inside the panel", async () => {
  await h.boot(() => <App log={{ selected: [], behind: 0 }} />);
  openIt();
  expect(getFocused()).toBe(item("Edit") as never);
  expect(within(nodeNamed("dropdown-panel")!, getFocused() as unknown as NodeMirror)).toBe(true);
});

test("the panel sits below the trigger, 4 px clear of it", async () => {
  await h.boot(() => <App log={{ selected: [], behind: 0 }} />);
  const t = geometryFor(h.core).rect(triggerNode(rootMirror, "Actions") as NodeMirror)!;
  openIt();
  expect(rectOf("dropdown-panel").y).toBe(t.y + t.h + 4);
});

test("DOWN moves through the items and wraps; disabled Archive is skipped", async () => {
  await h.boot(() => <App log={{ selected: [], behind: 0 }} />);
  openIt();
  h.core.press(BTN.DOWN); frames(2);
  expect(getFocused()).toBe(item("Duplicate") as never);
  h.core.press(BTN.DOWN); frames(2);
  expect(getFocused()).toBe(item("Delete") as never); // Archive is disabled: skipped
  h.core.press(BTN.DOWN); frames(2);
  expect(getFocused()).toBe(item("Edit") as never); // wraps from the last item to the first
  h.core.press(BTN.UP); frames(2);
  expect(getFocused()).toBe(item("Delete") as never); // wraps from the first item to the last
});

test("focus never leaves the open list", async () => {
  await h.boot(() => <App log={{ selected: [], behind: 0 }} />);
  openIt();
  const panel = nodeNamed("dropdown-panel")!;
  for (const b of [BTN.LEFT, BTN.RIGHT, BTN.DOWN, BTN.DOWN, BTN.UP]) { h.core.press(b); frames(2); expect(within(panel, getFocused() as unknown as NodeMirror)).toBe(true); }
});

test("CIRCLE on an item reports its value through onSelect, closes the menu and returns focus to the trigger", async () => {
  const log = { selected: [] as string[], behind: 0 };
  await h.boot(() => <App log={log} />);
  const trigger = triggerNode(rootMirror, "Actions") as NodeMirror;
  openIt();
  h.core.press(BTN.DOWN); frames(2);
  h.core.press(BTN.CIRCLE); frames();
  expect(log.selected).toEqual(["duplicate"]);
  expect(drawn()).not.toContain("Duplicate");
  expect(getFocused()).toBe(trigger as never);
});

test("CROSS closes the menu with no selection", async () => {
  const log = { selected: [] as string[], behind: 0 };
  await h.boot(() => <App log={log} />);
  openIt();
  h.core.press(BTN.CROSS); frames();
  expect(drawn()).not.toContain("Edit");
  expect(log.selected).toEqual([]);
  expect(topLayer()).toBeUndefined();
});

test("a tap outside the menu closes it and is swallowed: the button behind does not press", async () => {
  const log = { selected: [] as string[], behind: 0 };
  await h.boot(() => <App log={log} />);
  openIt();
  const b = geometryFor(h.core).rect(triggerNode(rootMirror, "Behind") as NodeMirror)!;
  tap(b.x + 6, b.y + Math.floor(b.h / 2));
  frames();
  expect(drawn()).not.toContain("Edit");
  expect(log.behind).toBe(0);
  expect(log.selected).toEqual([]);
});
