// The harness boots the real PocketJS wasm core inside Bun and reads back what it drew.
import { expect, test } from "bun:test";
import { bootCore } from "./harness.ts";
import { createElement, createTextNode, insertNode, rootMirror, setProp } from "../src/internal/pocket.ts";

test("a text node inserted through the internal native tree is drawn by the wasm core", async () => {
  const core = await bootCore({ classes: ["text-base text-white"] });
  const label = createElement("text");
  setProp(label, "class", "text-base text-white");
  insertNode(label, createTextNode("hello"));
  insertNode(rootMirror, label);
  core.step(0);
  expect(core.texts().map((run) => run.text)).toEqual(["hello"]);
  core.dispose();
});
