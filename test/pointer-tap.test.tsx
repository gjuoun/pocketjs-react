// onPointerTap: a tap on empty canvas reaches the listener with its press point; a tap on a focusable, a label
// or inside an open layer does not, and a release far from its press (a drag) is not a tap.
import { afterEach, describe, expect, test } from "bun:test";
import { useState } from "react";
import { Text, View } from "../src/elements.ts";
import { Dialog, mount } from "../src/index.ts";
import { onPointerTap, TAP_SLOP } from "../src/input/pointer.ts";
import { bootCore, type Core } from "./harness.ts";

const ROOT = "w-full h-full flex-col gap-2 p-2 bg-slate-900";
const ROW = "px-2 py-1 bg-slate-800 focus:bg-blue-600";
const TXT = "text-sm text-white";
const CLASSES = [ROOT, ROW, TXT, "w-[30px] h-[10px] bg-blue-600", "absolute inset-0 flex-col items-center justify-center bg-[#0f172a99]", "flex-col gap-2 p-3 rounded-xl bg-white", "text-base text-slate-950"];

let core: Core | undefined;
let unmount: (() => void) | undefined;
let taps: [number, number][] = [];
let pressed: string[] = [];
let stop: (() => void) | undefined;
afterEach(() => {
  stop?.();
  stop = undefined;
  unmount?.();
  unmount = undefined;
  core?.dispose();
  taps = [];
  pressed = [];
  delete (globalThis as { __pocketPointer?: unknown }).__pocketPointer;
});

function App(props: { dialog?: boolean }) {
  const [open, setOpen] = useState(!!props.dialog);
  return (
    <View className={ROOT}>
      <View className={ROW} focusable onPress={() => pressed.push("Row")}>
        <Text className={TXT}>Row</Text>
      </View>
      <Text className={TXT}>Empty</Text>
      <Dialog open={open} onClose={() => setOpen(false)} title="Dialog">
        <Text className={TXT}>Body</Text>
      </Dialog>
    </View>
  );
}

async function start(dialog = false): Promise<Core> {
  core = await bootCore({ classes: CLASSES });
  unmount = mount(<App dialog={dialog} />);
  core.step(0);
  core.texts();
  stop = onPointerTap((x, y) => taps.push([x, y]));
  return core;
}

/** A press at (x, y) released at (ux, uy): the pump reads both on the frames after they are queued. */
function touch(c: Core, x: number, y: number, ux = x, uy = y) {
  const q = ((globalThis as { __pocketPointer?: unknown[] }).__pocketPointer ??= []);
  q.push({ x, y, down: true });
  c.step(0);
  q.push({ x: ux, y: uy, down: false });
  c.step(0);
  c.step(0);
}

const at = (c: Core, text: string) => {
  const r = c.texts().find((t) => t.text === text);
  if (!r) throw new Error("no text " + text);
  return r;
};

describe("onPointerTap", () => {
  test("a tap on empty canvas reaches the listener with its press point", async () => {
    const c = await start();
    const e = at(c, "Empty");
    touch(c, e.x + 2, e.y + 2);
    expect(taps).toEqual([[e.x + 2, e.y + 2]]);
    expect(pressed).toEqual([]);
  });

  test("a tap on a focusable control presses it and does not reach the listener", async () => {
    const c = await start();
    const row = at(c, "Row");
    touch(c, row.x + 2, row.y + 2);
    expect(pressed).toEqual(["Row"]);
    expect(taps).toEqual([]);
  });

  test("a press released away from its press point (a drag) is not a tap", async () => {
    const c = await start();
    const e = at(c, "Empty");
    touch(c, e.x + 2, e.y + 2, e.x + 2 + TAP_SLOP + 10, e.y + 2);
    expect(taps).toEqual([]);
  });

  test("a tap on the open layer's panel or scrim does not reach the listener", async () => {
    const c = await start(true);
    const body = at(c, "Body");
    touch(c, body.x + 2, body.y + 2);
    expect(taps).toEqual([]);
  });

  test("after the teardown no listener runs", async () => {
    const c = await start();
    stop?.();
    stop = undefined;
    const e = at(c, "Empty");
    touch(c, e.x + 2, e.y + 2);
    expect(taps).toEqual([]);
  });
});
