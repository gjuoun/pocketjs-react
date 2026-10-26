// The held-drag hook (batch 3): a press on a registered node reports its held points as moves and the release as
// done, presses nothing on release, and a press on an unregistered node is still a press.
import { afterEach, expect, test } from "bun:test";
import { useLayoutEffect, useRef } from "react";
import { View } from "../src/elements.ts";
import { mount } from "../src/index.ts";
import { registerDrag } from "../src/input/pointer.ts";
import type { NodeMirror } from "../src/internal/pocket.ts";
import { bootCore, type Core } from "./harness.ts";

const CLASSES = ["w-full h-full flex-col bg-slate-900", "w-[100px] h-[20px] bg-slate-800", "w-[100px] h-[20px] bg-blue-600"];
let core: Core | undefined;
let unmount: (() => void) | undefined;
afterEach(() => {
  unmount?.();
  unmount = undefined;
  core?.dispose();
  core = undefined;
  delete (globalThis as { __pocketPointer?: unknown }).__pocketPointer;
});

function push(events: { x: number; y: number; down: boolean }[]) {
  const q = ((globalThis as { __pocketPointer?: unknown[] }).__pocketPointer ??= []);
  q.push(...events);
}

function Track(props: { log: string[]; presses: { n: number } }) {
  const ref = useRef<NodeMirror | null>(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    return registerDrag(ref.current, (x, _y, phase) => props.log.push(phase + ":" + x));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <View ref={ref} focusable className="w-[100px] h-[20px] bg-slate-800" onPress={() => props.presses.n++} />;
}

test("a held press on a registered node reports its points as moves and the release as done, and presses nothing", async () => {
  core = await bootCore({ classes: CLASSES });
  const log: string[] = [];
  const presses = { n: 0 };
  unmount = mount(<View className="w-full h-full flex-col bg-slate-900"><Track log={log} presses={presses} /></View>);
  core.step(0);
  core.step(0);
  push([{ x: 10, y: 10, down: true }]);
  core.step(0);
  push([{ x: 30, y: 10, down: true }, { x: 60, y: 10, down: true }]);
  core.step(0);
  push([{ x: 60, y: 10, down: false }]);
  core.step(0);
  core.step(0);
  expect(log).toEqual(["move:10", "move:30", "move:60", "done:60"]);
  expect(presses.n).toBe(0);
});

test("a press on an unregistered node still presses on release", async () => {
  core = await bootCore({ classes: CLASSES });
  const presses = { n: 0 };
  unmount = mount(
    <View className="w-full h-full flex-col bg-slate-900">
      <View focusable className="w-[100px] h-[20px] bg-slate-800" onPress={() => presses.n++} />
    </View>,
  );
  core.step(0);
  core.step(0);
  push([{ x: 10, y: 10, down: true }]);
  core.step(0);
  push([{ x: 10, y: 10, down: false }]);
  core.step(0);
  core.step(0);
  expect(presses.n).toBe(1);
});
