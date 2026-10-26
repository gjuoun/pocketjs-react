// C6 anchored placement, end to end on the wasm core: a real tap opens a DropdownMenu or Select, and
// the panel lands beside its trigger (below, flipped above, clamped in the viewport). A centred Dialog
// is the no-anchor control.
import { afterEach, expect, test } from "bun:test";
import { getOps, hostViewport } from "@pocketjs/framework/host";
import { Text, View } from "../src/elements.ts";
import { mount } from "../src/index.ts";
import type { NodeMirror } from "../src/internal/pocket.ts";
import { measureBox } from "../src/primitives/anchor.ts";
import * as Dialog from "../src/primitives/dialog.tsx";
import * as Menu from "../src/primitives/dropdown-menu.tsx";
import * as Sel from "../src/primitives/select.tsx";
import { getOverlayLayer } from "../src/renderer/mount.ts";
import { bootCore, type Core } from "./harness.ts";

const CLASSES = [
  "w-full h-full flex-col gap-1 p-2 bg-slate-900",
  "text-sm text-white",
  "w-[100px] h-[30px] bg-slate-800",
  "flex-col",
  "absolute inset-0 flex-col items-center justify-center",
  "flex-col p-1 rounded-md bg-slate-800 text-white w-[220px]",
  "flex items-center gap-2 px-2 py-1.5 text-sm text-white focus:bg-blue-600 active:bg-blue-500",
  "flex items-center justify-between gap-2 rounded-md px-3 py-2 bg-slate-800 text-white active:bg-slate-700",
  "flex items-center justify-between gap-2 rounded-md px-3 py-2 bg-slate-800 text-white active:bg-slate-700 w-[100px] h-[30px]",
  "flex-col gap-2 p-3 rounded-xl bg-slate-800 text-white w-[300px]",
];

type Scene =
  | {
      kind: "menu";
      x: number;
      y: number;
      align?: "start" | "center" | "end";
      sideOffset?: number;
    }
  | { kind: "select"; x: number; y: number }
  | { kind: "dialog"; x: number; y: number };
let scene: Scene = { kind: "menu", x: 40, y: 60 };
const TXT = "text-sm text-white";
const TRIG = "w-[100px] h-[30px] bg-slate-800";
const ITEM =
  "flex items-center gap-2 px-2 py-1.5 text-sm text-white focus:bg-blue-600 active:bg-blue-500";
const at = (x: number, y: number) => ({
  position: "absolute" as const,
  left: x,
  top: y,
});

function App() {
  const s = scene;
  if (s.kind === "dialog")
    return (
      <View className="w-full h-full flex-col gap-1 p-2 bg-slate-900">
        <View style={at(s.x, s.y)}>
          <Dialog.Root>
            <Dialog.Trigger className={TRIG}>
              <Text className={TXT}>Open</Text>
            </Dialog.Trigger>
            <Dialog.Content>
              <Text className={TXT}>Hello</Text>
            </Dialog.Content>
          </Dialog.Root>
        </View>
      </View>
    );
  if (s.kind === "select")
    return (
      <View className="w-full h-full flex-col gap-1 p-2 bg-slate-900">
        <Sel.Root>
          <View style={at(s.x, s.y)}>
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
      </View>
    );
  return (
    <View className="w-full h-full flex-col gap-1 p-2 bg-slate-900">
      <Menu.Root>
        <View style={at(s.x, s.y)}>
          <Menu.Trigger className={TRIG}>
            <Text className={TXT}>Open</Text>
          </Menu.Trigger>
        </View>
        <Menu.Content align={s.align} sideOffset={s.sideOffset ?? 4}>
          <Menu.Item className={ITEM}>
            <Text className={TXT}>Alpha</Text>
          </Menu.Item>
          <Menu.Item className={ITEM}>
            <Text className={TXT}>Beta</Text>
          </Menu.Item>
          <Menu.Item className={ITEM}>
            <Text className={TXT}>Gamma</Text>
          </Menu.Item>
        </Menu.Content>
      </Menu.Root>
    </View>
  );
}

let core: Core | undefined;
let unmount: (() => void) | undefined;
afterEach(() => {
  unmount?.();
  unmount = undefined;
  core?.dispose();
  core = undefined;
  delete (globalThis as { __pocketPointer?: unknown }).__pocketPointer;
});

