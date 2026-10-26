// Batch 4 step 8: the cmdk shim filters items by the query, moves focus with the d-pad, selects once on press, and
// shows Empty when nothing matches. Filter results are read from the text the core draws.
import { afterEach, expect, test } from "bun:test";
import { BTN, focusNode, getFocused } from "@pocketjs/framework/input";
import { createElement } from "react";
import { Command } from "../src/primitives/cmdk.tsx";
import { type NodeMirror } from "../src/internal/pocket.ts";
import { mountTree, type Mounted } from "./batch4-support.ts";

let m: Mounted | undefined;
afterEach(() => {
  m?.dispose();
  m = undefined;
});

const FRUITS = ["apple", "banana", "grape"];

function tree(query: string, picked: string[]) {
  return createElement(
    Command,
    { value: query, onValueChange: () => {} },
    createElement(Command.Input, { placeholder: "Find" }),
    createElement(
      Command.List,
      null,
      createElement(Command.Empty, null, "No results"),
      createElement(
        Command.Group,
        { heading: "Fruit" },
        ...FRUITS.map((f) =>
          createElement(
            Command.Item,
            { key: f, value: f, onSelect: (v: string) => picked.push(v) },
            f,
          ),
        ),
      ),
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

test("the query ban leaves one item", async () => {
  m = await mountTree(tree("ban", []), [import.meta.path]);
  await step();
  expect(texts()).toContain("banana");
  expect(texts()).not.toContain("apple");
  expect(texts()).not.toContain("grape");
});

test("the d-pad down moves the highlight to the next item", async () => {
  m = await mountTree(tree("", []), [import.meta.path]);
  await step();
  // The Input is the first focusable; the items follow it in order.
  const items = focusables();
  focusNode(items[1]);
  m!.core.press(BTN.DOWN);
  await step();
  expect(getFocused()).toBe(items[2]);
});

test("enter selects apple once", async () => {
  const picked: string[] = [];
  m = await mountTree(tree("", picked), [import.meta.path]);
  await step();
  focusNode(focusables()[1]);
  m!.core.press(BTN.CIRCLE);
  await step();
  expect(picked).toEqual(["apple"]);
});

test("an empty result shows Empty", async () => {
  m = await mountTree(tree("zzz", []), [import.meta.path]);
  await step(6);
  expect(texts()).toContain("No results");
});
