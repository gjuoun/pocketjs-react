// Batch 4 step 19: the message-scroller shim. On the overlay core the list starts at its newest item and the start button
// brings the first one back; on the default core there is no range, so the list stays at the top.
import { afterEach, expect, test } from "bun:test";
import { BTN, focusNode } from "@pocketjs/framework/input";
import { createElement } from "react";
import * as MS from "../src/primitives/message-scroller.tsx";
import { type NodeMirror } from "../src/internal/pocket.ts";
import { mountTree, type Mounted } from "./batch4-support.ts";

const overlay = !!process.env.POCKETJS_CORE_ROOT;
let m: Mounted | undefined;
afterEach(() => {
  m?.dispose();
  m = undefined;
});

function tree() {
  const items = Array.from({ length: 20 }, (_, i) =>
    createElement(
      MS.MessageScroller.Item,
      { key: i, className: "h-[18px] w-full" },
      "M" + i,
    ),
  );
  return createElement(
    MS.MessageScroller.Root,
    { className: "w-[200px] h-[96px]" },
    createElement(MS.MessageScroller.Button, { direction: "start" }, "Top"),
    createElement(
      MS.MessageScroller.Viewport,
      { className: "w-full h-full" },
      createElement(MS.MessageScroller.Content, null, ...items),
    ),
  );
}

async function step(n = 4) {
  for (let i = 0; i < n; i++) {
    await new Promise((r) => setTimeout(r, 5));
    m!.core.step(0);
  }
  m!.core.render();
}

const texts = () => m!.core.texts().map((t) => t.text);

test.skipIf(!overlay)(
  "starts at the newest item and the start button brings the first back",
  async () => {
    m = await mountTree(tree(), [import.meta.path]);
    await step(6);
    expect(texts()).toContain("M19");
    expect(texts()).not.toContain("M0");
    const focusables = m!
      .nodes()
      .filter((x) => (x as { focusable?: boolean }).focusable) as NodeMirror[];
    focusNode(focusables[0]);
    m!.core.press(BTN.CIRCLE);
    await step(4);
    expect(texts()).toContain("M0");
  },
);

test("without nodeRect the list stays at the top", async () => {
  if (overlay) return;
  m = await mountTree(tree(), [import.meta.path]);
  await step(6);
  expect(texts()).toContain("M0");
  expect(texts()).not.toContain("M19");
});
