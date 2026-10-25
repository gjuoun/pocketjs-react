// C5 primitives on the real wasm core, mounted in-process: the open-state contract (controlled,
// uncontrolled, asChild) that every native primitive shares.
import { afterEach, expect, test } from "bun:test";
import { BTN, getFocused } from "@pocketjs/framework/input";
import { type ReactNode, useState } from "react";
import { mount, resetCompatStats, View } from "../src/index.ts";
import * as Dialog from "../src/primitives/dialog.tsx";
import { bootCore, type Core } from "./harness.ts";

const CLASSES = [
  "w-full h-full flex-col gap-1 p-2 bg-slate-100",
  "bg-slate-900 px-2 py-1 rounded-md",
  "px-2 py-1 bg-slate-800 focus:bg-blue-600",
  "text-sm text-white",
];

let core: Core | undefined;
let unmount: (() => void) | undefined;
afterEach(() => {
  unmount?.();
  unmount = undefined;
  core?.dispose();
  core = undefined;
  resetCompatStats();
});

async function start(element: ReactNode): Promise<Core> {
  core = await bootCore({ classes: CLASSES });
  unmount = mount(element);
  core.step(0);
  return core;
}
const press = (c: Core, button: number) => c.press(button, 4);
/** Text of the focused node's first text descendant. */
function focused(): string | undefined {
  const walk = (node: { text?: string; children: unknown[] }): string | undefined => {
    if (node.text) return node.text;
    for (const child of node.children as (typeof node)[]) {
      const found = walk(child);
      if (found) return found;
    }
    return undefined;
  };
  const node = getFocused();
  return node ? walk(node as never) : undefined;
}
function focusOn(c: Core, label: string): void {
  for (let i = 0; i < 4 && focused() !== label; i++) press(c, BTN.DOWN);
  expect(focused()).toBe(label);
}

test("root: uncontrolled Trigger toggles and reports each change once", async () => {
  const calls: boolean[] = [];
  const c = await start(
    <View className="w-full h-full flex-col gap-1 p-2 bg-slate-100">
      <Dialog.Root onOpenChange={(open) => calls.push(open)}>
        <Dialog.Trigger className="bg-slate-900 px-2 py-1 rounded-md">Open</Dialog.Trigger>
      </Dialog.Root>
    </View>,
  );
  focusOn(c, "Open");
  press(c, BTN.CIRCLE);
  press(c, BTN.CIRCLE);
  expect(calls).toEqual([true, false]);
});

test("root: controlled open ignores its own state and only reports the request", async () => {
  const calls: boolean[] = [];
  const c = await start(
    <View className="w-full h-full flex-col gap-1 p-2 bg-slate-100">
      <Dialog.Root open={false} onOpenChange={(open) => calls.push(open)}>
        <Dialog.Trigger className="bg-slate-900 px-2 py-1 rounded-md">Open</Dialog.Trigger>
      </Dialog.Root>
    </View>,
  );
  focusOn(c, "Open");
  press(c, BTN.CIRCLE);
  expect(calls).toEqual([true]);
});

test("root: asChild merges the press onto the child and keeps the child's own onClick", async () => {
  const childClicks: number[] = [];
  const calls: boolean[] = [];
  function Go(props: { className?: string; onClick?: () => void }) {
    return (
      <View className={props.className} focusable onPress={props.onClick}>
        Go
      </View>
    );
  }
  const c = await start(
    <View className="w-full h-full flex-col gap-1 p-2 bg-slate-100">
      <Dialog.Root onOpenChange={(open) => calls.push(open)}>
        <Dialog.Trigger asChild>
          <Go className="px-2 py-1 bg-slate-800 focus:bg-blue-600" onClick={() => childClicks.push(1)} />
        </Dialog.Trigger>
      </Dialog.Root>
    </View>,
  );
  focusOn(c, "Go");
  press(c, BTN.CIRCLE);
  expect(childClicks).toEqual([1]);
  expect(calls).toEqual([true]);
});
