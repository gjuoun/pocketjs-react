import { afterEach, expect, test } from "bun:test";
import { BTN, focusNode, getFocused } from "@pocketjs/framework/input";
import { View } from "../../src/index.ts";
import { rootMirror, type NodeMirror } from "../../src/internal/pocket.ts";
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from "../../src/native/navigation-menu.tsx";
import { useState } from "react";
import { Label } from "../../src/native/label.tsx";
import { within } from "../../src/primitives/anchored.tsx";
import { topLayer } from "../../src/primitives/layer-stack.ts";
import { geometryFor, walk, type Rect } from "../../tools/qa/acceptance/geometry.ts";
import { triggerNode } from "../../tools/qa/acceptance/interaction.ts";
import { harness, ROOT, settle, tick } from "./support.ts";

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
async function press(key: number) { h.core.press(key); await tick(); await settle(h.core); }
async function frames(n = 6): Promise<void> { await tick(); for (let i = 0; i < n; i++) { h.core.step(0); h.core.render(); } }
const drawn = () => h.core.texts().map((t) => t.text);


function Nav(props: { picks: string[] }) {
  const [open, setOpen] = useState("");
  return (
    <View className={ROOT}>
      <NavigationMenu value={open} onValueChange={setOpen}>
        <NavigationMenuList>
          <NavigationMenuItem value="products">
            <NavigationMenuTrigger>Products</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink value="hardware" onSelect={(v) => props.picks.push(v)}>Hardware</NavigationMenuLink>
              <NavigationMenuLink value="software" onSelect={(v) => props.picks.push(v)}>Software</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem value="support">
            <NavigationMenuTrigger>Support</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink value="chat" onSelect={(v) => props.picks.push(v)}>Chat</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
      <Label>{open ? "Open: " + open : "Closed"}</Label>
    </View>
  );
}

test("CIRCLE on a trigger opens its panel below the bar; the panel's links are drawn", async () => {
  await h.boot(() => <Nav picks={[]} />);
  expect(drawn()).not.toContain("Hardware");
  focusNode(triggerNode(rootMirror, "Products") as never);
  await press(BTN.CIRCLE);
  await frames();
  expect(drawn()).toContain("Hardware");
  expect(drawn()).toContain("Open: products");
});

test("opening a panel moves no bar item: the triggers keep their rects", async () => {
  await h.boot(() => <Nav picks={[]} />);
  const before = ["Products", "Support"].map((l) => geometryFor(h.core).rect(triggerNode(rootMirror, l) as NodeMirror)!);
  focusNode(triggerNode(rootMirror, "Products") as never);
  await press(BTN.CIRCLE);
  await frames();
  const after = ["Products", "Support"].map((l) => geometryFor(h.core).rect(triggerNode(rootMirror, l) as NodeMirror)!);
  expect(after).toEqual(before);
});

test("only one panel is open: opening Support after Products (closed by CROSS) draws Chat and not Hardware", async () => {
  await h.boot(() => <Nav picks={[]} />);
  focusNode(triggerNode(rootMirror, "Products") as never);
  await press(BTN.CIRCLE);
  await frames();
  await press(BTN.CROSS);
  await frames();
  expect(drawn()).not.toContain("Hardware");
  focusNode(triggerNode(rootMirror, "Support") as never);
  await press(BTN.CIRCLE);
  await frames();
  expect(drawn()).toContain("Chat");
  expect(drawn()).not.toContain("Hardware");
});

test("a tap outside the open panel closes it and is swallowed", async () => {
  await h.boot(() => <Nav picks={[]} />);
  focusNode(triggerNode(rootMirror, "Products") as never);
  await press(BTN.CIRCLE);
  await frames();
  const b = geometryFor(h.core).rect(triggerNode(rootMirror, "Support") as NodeMirror)!;
  tap(b.x + 6, b.y + Math.floor(b.h / 2));
  await frames();
  expect(drawn()).not.toContain("Hardware");
  expect(topLayer()).toBeUndefined();
});

test("CIRCLE on a link reports its value and closes the panel", async () => {
  const picks: string[] = [];
  await h.boot(() => <Nav picks={picks} />);
  focusNode(triggerNode(rootMirror, "Products") as never);
  await press(BTN.CIRCLE);
  await frames();
  focusNode(triggerNode(rootMirror, "Software") as never);
  await press(BTN.CIRCLE);
  await frames();
  expect(picks).toEqual(["software"]);
  expect(drawn()).not.toContain("Software");
});
