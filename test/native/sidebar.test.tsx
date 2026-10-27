import { afterEach, expect, test } from "bun:test";
import { BTN, getFocused } from "@pocketjs/framework/input";
import { useState } from "react";
import { View } from "../../src/index.ts";
import { rootMirror, type NodeMirror } from "../../src/internal/pocket.ts";
import { geometryFor, walk, type Rect } from "../../tools/qa/acceptance/geometry.ts";
import { triggerNode } from "../../tools/qa/acceptance/interaction.ts";
import { percentOf } from "../../src/native/percent.ts";
import { Sidebar, sidebarOrder, type SidebarGroup } from "../../src/native/sidebar.tsx";
import { harness, ROOT } from "./support.ts";

const h = harness();
afterEach(() => h.dispose());

const GROUPS: SidebarGroup[] = [
  { heading: "Workspace", items: [{ value: "home", label: "Home", icon: "H" }, { value: "inbox", label: "Inbox", icon: "I" }] },
  { heading: "Account", items: [{ value: "settings", label: "Settings", icon: "S" }] },
];

function rectOfText(label: string): Rect {
  const n = triggerNode(rootMirror, label);
  if (!n) throw new Error("no element " + label);
  const r = geometryFor(h.core).rect(n);
  if (!r) throw new Error("no rect for " + label);
  return r;
}
function rail(): Rect {
  let found: NodeMirror | undefined;
  walk(rootMirror, (n) => { if (!found && n.debugName === "sidebar") found = n; });
  const r = found && geometryFor(h.core).rect(found);
  if (!r) throw new Error("no rail");
  return r;
}
function parentWidth(): number {
  const r = rail();
  let parent: NodeMirror | undefined;
  walk(rootMirror, (n) => { if (!parent && n.debugName === "sidebar") parent = n.parent ?? undefined; });
  const p = parent && geometryFor(h.core).rect(parent);
  if (!p) throw new Error("no parent of the rail (rail " + r.w + ")");
  return p.w;
}
function frames(n: number) { for (let i = 0; i < n; i++) { h.core.step(0); h.core.render(); } }
function focusedIs(label: string): boolean {
  return getFocused() === (triggerNode(rootMirror, label) as never);
}

test("the order a step walks: the toggle, then every item in group order", () => {
  expect(sidebarOrder(GROUPS)).toEqual(["__toggle", "home", "inbox", "settings"]);
});

test("the expanded rail is 30 percent of its parent, resolved by the library", async () => {
  await h.boot(() => <View className={ROOT}><Sidebar groups={GROUPS} defaultValue="home" /></View>);
  frames(3);
  expect(rail().w).toBe(percentOf(30, parentWidth()));
});

test("collapsed, the rail is 10 percent of its parent, the labels go, and the icons stay", async () => {
  await h.boot(() => <View className={ROOT}><Sidebar groups={GROUPS} defaultValue="home" /></View>);
  frames(3);
  h.core.press(BTN.DOWN); // the toggle
  h.core.press(BTN.CIRCLE);
  frames(6);
  expect(rail().w).toBe(percentOf(10, parentWidth()));
  const texts = h.core.texts().map((t) => t.text);
  expect(texts).not.toContain("Inbox");
  expect(texts).not.toContain("Workspace");
  expect(texts).toContain("I");
  expect(texts).toContain("Show");
});

test("DOWN walks the toggle, then each item in order, and wraps from the last item to the toggle", async () => {
  await h.boot(() => <View className={ROOT}><Sidebar groups={GROUPS} defaultValue="home" /></View>);
  h.core.press(BTN.DOWN);
  expect(focusedIs("Hide")).toBe(true);
  h.core.press(BTN.DOWN);
  expect(focusedIs("Home")).toBe(true);
  h.core.press(BTN.DOWN);
  expect(focusedIs("Inbox")).toBe(true);
  h.core.press(BTN.DOWN);
  expect(focusedIs("Settings")).toBe(true);
  h.core.press(BTN.DOWN);
  expect(focusedIs("Hide")).toBe(true);
  h.core.press(BTN.UP);
  expect(focusedIs("Settings")).toBe(true);
});

test("LEFT and RIGHT stay on the focused item", async () => {
  await h.boot(() => <View className={ROOT}><Sidebar groups={GROUPS} defaultValue="home" /></View>);
  h.core.press(BTN.DOWN);
  h.core.press(BTN.DOWN);
  h.core.press(BTN.RIGHT);
  h.core.press(BTN.LEFT);
  expect(focusedIs("Home")).toBe(true);
});

test("CIRCLE on an item reports its value and marks it active; the toggle reports collapsed", async () => {
  const picked: string[] = [];
  const toggled: boolean[] = [];
  function App() {
    const [value, setValue] = useState("home");
    const [collapsed, setCollapsed] = useState(false);
    return (
      <View className={ROOT}>
        <Sidebar
          groups={GROUPS}
          value={value}
          onValueChange={(v) => { picked.push(v); setValue(v); }}
          collapsed={collapsed}
          onCollapsedChange={(c) => { toggled.push(c); setCollapsed(c); }}
        />
      </View>
    );
  }
  await h.boot(() => <App />);
  h.core.press(BTN.DOWN);
  h.core.press(BTN.DOWN);
  h.core.press(BTN.DOWN);
  h.core.press(BTN.CIRCLE);
  expect(picked).toEqual(["inbox"]);
  h.core.press(BTN.UP); // Home
  h.core.press(BTN.UP); // the toggle
  h.core.press(BTN.CIRCLE);
  expect(toggled).toEqual([true]);
  expect(picked).toEqual(["inbox"]);
});
