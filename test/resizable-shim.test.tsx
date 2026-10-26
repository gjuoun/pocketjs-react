// Batch 4 step 12: the resizable shim. A 40 px pointer drag on the focusable separator moves the boundary by 40 px, and a
// RIGHT press on the focused separator moves it 5%. The boundary is read from where the B label is drawn.
import { afterEach, expect, test } from "bun:test";
import { BTN, focusNode } from "@pocketjs/framework/input";
import { createElement } from "react";
import * as RP from "../src/primitives/react-resizable-panels.tsx";
import { type NodeMirror } from "../src/internal/pocket.ts";
import { measureBox } from "../src/primitives/anchor.ts";
import { mountTree, type Mounted } from "./batch4-support.ts";

const g = globalThis as { __pocketPointer?: unknown };
const tick = () => new Promise((r) => setTimeout(r, 5));
let m: Mounted | undefined;
afterEach(() => {
  m?.dispose();
  m = undefined;
  delete g.__pocketPointer;
});

function tree() {
  return createElement(
    RP.Group,
    { className: "w-[240px] h-[40px]" },
    createElement(
      RP.Panel,
      { defaultSize: 50 },
      createElement("div", { className: "h-full" }, "A"),
    ),
    createElement(RP.Separator, { className: "w-[1px] h-full bg-slate-900" }),
    createElement(
      RP.Panel,
      { defaultSize: 50 },
      createElement("div", { className: "h-full" }, "B"),
    ),
  );
}

async function frames(n: number) {
  for (let i = 0; i < n; i++) {
    await tick();
    m!.core.step(0);
  }
  m!.core.render();
}

const labelX = (label: string) =>
  m!.core.texts().find((t) => t.text === label)?.x ?? NaN;
const separator = (): NodeMirror =>
  m!.nodes().find((n) => {
    const b = m!.box(n);
    return !!b && b.w === 1 && b.h === 40;
  }) as NodeMirror;

test("the boundary starts at the halfway point (about 120 px)", async () => {
  m = await mountTree(tree(), [import.meta.path]);
  await frames(3);
  expect(Math.abs(labelX("B") - 120)).toBeLessThanOrEqual(2);
});

test("a 40 px drag moves the boundary to about 160 px", async () => {
  m = await mountTree(tree(), [import.meta.path]);
  await frames(3);
  const sep = separator();
  const b = m!.box(sep)!;
  const x = b.x;
  const y = b.y + 20;
  g.__pocketPointer = [{ x, y, down: true }];
  await frames(3);
  g.__pocketPointer = [{ x: x + 40, y, down: true }];
  await frames(3);
  g.__pocketPointer = [{ x: x + 40, y, down: false }];
  await frames(3);
  expect(Math.abs(labelX("B") - 160)).toBeLessThanOrEqual(2);
});

test("RIGHT on the focused separator moves the boundary 5%", async () => {
  m = await mountTree(tree(), [import.meta.path]);
  await frames(3);
  focusNode(separator());
  m!.core.press(BTN.RIGHT);
  await frames(3);
  expect(Math.abs(labelX("B") - 132)).toBeLessThanOrEqual(2);
});

void measureBox;
