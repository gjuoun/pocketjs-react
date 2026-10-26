// Batch 4 step 11: ScrollArea on the offset viewport. The thumb height and the drag scroll are pixel assertions on the
// overlay core (nodeRect gives the content its real extent). On the default core the range is 0 and nothing moves.
import { afterEach, expect, test } from "bun:test";
import { createElement } from "react";
import * as SA from "../src/primitives/scroll-area.tsx";
import { rootMirror, type NodeMirror } from "../src/internal/pocket.ts";
import { measureBox } from "../src/primitives/anchor.ts";
import { mountTree, type Mounted } from "./batch4-support.ts";

const overlay = !!process.env.POCKETJS_CORE_ROOT;
const tick = () => new Promise((r) => setTimeout(r, 5));
const g = globalThis as { __pocketPointer?: unknown };

let m: Mounted | undefined;
afterEach(() => {
  m?.dispose();
  m = undefined;
  delete g.__pocketPointer;
});

function tree() {
  const rows = Array.from({ length: 10 }, (_, i) =>
    createElement(
      "div",
      { key: i, className: "h-[18px] w-full shrink-0" },
      "Row " + i,
    ),
  );
  return createElement(
    SA.Root,
    { className: "h-[96px] w-[200px]" },
    createElement(
      SA.Viewport,
      { className: "w-full h-full" },
      createElement("div", { className: "w-full flex-col" }, rows),
    ),
    createElement(
      SA.ScrollAreaScrollbar,
      { orientation: "vertical" },
      createElement(SA.ScrollAreaThumb, {
        className: "bg-slate-200 rounded-[8px]",
      }),
    ),
    createElement(SA.Corner),
  );
}

async function frames(n: number) {
  for (let i = 0; i < n; i++) {
    await tick();
    m!.core.step(0);
  }
  m!.core.render();
}

function rowY(): number {
  const row = m!.core.texts().find((t) => t.text === "Row 4");
  return row?.y ?? NaN;
}

function thumbNode(): NodeMirror | undefined {
  return m!.nodes().find((n) => {
    const b = m!.box(n);
    return !!b && b.w === 10 && b.h < 96;
  });
}

test("the frame clips and the content is laid out at the top", async () => {
  m = await mountTree(tree(), [import.meta.path]);
  await frames(3);
  // Row 9 sits at y 162, below the 96 px clip: it is not drawn.
  expect(m!.core.texts().map((t) => t.text)).not.toContain("Row 9");
  expect(rowY()).toBeGreaterThan(-1);
});

test("without nodeRect the range is 0 and a thumb drag does not move the content", async () => {
  if (overlay) return;
  m = await mountTree(tree(), [import.meta.path]);
  await frames(3);
  const before = rowY();
  const thumb = thumbNode();
  expect(thumb).toBeUndefined();
  expect(rowY()).toBe(before);
});

test.skipIf(!overlay)(
  "the thumb is 51 px for a 96 px view over 180 px of content",
  async () => {
    m = await mountTree(tree(), [import.meta.path]);
    await frames(3);
    const thumb = thumbNode();
    expect(thumb).toBeDefined();
    expect(Math.abs((m!.box(thumb!)?.h ?? 0) - 51)).toBeLessThanOrEqual(2);
  },
);

test.skipIf(!overlay)(
  "a 20 px thumb drag scrolls the content 37 to 39 px",
  async () => {
    m = await mountTree(tree(), [import.meta.path]);
    await frames(3);
    const thumb = thumbNode()!;
    const b = m!.box(thumb)!;
    const x = b.x + 5;
    const y0 = b.y + 25;
    const start = rowY();
    const push = (y: number, down: boolean) => {
      g.__pocketPointer = [{ x, y, down }];
    };
    push(y0, true);
    await frames(3);
    push(y0 + 20, true);
    await frames(3);
    push(y0 + 20, false);
    await frames(3);
    const moved = start - rowY();
    expect(moved).toBeGreaterThanOrEqual(37);
    expect(moved).toBeLessThanOrEqual(39);
  },
);

void rootMirror;
