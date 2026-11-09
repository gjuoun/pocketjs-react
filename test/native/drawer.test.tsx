import { afterEach, expect, test } from "bun:test";
import { BTN, focusNode, getFocused } from "@pocketjs/framework/input";
import { View } from "../../src/index.ts";
import { rootMirror, SCREEN_H, SCREEN_W, type NodeMirror } from "../../src/internal/pocket.ts";
import { Button } from "../../src/native/button.tsx";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerTitle, DrawerTrigger, DRAWER_SIZE } from "../../src/native/drawer.tsx";
import { Sheet, SheetContent, SheetTitle } from "../../src/native/sheet.tsx";
import { geometryFor, walk, type Rect } from "../../tools/qa/acceptance/geometry.ts";
import { triggerNode } from "../../tools/qa/acceptance/interaction.ts";
import { harness, ROOT } from "./support.ts";

const h = harness();
afterEach(() => h.dispose());
// The stock core draws a translucent wash at boot; the handle's exact colour is asserted on the overlay core only.
const OVERLAY = !!process.env.POCKETJS_CORE_ROOT;
const HANDLE = "#cbd5e1";
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

function App(props: { open?: boolean; counts: { behind: number; saved: number } }) {
  return (
    <View className={ROOT}>
      <Button onPress={() => { props.counts.behind++; }}>Behind</Button>
      <Drawer defaultOpen={props.open}>
        <DrawerTrigger>Open drawer</DrawerTrigger>
        <DrawerContent>
          <DrawerTitle>Filters</DrawerTitle>
          <DrawerDescription>Pick what to show.</DrawerDescription>
          <DrawerFooter>
            <DrawerClose>Close</DrawerClose>
            <Button onPress={() => { props.counts.saved++; }}>Apply</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </View>
  );
}

test("the trigger opens a panel docked to the bottom, 60 percent of the screen tall", async () => {
  await h.boot(() => <App counts={{ behind: 0, saved: 0 }} />);
  expect(drawn()).not.toContain("Filters");
  focusNode(triggerNode(rootMirror, "Open drawer") as never);
  h.core.press(BTN.CIRCLE);
  frames();
  expect(drawn()).toContain("Filters");
  const r = rectOf("drawer-panel");
  expect(r.w).toBe(SCREEN_W);
  expect(r.h).toBe(Math.round((SCREEN_H * DRAWER_SIZE) / 100));
  expect(r.y).toBe(SCREEN_H - r.h);
  expect(r.x).toBe(0);
});

test("the handle bar is 32 px wide and centred at the top of the panel", async () => {
  await h.boot(() => <App counts={{ behind: 0, saved: 0 }} />);
  focusNode(triggerNode(rootMirror, "Open drawer") as never);
  h.core.press(BTN.CIRCLE);
  frames();
  const bar = rectOf("drawer-handle");
  const panel = rectOf("drawer-panel");
  expect(bar.w).toBe(32);
  expect(bar.h).toBe(4);
  expect(bar.x - panel.x).toBe(Math.round((panel.w - bar.w) / 2));
  expect(bar.y - panel.y).toBe(16); // the panel's p-4
  h.core.render();
  const mid = { x: bar.x + Math.floor(bar.w / 2), y: bar.y + 1 };
  if (OVERLAY) expect(h.core.pixel(mid.x, mid.y)).toBe(HANDLE);
  else expect(h.core.pixel(mid.x, mid.y)).not.toBe(WHITE);
});

test("CROSS closes it and gives focus back to the trigger", async () => {
  await h.boot(() => <App counts={{ behind: 0, saved: 0 }} />);
  const trigger = triggerNode(rootMirror, "Open drawer") as NodeMirror;
  focusNode(trigger as never);
  h.core.press(BTN.CIRCLE);
  frames();
  h.core.press(BTN.CROSS);
  frames();
  expect(drawn()).not.toContain("Filters");
  expect(getFocused()).toBe(trigger as never);
});

test("a tap on the scrim closes it and is swallowed", async () => {
  const counts = { behind: 0, saved: 0 };
  await h.boot(() => <App open counts={counts} />);
  frames();
  expect(rectOf("drawer-panel").y).toBeGreaterThan(60);
  tap(20, 10); // the Behind button, above the panel
  frames();
  expect(drawn()).not.toContain("Filters");
  expect(counts.behind).toBe(0);
});

test("mutant: a drawer that docks right fails the bottom-docking check", async () => {
  // The defect body: the panel through SheetContent side="right" (full height at the right edge), not the bottom.
  function Right() {
    return (
      <View className={ROOT}>
        <Sheet defaultOpen>
          <SheetContent side="right" size={75} panelName="drawer-panel"><SheetTitle>Filters</SheetTitle></SheetContent>
        </Sheet>
      </View>
    );
  }
  await h.boot(() => <Right />);
  frames();
  const r = rectOf("drawer-panel");
  expect(r.x).toBe(SCREEN_W - r.w);
  expect(r.h).toBe(SCREEN_H);
  expect(r.y).not.toBe(SCREEN_H - Math.round((SCREEN_H * DRAWER_SIZE) / 100));
});
