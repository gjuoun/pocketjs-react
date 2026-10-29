import { afterEach, expect, test } from "bun:test";
import { BTN, focusNode, getFocused } from "@pocketjs/framework/input";
import { Text, View } from "../../src/index.ts";
import { rootMirror, type NodeMirror } from "../../src/internal/pocket.ts";
import { Focusable } from "../../src/native/focusable.tsx";
import { ScrollArea, scrollToChild } from "../../src/native/scroll-area.tsx";
import { geometryFor, walk, type Rect } from "../../tools/qa/acceptance/geometry.ts";
import { triggerNode } from "../../tools/qa/acceptance/interaction.ts";
import { harness, ROOT } from "./support.ts";

const h = harness();
afterEach(() => h.dispose());
const ROWS = Array.from({ length: 100 }, (_, i) => "Row " + i);
const ROW_H = 24;
const HEIGHT = 96;
const VISIBLE = HEIGHT / ROW_H;

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
function mountedRows(): number[] {
  return nodes((n) => (n.debugName ?? "").startsWith("scroll-row:"))
    .map((n) => Number((n.debugName as string).slice("scroll-row:".length)))
    .sort((a, b) => a - b);
}
function drawn(): string[] { return h.core.texts().map((t) => t.text); }
function frames(n = 6): void { for (let i = 0; i < n; i++) { h.core.step(0); h.core.render(); } }
function focusedText(): string {
  const f = getFocused() as unknown as NodeMirror | null;
  if (!f) return "none";
  let found = "none";
  const visit = (n: NodeMirror): void => { if (found !== "none") return; if (typeof (n as { text?: unknown }).text === "string") { found = (n as unknown as { text: string }).text; return; } for (const k of n.children) visit(k); };
  visit(f);
  return found;
}

function List(props: { value?: number; onOffsetChange?: (o: number) => void }) {
  return (
    <View className={ROOT}>
      <ScrollArea height={HEIGHT} rowHeight={ROW_H} value={props.value} onOffsetChange={props.onOffsetChange}>
        {ROWS.map((row) => (
          <Focusable key={row} look="h-6 px-1 bg-white" debugName={"row:" + row}>
            <Text className="text-sm text-slate-900">{row}</Text>
          </Focusable>
        ))}
      </ScrollArea>
    </View>
  );
}

test("only the window is mounted: 100 rows cost 4 nodes, the first at index 0", async () => {
  await h.boot(() => <List />);
  expect(mountedRows()).toEqual([0, 1, 2, 3]);
  expect(nodes((n) => (n.debugName ?? "").startsWith("scroll-row:"))).toHaveLength(VISIBLE);
});

test("DOWN past the last visible row shifts the window and keeps the focused row inside the viewport", async () => {
  const offsets: number[] = [];
  await h.boot(() => <List onOffsetChange={(o) => offsets.push(o)} />);
  focusNode(triggerNode(rootMirror, "Row 0") as never);
  const view = nodes((n) => n.debugName === "scroll-area")[0];
  for (let i = 1; i <= 6; i++) {
    h.core.press(BTN.DOWN);
    frames();
    expect(focusedText()).toBe("Row " + i);
    const row = nodes((n) => n.debugName === "scroll-row:" + i)[0];
    expect(row).toBeDefined();
    const r = rectOf(row);
    const v = rectOf(view);
    expect(r.y).toBeGreaterThanOrEqual(v.y);
    expect(r.y + r.h).toBeLessThanOrEqual(v.y + v.h);
  }
  expect(offsets).toEqual([1, 2, 3]);
  expect(mountedRows()).toEqual([3, 4, 5, 6]);
});

test("UP walks the window back: the first row returns at the top", async () => {
  await h.boot(() => <List />);
  focusNode(triggerNode(rootMirror, "Row 0") as never);
  for (let i = 0; i < 5; i++) { h.core.press(BTN.DOWN); frames(2); }
  expect(focusedText()).toBe("Row 5");
  for (let i = 0; i < 5; i++) { h.core.press(BTN.UP); frames(2); }
  expect(focusedText()).toBe("Row 0");
  expect(mountedRows()).toEqual([0, 1, 2, 3]);
});

test("a held drag on a row scrolls by whole rows", async () => {
  await h.boot(() => <List />);
  frames();
  const row = rectOf(nodes((n) => n.debugName === "scroll-row:1")[0]);
  const x = row.x + 20;
  const y = row.y + Math.floor(row.h / 2);
  const q = ((globalThis as { __pocketPointer?: unknown[] }).__pocketPointer ??= []);
  q.push({ x, y, down: true });
  h.core.step(0);
  q.push({ x, y: y - ROW_H * 2, down: true, move: true });
  h.core.step(0);
  q.push({ x, y: y - ROW_H * 2, down: false });
  h.core.step(0);
  frames();
  expect(mountedRows()).toEqual([2, 3, 4, 5]);
});

test("scrollToChild keeps a visible row where it is and moves the window only when it must", () => {
  expect(scrollToChild(2, 4, 100, 0)).toBe(0);
  expect(scrollToChild(4, 4, 100, 0)).toBe(1);
  expect(scrollToChild(0, 4, 100, 10)).toBe(0);
  expect(scrollToChild(99, 4, 100, 0)).toBe(96);
  expect(scrollToChild(5, 4, 6, 0)).toBe(2);
});

test("the offset can be controlled: the app owns the window start", async () => {
  await h.boot(() => <List value={10} />);
  expect(mountedRows()).toEqual([10, 11, 12, 13]);
  expect(drawn()).toContain("Row 10");
});

test("mutant: a viewport that mounts every row fails the window count", async () => {
  // The defect body: no windowing, all 100 rows mounted.
  await h.boot(() => (
    <View className={ROOT}>
      <View className="w-full overflow-hidden flex-col bg-white" style={{ height: HEIGHT }}>
        {ROWS.map((row) => (
          <View key={row} className="w-full flex-col" debugName={"scroll-row:" + row}>
            <Focusable look="h-6 px-1 bg-white"><Text className="text-sm text-slate-900">{row}</Text></Focusable>
          </View>
        ))}
      </View>
    </View>
  ));
  expect(mountedRows()).toHaveLength(100);
});

test("mutant: a window that never shifts leaves the focused row behind", async () => {
  // The defect body: a fixed window of four rows with no controller: DOWN cannot leave it.
  await h.boot(() => (
    <View className={ROOT}>
      <View className="w-full overflow-hidden flex-col bg-white" style={{ height: HEIGHT }}>
        {ROWS.slice(0, 4).map((row) => (
          <View key={row} className="w-full flex-col" debugName={"scroll-row:" + row}>
            <Focusable look="h-6 px-1 bg-white" debugName={"row:" + row}><Text className="text-sm text-slate-900">{row}</Text></Focusable>
          </View>
        ))}
      </View>
    </View>
  ));
  focusNode(triggerNode(rootMirror, "Row 0") as never);
  for (let i = 0; i < 6; i++) { h.core.press(BTN.DOWN); frames(2); }
  expect(focusedText()).not.toBe("Row 6");
});
