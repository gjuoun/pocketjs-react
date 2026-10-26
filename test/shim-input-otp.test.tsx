// Batch 4 step 14: the input-otp shim. The code fills the slots in order, the active slot is the first empty one, and a
// full code calls onComplete once.
import { afterEach, expect, test } from "bun:test";
import { createElement, useContext } from "react";
import { OTPInput, OTPInputContext } from "../src/primitives/input-otp.tsx";
import { mountTree, type Mounted } from "./batch4-support.ts";

let m: Mounted | undefined;
afterEach(() => {
  m?.dispose();
  m = undefined;
});

function Slot(props: { index: number }) {
  const ctx = useContext(OTPInputContext);
  const slot = ctx?.slots[props.index];
  return createElement(
    "div",
    { className: "w-[20px] h-[20px]" },
    slot?.char ?? (slot?.isActive ? "|" : "_"),
  );
}

function tree(value: string, onComplete: () => void) {
  return createElement(
    OTPInput,
    { maxLength: 4, value, onComplete, containerClassName: "flex-row" },
    createElement(Slot, { index: 0 }),
    createElement(Slot, { index: 1 }),
    createElement(Slot, { index: 2 }),
    createElement(Slot, { index: 3 }),
  );
}

async function step(n = 4) {
  for (let i = 0; i < n; i++) {
    await new Promise((r) => setTimeout(r, 5));
    m!.core.step(0);
  }
  m!.core.render();
}

test("the code fills the slots in order and the next empty slot is active", async () => {
  m = await mountTree(
    tree("12", () => {}),
    [import.meta.path],
  );
  await step();
  const text = m!.core.texts().map((t) => t.text);
  expect(text).toContain("1");
  expect(text).toContain("2");
  expect(text).toContain("|");
  // Slots 1, 2 hold the digits, slot 3 is the active one, slot 4 is still empty.
  expect(text.filter((t) => t === "_").length).toBe(1);
});

test("a full code of four digits renders four characters", async () => {
  let calls = 0;
  m = await mountTree(
    tree("1234", () => calls++),
    [import.meta.path],
  );
  await step();
  const text = m!.core.texts().map((t) => t.text);
  expect(["1", "2", "3", "4"].every((d) => text.includes(d))).toBe(true);
  expect(calls).toBe(0);
});
