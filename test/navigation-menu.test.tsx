// Batch 4 step 9: NavigationMenu opens its content from a focusable trigger press, the second trigger swaps it, and a Link
// inside the panel closes the menu. The state is read from the text the core draws.
import { afterEach, expect, test } from "bun:test";
import { BTN, focusNode } from "@pocketjs/framework/input";
import { createElement } from "react";
import * as NM from "../src/primitives/navigation-menu.tsx";
import { type NodeMirror } from "../src/internal/pocket.ts";
import { mountTree, type Mounted } from "./batch4-support.ts";

let m: Mounted | undefined;
afterEach(() => {
  m?.dispose();
  m = undefined;
});

function tree() {
  return createElement(
    NM.Root,
    { className: "flex-col" },
    createElement(
      NM.List,
      null,
      createElement(
        NM.Item,
        { value: "a" },
        createElement(NM.Trigger, null, "Alpha"),
        createElement(
          NM.Content,
          null,
          "panel A text",
          createElement(NM.Link, { className: "bg-slate-100" }, "Go A"),
        ),
      ),
      createElement(
        NM.Item,
        { value: "b" },
        createElement(NM.Trigger, null, "Beta"),
        createElement(NM.Content, null, "panel B text"),
      ),
    ),
    createElement(NM.Viewport, { className: "w-[200px]" }),
  );
}

async function step(n = 4) {
  for (let i = 0; i < n; i++) {
    await new Promise((r) => setTimeout(r, 5));
    m!.core.step(0);
  }
  m!.core.render();
}

/** Focus the nth focusable node in tree order and press CIRCLE. */
async function pressFocusable(n: number) {
  const focusables = m!
    .nodes()
    .filter((x) => (x as { focusable?: boolean }).focusable) as NodeMirror[];
  focusNode(focusables[n]);
  m!.core.press(BTN.CIRCLE);
  await step();
}

const texts = () =>
  m!.core
    .texts()
    .map((t) => t.text)
    .join("|");

test("click opens the first content", async () => {
  m = await mountTree(tree(), [import.meta.path]);
  await step();
  expect(texts()).not.toContain("panel A");
  await pressFocusable(0);
  expect(texts()).toContain("panel A");
});

test("second trigger swaps the content", async () => {
  m = await mountTree(tree(), [import.meta.path]);
  await step();
  await pressFocusable(0);
  await pressFocusable(1);
  expect(texts()).toContain("panel B");
  expect(texts()).not.toContain("panel A");
});

test("a link in the panel closes the menu", async () => {
  m = await mountTree(tree(), [import.meta.path]);
  await step();
  await pressFocusable(0);
  expect(texts()).toContain("Go A");
  await pressFocusable(2);
  expect(texts()).not.toContain("panel A");
});
