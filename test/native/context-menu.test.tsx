import { afterEach, expect, test } from "bun:test";
import { BTN, focusNode, getFocused } from "@pocketjs/framework/input";
import { useState } from "react";
import { Text, View } from "../../src/index.ts";
import { rootMirror, type NodeMirror } from "../../src/internal/pocket.ts";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "../../src/native/context-menu.tsx";
import { Focusable } from "../../src/native/focusable.tsx";
import { LONG_PRESS_FRAMES } from "../../src/input/pointer.ts";
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
function down(x: number, y: number): void { const q = ((globalThis as { __pocketPointer?: unknown[] }).__pocketPointer ??= []); q.push({ x, y, down: true }); }
function up(x: number, y: number): void { const q = ((globalThis as { __pocketPointer?: unknown[] }).__pocketPointer ??= []); q.push({ x, y, down: false }); }

function App(props: { log: string[] }) {
  return (
    <View className={ROOT}>
      <ContextMenu onSelect={(v) => props.log.push(v)}>
        <ContextMenuTrigger><Text className="text-sm text-slate-900">Report item</Text></ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem value="copy">Copy</ContextMenuItem>
          <ContextMenuItem value="rename">Rename</ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem value="delete" disabled>Delete</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </View>
  );
}

test("a long press on the region opens the menu at the press point", async () => {
  const log: string[] = [];
  await h.boot(() => <App log={log} />);
  expect(drawn()).not.toContain("Copy");
  const t = rectOf("context-menu-trigger");
  const x = t.x + 40;
  const y = t.y + Math.floor(t.h / 2);
  down(x, y);
  for (let i = 0; i < LONG_PRESS_FRAMES + 3; i++) h.core.step(0);
  frames();
  up(x, y);
  h.core.step(0);
  expect(drawn()).toContain("Copy");
  const panel = rectOf("context-menu-panel");
  expect(Math.abs(panel.x - x)).toBeLessThanOrEqual(2);
  expect(panel.y).toBeGreaterThanOrEqual(y);
});

test("TRIANGLE on the focused region opens the menu centred under it", async () => {
  const log: string[] = [];
  await h.boot(() => <App log={log} />);
  focusNode(triggerNode(rootMirror, "Report item") as never);
  h.core.press(BTN.TRIANGLE);
  frames();
  expect(drawn()).toContain("Copy");
  const panel = rectOf("context-menu-panel");
  const t = rectOf("context-menu-trigger");
  expect(Math.abs(panel.x + panel.w / 2 - (t.x + t.w / 2))).toBeLessThanOrEqual(2);
  expect(panel.y).toBeGreaterThanOrEqual(t.y + t.h);
});

test("the arrows walk the enabled items and CIRCLE reports the value and closes", async () => {
  const log: string[] = [];
  await h.boot(() => <App log={log} />);
  focusNode(triggerNode(rootMirror, "Report item") as never);
  h.core.press(BTN.TRIANGLE);
  frames();
  h.core.press(BTN.DOWN);
  h.core.press(BTN.CIRCLE);
  frames();
  expect(log).toEqual(["rename"]);
  expect(drawn()).not.toContain("Copy");
  expect(getFocused()).toBe(triggerNode(rootMirror, "Report item") as never);
});

test("CROSS closes the menu with no selection", async () => {
  const log: string[] = [];
  await h.boot(() => <App log={log} />);
  focusNode(triggerNode(rootMirror, "Report item") as never);
  h.core.press(BTN.TRIANGLE);
  frames();
  h.core.press(BTN.CROSS);
  frames();
  expect(drawn()).not.toContain("Copy");
  expect(log).toEqual([]);
});

test("mutant: an item whose press reports nothing leaves onSelect empty (the report check above fails on it)", async () => {
  // The defect body: an item row with no selection handler.
  function Dead(props: { log: string[] }) {
    const [open, setOpen] = useState(false);
    return (
      <View className={ROOT}>
        <ContextMenu open={open} onOpenChange={setOpen} onSelect={(v) => props.log.push(v)}>
          <ContextMenuTrigger><Text className="text-sm text-slate-900">Report item</Text></ContextMenuTrigger>
          <ContextMenuContent>
            <Focusable look="h-8 px-2 flex-row items-center bg-white"><Text className="text-sm text-slate-900">Copy</Text></Focusable>
          </ContextMenuContent>
        </ContextMenu>
      </View>
    );
  }
  const log: string[] = [];
  await h.boot(() => <Dead log={log} />);
  focusNode(triggerNode(rootMirror, "Report item") as never);
  h.core.press(BTN.TRIANGLE);
  frames();
  expect(drawn()).toContain("Copy");
  focusNode(triggerNode(rootMirror, "Copy") as never);
  h.core.press(BTN.CIRCLE);
  frames();
  expect(log).toEqual([]);
  expect(drawn()).toContain("Copy");
});
