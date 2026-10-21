// The react-reconciler renderer against the real wasm core: commits land in the frame that
// caused them, unmount clears the drawn tree, and unknown host elements are rejected.
import { afterEach, expect, test } from "bun:test";
import { useState } from "react";
import { BTN } from "@pocketjs/framework/input";
import { bootCore, type Core } from "./harness.ts";
import { mount, Text, View } from "../src/index.ts";

const CLASSES = ["text-base text-white", "p-2 bg-slate-800 focus:bg-blue-600"];
let core: Core | undefined;
afterEach(() => core?.dispose());

function Counter() {
  const [count, setCount] = useState(0);
  return (
    <View className="p-2 bg-slate-800 focus:bg-blue-600" focusable onPress={() => setCount((c) => c + 1)}>
      <Text className="text-base text-white">{"Count " + count}</Text>
    </View>
  );
}

test("a CIRCLE press commits its state update in the same frame", async () => {
  core = await bootCore({ classes: CLASSES });
  mount(<Counter />);
  core.step(0);
  expect(core.texts().map((r) => r.text)).toEqual(["Count 0"]);
  core.press(BTN.DOWN);
  core.step(BTN.CIRCLE);
  expect(core.texts().map((r) => r.text)).toEqual(["Count 1"]);
});

test("unmount removes every drawn run", async () => {
  core = await bootCore({ classes: CLASSES });
  const unmount = mount(<Counter />);
  core.step(0);
  expect(core.texts().length).toBe(1);
  unmount();
  core.step(0);
  expect(core.texts()).toEqual([]);
});

test("an unknown host element is rejected", async () => {
  core = await bootCore({ classes: CLASSES });
  expect(() => mount(<div />)).toThrow("unknown host element <div>");
});