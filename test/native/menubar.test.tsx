import { afterEach, expect, test } from "bun:test";
import { BTN, getFocused } from "@pocketjs/framework/input";
import { View } from "../../src/index.ts";
import { rootMirror, type NodeMirror } from "../../src/internal/pocket.ts";
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarSeparator, MenubarTrigger, neighbourEntry } from "../../src/native/menubar.tsx";
import { geometryFor, walk, type Rect } from "../../tools/qa/acceptance/geometry.ts";
import { triggerNode } from "../../tools/qa/acceptance/interaction.ts";
import { harness, ROOT } from "./support.ts";

const h = harness();
afterEach(() => h.dispose());

function nodes(pred: (n: NodeMirror) => boolean): NodeMirror[] {
  const out: NodeMirror[] = [];
  walk(rootMirror, (n) => { if (pred(n)) out.push(n); });
  return out;
}
function rectOf(n: NodeMirror): Rect {
  const r = geometryFor(h.core).rect(n);
  if (!r) throw new Error("no rect");
  return r;
}
function drawn(): string[] { return h.core.texts().map((t) => t.text); }
function frames(n = 6): void { for (let i = 0; i < n; i++) { h.core.step(0); h.core.render(); } }
function panels(): NodeMirror[] { return nodes((n) => n.debugName === "menubar-panel"); }
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

function Bar(props: { log: string[] }) {
  return (
    <View className={ROOT}>
      <Menubar onSelect={(v) => props.log.push(v)}>
        <MenubarMenu value="file">
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarItem value="new">New</MenubarItem>
            <MenubarItem value="open">Open</MenubarItem>
            <MenubarSeparator />
            <MenubarItem value="quit" disabled>Quit</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu value="view">
          <MenubarTrigger>View</MenubarTrigger>
          <MenubarContent>
            <MenubarItem value="zoom">Zoom</MenubarItem>
            <MenubarItem value="full">Full screen</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu value="help">
          <MenubarTrigger>Help</MenubarTrigger>
          <MenubarContent><MenubarItem value="docs">Docs</MenubarItem></MenubarContent>
        </MenubarMenu>
      </Menubar>
    </View>
  );
}

test("a press on a bar entry opens its panel under it, and only that panel", async () => {
  const log: string[] = [];
  await h.boot(() => <Bar log={log} />);
  expect(panels()).toHaveLength(0);
  h.core.press(BTN.DOWN);
  h.core.press(BTN.CIRCLE);
  frames();
  expect(drawn()).toContain("New");
  expect(panels()).toHaveLength(1);
  const panel = rectOf(panels()[0]);
  const trigger = rectOf(nodes((n) => n.debugName === "menubar-trigger:file")[0]);
  expect(panel.y).toBeGreaterThanOrEqual(trigger.y + trigger.h);
});

test("LEFT and RIGHT swap the open panel along the bar, wrapping, one panel at a time", async () => {
  const log: string[] = [];
  await h.boot(() => <Bar log={log} />);
  h.core.press(BTN.DOWN);
  h.core.press(BTN.CIRCLE);
  frames();
  expect(drawn()).toContain("New");
  h.core.press(BTN.RIGHT);
  frames();
  expect(drawn()).toContain("Zoom");
  expect(drawn()).not.toContain("New");
  expect(panels()).toHaveLength(1);
  h.core.press(BTN.RIGHT);
  frames();
  expect(drawn()).toContain("Docs");
  expect(drawn()).not.toContain("Zoom");
  h.core.press(BTN.RIGHT);
  frames();
  expect(drawn()).toContain("New");
  expect(drawn()).not.toContain("Docs");
  expect(panels()).toHaveLength(1);
});

test("UP and DOWN walk the enabled items", async () => {
  const log: string[] = [];
  await h.boot(() => <Bar log={log} />);
  h.core.press(BTN.DOWN);
  h.core.press(BTN.CIRCLE);
  frames();
  expect(focusedLabel()).toBe("New");
  h.core.press(BTN.DOWN);
  frames();
  expect(focusedLabel()).toBe("Open");
  // Quit is disabled: the walk skips it and wraps to the first item.
  h.core.press(BTN.DOWN);
  frames();
  expect(focusedLabel()).toBe("New");
  h.core.press(BTN.UP);
  frames();
  expect(focusedLabel()).toBe("Open");
});

test("CIRCLE on an item reports its value and closes, and focus goes back to the bar entry", async () => {
  const log: string[] = [];
  await h.boot(() => <Bar log={log} />);
  const trigger = triggerNode(rootMirror, "File") as NodeMirror;
  h.core.press(BTN.DOWN);
  h.core.press(BTN.CIRCLE);
  frames();
  h.core.press(BTN.DOWN);
  h.core.press(BTN.CIRCLE);
  frames();
  expect(log).toEqual(["open"]);
  expect(panels()).toHaveLength(0);
  expect(drawn()).not.toContain("New");
  expect(getFocused()).toBe(trigger as never);
});

test("CROSS closes the panel and restores the bar entry", async () => {
  const log: string[] = [];
  await h.boot(() => <Bar log={log} />);
  const trigger = triggerNode(rootMirror, "File") as NodeMirror;
  h.core.press(BTN.DOWN);
  h.core.press(BTN.CIRCLE);
  frames();
  h.core.press(BTN.CROSS);
  frames();
  expect(panels()).toHaveLength(0);
  expect(log).toEqual([]);
  expect(getFocused()).toBe(trigger as never);
});

test("the neighbour rule wraps at both ends", () => {
  const entries = [{ value: "a", node: {} as NodeMirror }, { value: "b", node: {} as NodeMirror }, { value: "c", node: {} as NodeMirror }];
  expect(neighbourEntry(entries, "c", 1)?.value).toBe("a");
  expect(neighbourEntry(entries, "a", -1)?.value).toBe("c");
  expect(neighbourEntry(entries, null, 1)?.value).toBe("a");
});

test("mutant: two panels mounted at once fail the one-panel check", async () => {
  // The defect body: the File menu carries its content twice, so opening it mounts two panels.
  function Doubled() {
    return (
      <View className={ROOT}>
        <Menubar>
          <MenubarMenu value="file">
            <MenubarTrigger>File</MenubarTrigger>
            <MenubarContent><MenubarItem value="new">New</MenubarItem></MenubarContent>
            <MenubarContent><MenubarItem value="open">Open</MenubarItem></MenubarContent>
          </MenubarMenu>
        </Menubar>
      </View>
    );
  }
  await h.boot(() => <Doubled />);
  h.core.press(BTN.DOWN);
  h.core.press(BTN.CIRCLE);
  frames();
  expect(panels().length).toBe(2);
});
