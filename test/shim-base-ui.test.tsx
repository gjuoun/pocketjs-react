// Batch 4 step 18: the base-ui combobox shim. A query of "ban" leaves two rows, a press on the first selects it once and
// closes the popup, and Chips is a named error.
import { afterEach, expect, test } from "bun:test";
import { BTN, focusNode } from "@pocketjs/framework/input";
import { createElement } from "react";
import { Combobox } from "../src/primitives/base-ui.tsx";
import { type NodeMirror } from "../src/internal/pocket.ts";
import { mountTree, type Mounted } from "./batch4-support.ts";

let m: Mounted | undefined;
afterEach(() => {
  m?.dispose();
  m = undefined;
});

function tree(picked: unknown[]) {
  return createElement(
    Combobox.Root,
    {
      inputValue: "ban",
      defaultOpen: true,
      onValueChange: (v: unknown) => picked.push(v),
    },
    createElement(Combobox.Input, { placeholder: "Find" }),
    createElement(
      Combobox.Popup,
      null,
      createElement(Combobox.Empty, null, "Nothing"),
      createElement(Combobox.Item, { value: "banana" }, "banana"),
      createElement(Combobox.Item, { value: "band" }, "band"),
      createElement(Combobox.Item, { value: "apple" }, "apple"),
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

const texts = () =>
  m!.core
    .texts()
    .map((t) => t.text)
    .join("|");
const focusables = () =>
  m!
    .nodes()
    .filter((x) => (x as { focusable?: boolean }).focusable) as NodeMirror[];

test("the query ban leaves two rows", async () => {
  m = await mountTree(tree([]), [import.meta.path]);
  await step();
  expect(texts()).toContain("banana");
  expect(texts()).toContain("band");
  expect(texts()).not.toContain("apple");
});

test("a press on the first row selects it once", async () => {
  const picked: unknown[] = [];
  m = await mountTree(tree(picked), [import.meta.path]);
  await step();
  focusNode(focusables()[1]);
  m!.core.press(BTN.CIRCLE);
  await step();
  expect(picked).toEqual(["banana"]);
});

test("Chips is a named error", () => {
  expect(() => (Combobox.Chips as () => never)()).toThrow(
    "Chips is not supported",
  );
});
