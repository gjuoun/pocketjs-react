// Batch 2 overlays: a modal that does not dismiss on an outside press (AlertDialog's contract). The
// scene uses ModalLayer directly; the vendored AlertDialog is covered once it exists.
import { afterEach, beforeEach, expect, test } from "bun:test";
import { useState } from "react";
import { Text, View } from "../src/elements.ts";
import { BTN } from "../src/index.ts";
import { ModalLayer } from "../src/primitives/modal-layer.tsx";
import { type Booted, bootScene, tap, textAt } from "./overlay-scene.ts";

const TXT = "text-sm text-white";
const ROW = "w-[100px] h-[30px] bg-slate-800";
const PANEL = "flex-col p-3 rounded-xl bg-slate-800 w-[200px]";

let closes = 0;
const pressed: string[] = [];
let booted: Booted | undefined;
beforeEach(() => {
  closes = 0;
  pressed.length = 0;
});
afterEach(() => {
  booted?.dispose();
  booted = undefined;
});

function Scene() {
  const [open, setOpen] = useState(true);
  return (
    <View className="w-full h-full flex-col p-2 bg-slate-900">
      <View className={ROW} focusable onPress={() => pressed.push("behind")}>
        <Text className={TXT}>Behind</Text>
      </View>
      <ModalLayer
        open={open}
        dismissOutside={false}
        onClose={() => {
          closes++;
          setOpen(false);
        }}
        panelClassName={PANEL}
      >
        <Text className={TXT}>Inside</Text>
      </ModalLayer>
    </View>
  );
}

test("an outside tap on a modal that does not dismiss outside closes nothing and presses nothing behind", async () => {
  booted = await bootScene(import.meta.path, () => <Scene />);
  const { c } = booted;
  const behind = textAt(c, "Behind");
  tap(c, behind.x + 2, behind.y + 2);
  expect(closes).toBe(0);
  expect(pressed).toEqual([]);
});

test("CROSS still closes a modal that does not dismiss outside", async () => {
  booted = await bootScene(import.meta.path, () => <Scene />);
  booted.c.press(BTN.CROSS);
  expect(closes).toBe(1);
});
