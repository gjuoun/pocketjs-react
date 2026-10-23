// Mouse as a second layer, on the wasm core: a click focuses and presses through the same focus
// system as the d-pad, respects an open dialog's focus scope, and desktop svc lines are parsed.
import { afterEach, expect, test } from "bun:test";
import { useState } from "react";
import { Dialog, mount, Text, View } from "../src/index.ts";
import { takeHostMessages } from "../src/input/pointer.ts";
import { bootCore, type Core } from "./harness.ts";

const ROW = "px-2 py-1 bg-slate-800 focus:bg-blue-600";
const TXT = "text-sm text-white";
const CLASSES = [
  ROW,
  TXT,
  "w-full h-full flex-col gap-1 p-2 bg-slate-900",
  "w-[30px] h-[10px] bg-blue-600",
  "absolute inset-0 flex-col items-center justify-center bg-slate-950",
  "flex-col gap-2 p-3 rounded-xl bg-white",
  "text-base text-slate-950",
];
let core: Core | undefined;
const pressed: string[] = [];
afterEach(() => {
  core?.dispose();
  pressed.length = 0;
  delete (globalThis as { __pocketPointer?: unknown }).__pocketPointer;
});

function App(props: { dialog?: boolean }) {
  const [open, setOpen] = useState(!!props.dialog);
  return (
    <View className="w-full h-full flex-col gap-1 p-2 bg-slate-900">
      <View className="w-[30px] h-[10px] bg-blue-600" />
      {["One", "Two", "Three"].map((label) => (
        <View
          key={label}
          className={ROW}
          focusable
          onPress={() => pressed.push(label)}
        >
          <Text className={TXT}>{label}</Text>
        </View>
      ))}
      <Dialog open={open} onClose={() => setOpen(false)} title="Dialog">
        <View className={ROW} focusable onPress={() => pressed.push("Inside")}>
          <Text className={TXT}>Inside</Text>
        </View>
      </Dialog>
    </View>
  );
}

async function start(dialog = false): Promise<{ c: Core; blue: string }> {
  core = await bootCore({ classes: CLASSES });
  mount(<App dialog={dialog} />);
  core.step(0);
  core.texts();
  return { c: core, blue: core.pixel(12, 12) };
}

function click(c: Core, x: number, y: number) {
  const q = ((globalThis as { __pocketPointer?: unknown[] }).__pocketPointer ??=
    []);
  q.push({ x, y, down: true });
  c.step(0);
  q.push({ x, y, down: false });
  c.step(0);
  c.step(0);
}

test("a click on the second row focuses it and fires its press", async () => {
  const { c, blue } = await start();
  const two = c.texts().find((r) => r.text === "Two")!;
  click(c, two.x + 4, two.y + 4);
  expect(pressed).toEqual(["Two"]);
  const after = c.texts().find((r) => r.text === "Two")!;
  expect(c.pixel(after.x - 3, after.y + 2)).toBe(blue);
});

test("a click behind an open dialog does nothing; a click inside it presses", async () => {
  const { c } = await start(true);
  const runs = c.texts();
  const one = runs.find((r) => r.text === "One")!;
  click(c, one.x + 4, one.y + 4);
  expect(pressed).toEqual([]);
  expect(c.texts().map((r) => r.text)).toContain("Dialog");
  const inside = c.texts().find((r) => r.text === "Inside")!;
  click(c, inside.x + 4, inside.y + 4);
  expect(pressed).toEqual(["Inside"]);
});

test("desktop svc lines: the click is delivered and other lines stay readable", async () => {
  const { c } = await start();
  const three = c.texts().find((r) => r.text === "Three")!;
  const lines = [
    JSON.stringify({ t: "load", text: "hello" }),
    JSON.stringify({ d: true, t: "mouse", x: three.x + 4, y: three.y + 4 }),
    JSON.stringify({ d: false, t: "mouse", x: three.x + 4, y: three.y + 4 }),
  ];
  let served = false;
  c.ops.svcPoll = () => {
    if (served) return "";
    served = true;
    return lines.join("\n") + "\n";
  };
  c.step(0);
  c.step(0);
  expect(pressed).toEqual(["Three"]);
  expect(takeHostMessages()).toEqual([{ t: "load", text: "hello" }]);
});
