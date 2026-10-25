// Mouse as a second layer, on the wasm core: a click focuses and presses through the same focus
// system as the d-pad, respects an open layer's focus scope, and desktop svc lines are parsed. A tap
// outside an open layer's panel closes the top layer and presses nothing behind it (C6).
import { afterEach, expect, test } from "bun:test";
import { useState } from "react";
import { Text, View } from "../src/elements.ts";
import { Dialog, mount } from "../src/index.ts";
import { takeHostMessages } from "../src/input/pointer.ts";
import * as DialogPrim from "../src/primitives/dialog.tsx";
import * as Menu from "../src/primitives/dropdown-menu.tsx";
import * as Sel from "../src/primitives/select.tsx";
import { bootCore, type Core } from "./harness.ts";

const ROW = "px-2 py-1 bg-slate-800 focus:bg-blue-600";
const TXT = "text-sm text-white";
const TRIG = "w-[100px] h-[30px] bg-slate-800";
const ITEM =
  "flex items-center gap-2 px-2 py-1.5 text-sm text-white focus:bg-blue-600";
const CLASSES = [
  ROW,
  TXT,
  "w-full h-full flex-col gap-1 p-2 bg-slate-900",
  "w-[30px] h-[10px] bg-blue-600",
  "absolute inset-0 flex-col items-center justify-center bg-[#0f172a99]",
  "flex-col gap-2 p-3 rounded-xl bg-white",
  "text-base text-slate-950",
  TRIG,
  "flex-col p-1 rounded-md bg-slate-800 w-[220px]",
  ITEM,
  "flex-col",
  "flex items-center justify-between gap-2 rounded-md px-3 py-2 bg-slate-800 text-white",
  "flex items-center justify-between gap-2 rounded-md px-3 py-2 bg-slate-800 text-white w-[100px] h-[30px]",
  "flex-col gap-2 p-3 rounded-xl bg-slate-800 w-[300px]",
  "absolute inset-0 flex-col items-center justify-center",
  "absolute inset-0 bg-[#0f172a99]",
];
let core: Core | undefined;
let unmount: (() => void) | undefined;
const pressed: string[] = [];
afterEach(() => {
  unmount?.();
  unmount = undefined;
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
  unmount = mount(<App dialog={dialog} />);
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

test("a tap on the scrim outside an open dialog closes it, and the app behind does not press", async () => {
  const { c } = await start(true);
  const one = c.texts().find((r) => r.text === "One")!;
  click(c, one.x + 4, one.y + 4);
  expect(pressed).toEqual([]);
  expect(c.texts().map((r) => r.text)).not.toContain("Dialog");
});

test("a tap inside an open dialog presses its item and keeps the dialog open", async () => {
  const { c } = await start(true);
  const inside = c.texts().find((r) => r.text === "Inside")!;
  click(c, inside.x + 4, inside.y + 4);
  expect(pressed).toEqual(["Inside"]);
  expect(c.texts().map((r) => r.text)).toContain("Dialog");
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

// Primitive layers (C5/C6): the same routing, through the DropdownMenu, Select and Dialog primitives.
type Scene = "menu" | "select" | "dialog" | "nested";
let scene: Scene = "menu";
const at = (x: number, y: number) => ({
  position: "absolute" as const,
  left: x,
  top: y,
});

function Layers() {
  const behind =
    scene === "menu" || scene === "select"
      ? { x: 300, y: 150 }
      : { x: 20, y: 230 };
  return (
    <View className="w-full h-full flex-col gap-1 p-2 bg-slate-900">
      <View
        className={TRIG}
        style={{ ...at(behind.x, behind.y), width: 100, height: 30 }}
        focusable
        onPress={() => pressed.push("Behind")}
      >
        <Text className={TXT}>Behind</Text>
      </View>
      {scene === "menu" ? (
        <Menu.Root>
          <View style={at(40, 60)}>
            <Menu.Trigger className={TRIG}>
              <Text className={TXT}>Open</Text>
            </Menu.Trigger>
          </View>
          <Menu.Content sideOffset={4}>
            {["Alpha", "Beta", "Gamma"].map((label) => (
              <Menu.Item
                key={label}
                className={ITEM}
                onSelect={() => pressed.push(label)}
              >
                <Text className={TXT}>{label}</Text>
              </Menu.Item>
            ))}
          </Menu.Content>
        </Menu.Root>
      ) : null}
      {scene === "select" ? (
        <Sel.Root>
          <View style={at(40, 60)}>
            <Sel.Trigger className={TRIG}>
              <Sel.Value placeholder="Pick" />
            </Sel.Trigger>
          </View>
          <Sel.Content position="popper" sideOffset={4}>
            <Sel.Viewport>
              <Sel.Item value="a" className={ITEM}>
                <Sel.ItemText>Alpha</Sel.ItemText>
              </Sel.Item>
              <Sel.Item value="b" className={ITEM}>
                <Sel.ItemText>Beta</Sel.ItemText>
              </Sel.Item>
            </Sel.Viewport>
          </Sel.Content>
        </Sel.Root>
      ) : null}
      {scene === "dialog" || scene === "nested" ? (
        <DialogPrim.Root>
          <View style={at(40, 60)}>
            <DialogPrim.Trigger className={TRIG}>
              <Text className={TXT}>Open</Text>
            </DialogPrim.Trigger>
          </View>
          <DialogPrim.Overlay />
          <DialogPrim.Content>
            <Text className={TXT}>Hello</Text>
            {scene === "nested" ? (
              <Sel.Root>
                <Sel.Trigger className={TRIG}>
                  <Sel.Value placeholder="Pick" />
                </Sel.Trigger>
                <Sel.Content position="popper" sideOffset={4}>
                  <Sel.Viewport>
                    <Sel.Item value="a" className={ITEM}>
                      <Sel.ItemText>Alpha</Sel.ItemText>
                    </Sel.Item>
                  </Sel.Viewport>
                </Sel.Content>
              </Sel.Root>
            ) : null}
          </DialogPrim.Content>
        </DialogPrim.Root>
      ) : null}
    </View>
  );
}

async function layers(s: Scene): Promise<Core> {
  scene = s;
  core = await bootCore({ classes: CLASSES });
  unmount = mount(<Layers />);
  core.step(0);
  core.step(0);
  return core;
}

test("a tap outside an open menu closes it, and nothing behind it presses", async () => {
  const c = await layers("menu");
  const open = c.texts().find((r) => r.text === "Open")!;
  click(c, open.x + 4, open.y + 4);
  expect(c.texts().map((r) => r.text)).toContain("Alpha");
  const behind = c.texts().find((r) => r.text === "Behind")!;
  click(c, behind.x + 4, behind.y + 4);
  expect(c.texts().map((r) => r.text)).not.toContain("Alpha");
  expect(pressed).toEqual([]);
});

test("a tap outside an open select closes it, and nothing behind it presses", async () => {
  const c = await layers("select");
  const pick = c.texts().find((r) => r.text === "Pick")!;
  click(c, pick.x + 4, pick.y + 4);
  expect(c.texts().map((r) => r.text)).toContain("Alpha");
  const behind = c.texts().find((r) => r.text === "Behind")!;
  click(c, behind.x + 4, behind.y + 4);
  expect(c.texts().map((r) => r.text)).not.toContain("Alpha");
  expect(pressed).toEqual([]);
});

test("a tap outside an open Dialog primitive closes it, and nothing behind it presses", async () => {
  const c = await layers("dialog");
  const open = c.texts().find((r) => r.text === "Open")!;
  click(c, open.x + 4, open.y + 4);
  expect(c.texts().map((r) => r.text)).toContain("Hello");
  const behind = c.texts().find((r) => r.text === "Behind")!;
  click(c, behind.x + 4, behind.y + 4);
  expect(c.texts().map((r) => r.text)).not.toContain("Hello");
  expect(pressed).toEqual([]);
});

test("nested: a tap outside the inner select closes only the select; the dialog stays open", async () => {
  const c = await layers("nested");
  const open = c.texts().find((r) => r.text === "Open")!;
  click(c, open.x + 4, open.y + 4);
  const pick = c.texts().find((r) => r.text === "Pick")!;
  click(c, pick.x + 4, pick.y + 4);
  expect(c.texts().map((r) => r.text)).toContain("Alpha");
  const hello = c.texts().find((r) => r.text === "Hello")!;
  click(c, hello.x + 4, hello.y + 4);
  expect(c.texts().map((r) => r.text)).not.toContain("Alpha");
  expect(c.texts().map((r) => r.text)).toContain("Hello");
  expect(pressed).toEqual([]);
});

test("a tap inside an open menu still presses its item and closes the menu", async () => {
  const c = await layers("menu");
  const open = c.texts().find((r) => r.text === "Open")!;
  click(c, open.x + 4, open.y + 4);
  const beta = c.texts().find((r) => r.text === "Beta")!;
  click(c, beta.x + 4, beta.y + 4);
  expect(pressed).toEqual(["Beta"]);
  expect(c.texts().map((r) => r.text)).not.toContain("Beta");
});

// Q1-A: the Menu/Select shell is a transparent catcher, so the app behind it keeps its colour. The
// probe is the Behind row (bg-slate-800): the app background is slate-900, the same colour as the
// scrim tint, so a dim over it would not show. The Dialog control proves the probe sees a dim.
test("Q1-A: a Menu opens without dimming the app behind it", async () => {
  const menu = await layers("menu");
  const before = menu.pixel(385, 165);
  const open = menu.texts().find((r) => r.text === "Open")!;
  click(menu, open.x + 4, open.y + 4);
  expect(menu.texts().map((r) => r.text)).toContain("Alpha");
  expect(menu.pixel(385, 165)).toBe(before);
});

test("Q1-A control: a Dialog's scrim dims the Behind row", async () => {
  const dialog = await layers("dialog");
  const before = dialog.pixel(110, 245);
  const open = dialog.texts().find((r) => r.text === "Open")!;
  click(dialog, open.x + 4, open.y + 4);
  expect(dialog.texts().map((r) => r.text)).toContain("Hello");
  expect(dialog.pixel(110, 245)).not.toBe(before);
});
