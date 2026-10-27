import { afterEach, expect, test } from "bun:test";
import { BTN, focusNode, getFocused } from "@pocketjs/framework/input";
import { View } from "../../src/index.ts";
import { rootMirror, SCREEN_H, SCREEN_W, type NodeMirror } from "../../src/internal/pocket.ts";
import { Button } from "../../src/native/button.tsx";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetTitle, SheetTrigger, type SheetSide } from "../../src/native/sheet.tsx";
import { within } from "../../src/primitives/anchored.tsx";
import { geometryFor, walk, type Rect } from "../../tools/qa/acceptance/geometry.ts";
import { triggerNode } from "../../tools/qa/acceptance/interaction.ts";
import { harness, ROOT } from "./support.ts";

const h = harness();
afterEach(() => h.dispose());
const WHITE = "#ffffff";

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
/** A tap at (x, y): press down, release, settle, as a mouse click does (the same queue the pointer pump drains). */
function tap(x: number, y: number): void {
  const q = ((globalThis as { __pocketPointer?: unknown[] }).__pocketPointer ??= []);
  q.push({ x, y, down: true });
  h.core.step(0);
  q.push({ x, y, down: false });
  h.core.step(0);
  h.core.step(0);
}
function frames(n = 6): void { for (let i = 0; i < n; i++) { h.core.step(0); h.core.render(); } }

interface Counts { behind: number; save: number }
function App(props: { side?: SheetSide; size?: number; open?: boolean; counts: Counts }) {
  return (
    <View className={ROOT}>
      <Button onPress={() => { props.counts.behind++; }}>Behind</Button>
      <Sheet defaultOpen={props.open}>
        <SheetTrigger>Open</SheetTrigger>
        <SheetContent side={props.side} size={props.size}>
          <SheetTitle>Account</SheetTitle>
          <SheetDescription>Edit your details</SheetDescription>
          <SheetFooter>
            <SheetClose>Close</SheetClose>
            <Button onPress={() => { props.counts.save++; }}>Save</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </View>
  );
}

const drawn = () => h.core.texts().map((t) => t.text);

test("CIRCLE on the trigger opens the sheet and draws its title", async () => {
  await h.boot(() => <App counts={{ behind: 0, save: 0 }} />);
  expect(drawn()).not.toContain("Account");
  focusNode(triggerNode(rootMirror, "Open") as never);
  h.core.press(BTN.CIRCLE);
  frames();
  expect(drawn()).toContain("Account");
  expect(drawn()).toContain("Edit your details");
});

test("the default panel is 75 percent of the screen wide, docked right, full height", async () => {
  await h.boot(() => <App open counts={{ behind: 0, save: 0 }} />);
  frames();
  const r = rectOf("sheet-panel");
  expect(r.w).toBe(Math.round((SCREEN_W * 75) / 100));
  expect(r.x).toBe(SCREEN_W - r.w);
  expect(r.h).toBe(SCREEN_H);
  expect(r.y).toBe(0);
});

test("size resolves against the parent on the left edge: 50 percent of the width, docked left", async () => {
  await h.boot(() => <App open side="left" size={50} counts={{ behind: 0, save: 0 }} />);
  frames();
  const r = rectOf("sheet-panel");
  expect(r.w).toBe(SCREEN_W / 2);
  expect(r.x).toBe(0);
  expect(r.h).toBe(SCREEN_H);
});

test("size resolves against the height on the bottom edge: 50 percent of the height", async () => {
  await h.boot(() => <App open side="bottom" size={50} counts={{ behind: 0, save: 0 }} />);
  frames();
  const r = rectOf("sheet-panel");
  expect(r.h).toBe(SCREEN_H / 2);
  expect(r.y).toBe(SCREEN_H - r.h);
  expect(r.w).toBe(SCREEN_W);
});

test("the d-pad stays inside the open sheet: focus never leaves its panel", async () => {
  await h.boot(() => <App open counts={{ behind: 0, save: 0 }} />);
  frames();
  const panel = nodeNamed("sheet-panel")!;
  for (const b of [BTN.DOWN, BTN.LEFT, BTN.UP, BTN.RIGHT, BTN.DOWN]) { h.core.press(b); frames(2); expect(within(panel, getFocused() as unknown as NodeMirror)).toBe(true); }
});

test("CROSS closes the sheet and gives focus back to the trigger", async () => {
  await h.boot(() => <App counts={{ behind: 0, save: 0 }} />);
  const trigger = triggerNode(rootMirror, "Open") as NodeMirror;
  focusNode(trigger as never);
  h.core.press(BTN.CIRCLE);
  frames();
  h.core.press(BTN.CROSS);
  frames();
  expect(drawn()).not.toContain("Account");
  expect(getFocused()).toBe(trigger as never);
});

test("a tap on the scrim closes the sheet and is swallowed: the button behind does not press", async () => {
  const counts = { behind: 0, save: 0 };
  await h.boot(() => <App open counts={counts} />);
  frames();
  expect(rectOf("sheet-panel").x).toBeGreaterThan(100); // docked right: the scrim covers the Behind button
  tap(20, 15); // the Behind button's area, on the scrim, outside the panel
  frames();
  expect(drawn()).not.toContain("Account");
  expect(counts.behind).toBe(0);
});

test("the scrim dims the page outside the panel while open; the panel surface stays white", async () => {
  await h.boot(() => <App counts={{ behind: 0, save: 0 }} />);
  h.core.render();
  expect(h.core.pixel(5, 250)).toBe(WHITE);
  focusNode(triggerNode(rootMirror, "Open") as never);
  h.core.press(BTN.CIRCLE);
  frames();
  expect(h.core.pixel(5, 250)).not.toBe(WHITE);
  expect(h.core.pixel(SCREEN_W - 10, 4)).toBe(WHITE);
});