async function open(s: Scene): Promise<Core> {
  scene = s;
  core = await bootCore({ classes: CLASSES });
  unmount = mount(<App />);
  core.step(0);
  core.step(0);
  // A real tap on the trigger's centre: press down, then up, then let the frames settle.
  const g = globalThis as {
    __pocketPointer?: { x: number; y: number; down: boolean }[];
  };
  g.__pocketPointer ??= [];
  const q = g.__pocketPointer;
  const cx = s.x + 50;
  const cy = s.y + 15;
  q.push({ x: cx, y: cy, down: true });
  core.step(0);
  q.push({ x: cx, y: cy, down: false });
  core.step(0);
  for (let i = 0; i < 6; i++) core.step(0);
  return core;
}

/** The open layer's panel: the overlay's last shell, then its first child (the focus-trapped panel). */
function panelOf(): NodeMirror {
  const overlay = getOverlayLayer();
  const shell = overlay.children[overlay.children.length - 1];
  const panel = shell?.children[0];
  if (!panel) throw new Error("no open panel");
  return panel;
}

function boxOf() {
  const box = measureBox(panelOf());
  if (!box) throw new Error("panel not measurable");
  return box;
}

function viewport(): { w: number; h: number } {
  const vp = hostViewport(getOps());
  if (!vp) throw new Error("no viewport");
  return vp;
}

test("a menu opens below its trigger, offset by sideOffset", async () => {
  await open({ kind: "menu", x: 40, y: 60, sideOffset: 4 });
  expect(measureBox(panelOf())).toMatchObject({ x: 40, y: 94, w: 220 });
});

test("a menu flips above its trigger when the bottom has no room", async () => {
  await open({ kind: "menu", x: 40, y: 220, sideOffset: 4 });
  const box = boxOf();
  expect(box.x).toBe(40);
  expect(box.y + box.h).toBe(216); // 4px above the trigger's top edge (y 220)
});

test("a menu is clamped inside the right edge of the viewport", async () => {
  const vp = viewport();
  await open({ kind: "menu", x: vp.w - 100, y: 60, sideOffset: 4 });
  const box = boxOf();
  expect(box.x + box.w).toBe(vp.w);
});

test("a menu aligned to the end is clamped inside the left edge", async () => {
  await open({ kind: "menu", x: 0, y: 60, align: "end", sideOffset: 4 });
  expect(boxOf().x).toBe(0);
});

test("a Select list opens below its trigger", async () => {
  await open({ kind: "select", x: 40, y: 60 });
  expect(measureBox(panelOf())).toMatchObject({ x: 40, y: 94, w: 220 });
});

test("a Dialog stays centred: no anchor, no placement", async () => {
  const vp = viewport();
  await open({ kind: "dialog", x: 40, y: 60 });
  const box = boxOf();
  expect(box.w).toBe(300);
  expect(Math.abs(box.x - (vp.w - 300) / 2)).toBeLessThanOrEqual(1);
  expect(Math.abs(box.y + box.h / 2 - vp.h / 2)).toBeLessThanOrEqual(1);
});

// The panel mounts hidden (opacity 0.01, at the corner) because its size needs one layout pass. The
// first frame it is drawn visibly must already be at its placed spot.
const PANEL_FILL = "#1e293b"; // bg-slate-800, the panel's fill; the padding row below the items shows it

test("the panel is first drawn visibly at its placed spot, not at the corner", async () => {
  scene = { kind: "menu", x: 40, y: 60, sideOffset: 4 };
  core = await bootCore({ classes: CLASSES });
  unmount = mount(<App />);
  core.step(0);
  core.step(0);
  const g = globalThis as {
    __pocketPointer?: { x: number; y: number; down: boolean }[];
  };
  g.__pocketPointer ??= [];
  const q = g.__pocketPointer;
  q.push({ x: 40 + 50, y: 60 + 15, down: true });
  core.step(0);
  q.push({ x: 40 + 50, y: 60 + 15, down: false });
  core.step(0);
  const frames: { box: ReturnType<typeof measureBox>; visible: boolean }[] = [];
  for (let f = 0; f < 4; f++) {
    core.step(0);
    core.render();
    const box = measureBox(panelOf());
    const visible =
      box !== null &&
      core.pixel(box.x + Math.floor(box.w / 2), box.y + box.h - 2) ===
        PANEL_FILL;
    frames.push({ box, visible });
  }
  const first = frames.findIndex((f) => f.visible);
  expect(first).toBeGreaterThanOrEqual(0);
  expect(frames[first].box).toMatchObject({ x: 40, y: 94 });
  // No frame shows the panel anywhere else: the corner placement is never visible.
  expect(
    frames
      .filter((f) => f.visible)
      .every((f) => f.box?.x === 40 && f.box?.y === 94),
  ).toBe(true);
});
