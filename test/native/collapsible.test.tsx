import { afterEach, expect, test } from "bun:test";
import { BTN } from "@pocketjs/framework/input";
import { useState } from "react";
import { Text, View } from "../../src/index.ts";
import { rootMirror, type NodeMirror } from "../../src/internal/pocket.ts";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../../src/native/collapsible.tsx";
import { geometryFor, walk, type Rect } from "../../tools/qa/acceptance/geometry.ts";
import { triggerNode } from "../../tools/qa/acceptance/interaction.ts";
import { harness, ROOT } from "./support.ts";

const h = harness();
afterEach(() => h.dispose());
// The chevron's arm ink is exact on the overlay core only (the stock core draws a translucent wash at boot).
const OVERLAY = !!process.env.POCKETJS_CORE_ROOT;
const WHITE = "#ffffff";

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

function App(props: { log?: boolean[]; defaultOpen?: boolean }) {
  return (
    <View className={ROOT}>
      <Collapsible defaultOpen={props.defaultOpen} onOpenChange={(o) => props.log?.push(o)}>
        <CollapsibleTrigger>Show details</CollapsibleTrigger>
        <CollapsibleContent>
          <Text className="text-sm text-slate-900">Ships in two days.</Text>
        </CollapsibleContent>
      </Collapsible>
    </View>
  );
}

test("closed: the trigger and its chevron are drawn, and the region is not mounted", async () => {
  await h.boot(() => <App />);
  expect(drawn()).toContain("Show details");
  expect(drawn()).not.toContain("Ships in two days.");
  expect(nodes((n) => n.debugName === "collapsible-content")).toHaveLength(0);
});

test("CIRCLE opens the region: its text is drawn, and it mounts under the trigger", async () => {
  await h.boot(() => <App />);
  const trigger = rectOf(nodes((n) => n.debugName === "collapsible-trigger")[0]);
  h.core.press(BTN.DOWN);
  h.core.press(BTN.CIRCLE);
  frames();
  expect(drawn()).toContain("Ships in two days.");
  const content = nodes((n) => n.debugName === "collapsible-content");
  expect(content).toHaveLength(1);
  expect(rectOf(content[0]).y).toBeGreaterThanOrEqual(trigger.y + trigger.h);
  h.core.press(BTN.CIRCLE);
  frames();
  expect(drawn()).not.toContain("Ships in two days.");
});

/** Pixels that are not the page white inside a box: the region's drawn ink. */
function inkIn(r: Rect): number {
  let n = 0;
  for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (h.core.pixel(x, y) !== WHITE) n++;
  return n;
}

test("open then closed adds then removes ink: the region's area is white again", async () => {
  await h.boot(() => <App />);
  h.core.press(BTN.DOWN);
  h.core.press(BTN.CIRCLE);
  frames();
  const r = rectOf(nodes((n) => n.debugName === "collapsible-content")[0]);
  h.core.render();
  expect(inkIn(r)).toBeGreaterThan(0);
  h.core.press(BTN.CIRCLE);
  frames();
  h.core.render();
  expect(inkIn(r)).toBe(0);
});

test("controlled: every toggle reports the next open state", async () => {
  const log: boolean[] = [];
  function Controlled() {
    const [open, setOpen] = useState(false);
    return (
      <View className={ROOT}>
        <Collapsible open={open} onOpenChange={(o) => { log.push(o); setOpen(o); }}>
          <CollapsibleTrigger>Show details</CollapsibleTrigger>
          <CollapsibleContent><Text className="text-sm text-slate-900">Ships in two days.</Text></CollapsibleContent>
        </Collapsible>
      </View>
    );
  }
  await h.boot(() => <Controlled />);
  h.core.press(BTN.DOWN);
  h.core.press(BTN.CIRCLE);
  frames();
  expect(log).toEqual([true]);
  expect(drawn()).toContain("Ships in two days.");
  h.core.press(BTN.CIRCLE);
  frames();
  expect(log).toEqual([true, false]);
});

test("the chevron points right closed and down open (overlay: the rotated arms are drawn)", async () => {
  if (!OVERLAY) return;
  await h.boot(() => <App />);
  const chev = () => rectOf(nodes((n) => n.debugName === "chevron")[0]);
  const centroid = () => {
    const r = chev();
    let sx = 0, sy = 0, n = 0;
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (h.core.pixel(x, y) === "#0f172a") { sx += x + 0.5 - (r.x + r.w / 2); sy += y + 0.5 - (r.y + r.h / 2); n++; }
    return { x: sx / n, y: sy / n };
  };
  const closed = centroid();
  h.core.press(BTN.DOWN);
  h.core.press(BTN.CIRCLE);
  frames(20);
  const open = centroid();
  expect(closed.x).toBeLessThan(0);
  expect(open.y).toBeLessThan(0);
});

test("the trigger keeps its own focus and a press toggles it (mutant: an always-mounted region leaves its ink closed)", async () => {
  // The defect body: the region is mounted even while closed, so the "not drawn when closed" check above fails on it.
  const Always = () => (
    <View className={ROOT}>
      <View className="flex-col">
        <View className="h-9 px-2 flex-row items-center justify-between">
          <Text className="text-sm font-bold text-slate-900">Show details</Text>
        </View>
        <View className="flex-col gap-1 px-2 pb-2">
          <Text className="text-sm text-slate-900">Ships in two days.</Text>
        </View>
      </View>
    </View>
  );
  await h.boot(() => <Always />);
  expect(drawn()).toContain("Ships in two days.");
});
