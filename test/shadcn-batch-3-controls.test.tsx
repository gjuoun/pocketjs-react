// Batch 3 controls on the real wasm core, from the build (pak boot: baked icons and the style table). Each control
// has a pixel or state assertion: the checkbox tick, the switch thumb, the radio dot, the toggle fill, the tabs panel,
// the accordion height, the slider thumb at its value, and the keys and pointer drags that move them.
import { afterEach, expect, test } from "bun:test";
import { BTN, focusNode, getFocused } from "@pocketjs/framework/input";
import { mount, resetCompatStats } from "../src/index.ts";
import { NODE_TYPE, type NodeMirror, rootMirror } from "../src/internal/pocket.ts";
import { unpack } from "../src/internal/pocket-build.ts";
import { measureBox } from "../src/primitives/anchor.ts";
import { installBuildStyles } from "../src/style/build-styles.ts";
import { build } from "../tools/build.ts";
import { Controls, type Recorder } from "./fixtures/shadcn-batch-3/controls.tsx";
import { bootCore, type Core } from "./harness.ts";

const WHITE = "#ffffff";

/** A dark ink (the glyphs are baked with antialiasing, so the exact token colour is not always drawn). */
const isDark = (hex: string) => Math.max(...[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))) < 0x60;
/** A light ink (a white tick on a dark fill, antialiased). */
const isLight = (hex: string) => Math.min(...[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))) > 0xc0;
const countWhere = (m: Map<string, number>, pick: (hex: string) => boolean) =>
  [...m].filter(([hex]) => pick(hex)).reduce((sum, [, n]) => sum + n, 0);

const SLATE_900 = "#0f172a";
const SLATE_200 = "#e2e8f0";

let core: Core | undefined;
let unmount: (() => void) | undefined;
let pakBytes: ArrayBuffer | undefined;
let calls: [string, unknown][] = [];
const on: Recorder = (name, value) => calls.push([name, value]);

afterEach(() => {
  unmount?.();
  unmount = undefined;
  core?.dispose();
  core = undefined;
  calls = [];
  resetCompatStats();
  installBuildStyles({}, new Uint8Array(0), []);
  delete (globalThis as { __pocketPointer?: unknown }).__pocketPointer;
});

/** The pak and its style table, built once for the whole file. */
async function pak(): Promise<{ bytes: ArrayBuffer; tokens: string[] }> {
  if (pakBytes === undefined) {
    const built = await build("test/fixtures/shadcn-batch-3/controls-main.tsx", {
      outdir: "/tmp/pocketjs-react-test/batch-3-controls",
      name: "batch-3-controls",
    });
    pakBytes = await Bun.file(built.pak).arrayBuffer();
    tokens = built.tokens;
  }
  return { bytes: pakBytes, tokens };
}
let tokens: string[] = [];

/** Boot the core and mount one section. Every test mounts exactly one section. */
async function show(which: string, p: Record<string, any> = {}): Promise<Core> {
  const built = await pak();
  core = await bootCore({ pak: built.bytes });
  const styles = unpack(new Uint8Array(built.bytes)).find((b) => b.key === "ui:styles")!;
  installBuildStyles({}, styles.data, tokens);
  resetCompatStats();
  unmount = mount(<Controls which={which} on={on} p={p} />, { compat: { classMiss: "throw" } });
  core.step(0);
  core.step(0);
  core.render();
  return core;
}

/** Every focusable node of the mounted section, in tree order. */
function focusables(): NodeMirror[] {
  const out: NodeMirror[] = [];
  const walk = (n: NodeMirror) => {
    if ((n as { focusable?: boolean }).focusable) out.push(n);
    for (const k of n.children) walk(k);
  };
  walk(rootMirror);
  return out;
}

/** Every node of a type, in tree order. */
function nodesOf(pick: (n: NodeMirror) => boolean): NodeMirror[] {
  const out: NodeMirror[] = [];
  const walk = (n: NodeMirror) => {
    if (pick(n)) out.push(n);
    for (const k of n.children) walk(k);
  };
  walk(rootMirror);
  return out;
}

const boxOf = (n: NodeMirror) => {
  const box = measureBox(n);
  if (!box) throw new Error("no box");
  return box;
};

const texts = (c: Core): string[] => c.texts().map((r) => r.text);

/** Colour counts over a box, inset from its edge, from the last frame. */
function colours(c: Core, n: NodeMirror, inset = 2): Map<string, number> {
  c.render();
  const b = boxOf(n);
  const out = new Map<string, number>();
  for (let y = b.y + inset; y < b.y + b.h - inset; y++)
    for (let x = b.x + inset; x < b.x + b.w - inset; x++) {
      const hex = c.pixel(x, y);
      out.set(hex, (out.get(hex) ?? 0) + 1);
    }
  return out;
}

/** Press and release the pointer on a node, as a desktop click: on its label when it has one (the core hits
 *  painted ink, so a label is the reliable target), else at its centre. */
function click(c: Core, n: NodeMirror) {
  const b = boxOf(n);
  const run = c.texts().find((r) => r.x >= b.x && r.y >= b.y && r.x + r.w <= b.x + b.w && r.y + r.h <= b.y + b.h);
  const x = run ? run.x + run.w / 2 : b.x + b.w / 2;
  const y = run ? run.y + run.h / 2 : b.y + b.h / 2;
  const q = ((globalThis as { __pocketPointer?: unknown[] }).__pocketPointer ??= []);
  q.push({ x, y, down: true });
  c.step(0);
  q.push({ x, y, down: false });
  // The release clears the press's active: variant and the transition-colors fade runs for a while after it.
  for (let i = 0; i < 40; i++) c.step(0);
}

/** Focus moves off: the focus overlay tints a focused node, so colours are read unfocused. */
function unfocus(c: Core) {
  focusNode(null as never);
  for (let i = 0; i < 40; i++) c.step(0);
}

/** A held drag: down at (x0, y), move to (x1, y), release. */
function drag(c: Core, x0: number, x1: number, y: number) {
  const q = ((globalThis as { __pocketPointer?: unknown[] }).__pocketPointer ??= []);
  q.push({ x: x0, y, down: true });
  c.step(0);
  for (let i = 1; i <= 4; i++) {
    q.push({ x: x0 + ((x1 - x0) * i) / 4, y, down: true });
    c.step(0);
  }
  q.push({ x: x1, y, down: false });
  c.step(0);
  c.step(0);
}

test("checkbox: unchecked draws no fill; checked fills the box and draws a light tick inside it", async () => {
  const c = await show("checkbox", { defaultChecked: false });
  const root = focusables()[0];
  expect(colours(c, root, 3).get(SLATE_900) ?? 0).toBe(0);
  unmount?.();
  const d = await show("checkbox", { defaultChecked: true });
  const box = focusables()[0];
  const ink = colours(d, box, 3);
  expect(ink.get(SLATE_900) ?? 0).toBeGreaterThan(0);
  expect(countWhere(ink, isLight)).toBeGreaterThan(0);
});

test("checkbox: a click toggles it and reports onCheckedChange; controlled checked holds until the prop changes", async () => {
  const c = await show("checkbox", { defaultChecked: false });
  click(c, focusables()[0]);
  expect(calls).toEqual([["checkbox", true]]);
  expect(colours(c, focusables()[0], 3).get(SLATE_900) ?? 0).toBeGreaterThan(0);
  unmount?.();
  calls = [];
  const d = await show("checkbox", { checked: false });
  click(d, focusables()[0]);
  expect(calls).toEqual([["checkbox", true]]);
  expect(colours(d, focusables()[0], 3).get(SLATE_900) ?? 0).toBe(0);
});

test("switch: the thumb sits right when checked and left when not; the track fill follows", async () => {
  const c = await show("switch", { defaultChecked: false });
  const root = focusables()[0];
  const thumb = root.children[0];
  const rb = boxOf(root);
  const off = boxOf(thumb);
  expect(off.x + off.w / 2).toBeLessThan(rb.x + rb.w / 2);
  const mid = rb.y + rb.h / 2;
  c.render();
  expect(c.pixel(rb.x + rb.w - 3, mid)).toBe(SLATE_200);
  unmount?.();
  const d = await show("switch", { defaultChecked: true });
  const dr = boxOf(focusables()[0]);
  const on2 = boxOf(focusables()[0].children[0]);
  expect(on2.x + on2.w / 2).toBeGreaterThan(dr.x + dr.w / 2);
  d.render();
  expect(d.pixel(dr.x + 3, dr.y + dr.h / 2)).toBe(SLATE_900);
});

test("switch: a click toggles it and reports onCheckedChange", async () => {
  const c = await show("switch", { defaultChecked: false });
  click(c, focusables()[0]);
  expect(calls).toEqual([["switch", true]]);
});

test("radio-group: the selected item draws its dot; DOWN moves focus and checks the next item, and wraps", async () => {
  const c = await show("radio-group", { defaultValue: "a" });
  let items = focusables();
  expect(items.length).toBe(3);
  expect(countWhere(colours(c, items[0], 1), isDark)).toBeGreaterThan(0);
  expect(countWhere(colours(c, items[1], 1), isDark)).toBe(0);
  focusNode(items[0]);
  c.press(BTN.DOWN);
  items = focusables();
  expect(getFocused()).toBe(items[1]);
  expect(calls.at(-1)).toEqual(["radio", "b"]);
  c.press(BTN.DOWN);
  c.press(BTN.DOWN);
  expect(getFocused()).toBe(items[0]);
  expect(calls.at(-1)).toEqual(["radio", "a"]);
});

test("toggle: pressed fills slate-200; a click toggles it and reports onPressedChange", async () => {
  const c = await show("toggle", { defaultPressed: false });
  const t = focusables()[0];
  const b = boxOf(t);
  c.render();
  expect(c.pixel(b.x + 8, b.y + b.h / 2)).toBe(WHITE);
  click(c, t);
  expect(calls).toEqual([["toggle", true]]);
  unfocus(c);
  c.render();
  expect(c.pixel(b.x + 8, b.y + b.h / 2)).toBe(SLATE_200);
});

test("toggle-group: single keeps one item on and a second click moves it; multiple keeps both", async () => {
  const c = await show("toggle-group", { type: "single", defaultValue: "a" });
  let items = focusables();
  const fill = (n: NodeMirror) => {
    c.render();
    const b = boxOf(n);
    return c.pixel(b.x + 8, b.y + b.h / 2);
  };
  expect(fill(items[0])).toBe(SLATE_200);
  expect(fill(items[1])).toBe(WHITE);
  click(c, items[1]);
  expect(calls.at(-1)).toEqual(["group", "b"]);
  unfocus(c);
  expect(fill(items[0])).toBe(WHITE);
  expect(fill(items[1])).toBe(SLATE_200);
  unmount?.();
  calls = [];
  const d = await show("toggle-group", { type: "multiple", defaultValue: ["a"] });
  items = focusables();
  click(d, items[1]);
  expect(calls.at(-1)).toEqual(["group", ["a", "b"]]);
  unfocus(d);
  d.render();
  const bb = boxOf(items[0]);
  expect(d.pixel(bb.x + 8, bb.y + bb.h / 2)).toBe(SLATE_200);
});

test("accordion: a trigger opens its item, grows the layout and mounts its content; a single item closes the other", async () => {
  const c = await show("accordion", { type: "single", collapsible: true });
  let triggers = focusables();
  expect(texts(c)).not.toContain("Alpha body");
  const before = boxOf(triggers[1]).y;
  click(c, triggers[0]);
  expect(calls.at(-1)).toEqual(["accordion", "one"]);
  expect(texts(c)).toContain("Alpha body");
  const grown = boxOf(triggers[1]).y - before;
  expect(grown).toBeGreaterThan(0);
  click(c, triggers[1]);
  expect(calls.at(-1)).toEqual(["accordion", "two"]);
  expect(texts(c)).not.toContain("Alpha body");
  expect(texts(c)).toContain("Beta body");
});

test("collapsible: the trigger mounts and unmounts its content and reports the change", async () => {
  const c = await show("collapsible", { defaultOpen: false });
  expect(texts(c)).not.toContain("Hidden body");
  click(c, focusables()[0]);
  expect(calls).toEqual([["collapsible", true]]);
  expect(texts(c)).toContain("Hidden body");
  click(c, focusables()[0]);
  expect(calls.at(-1)).toEqual(["collapsible", false]);
  expect(texts(c)).not.toContain("Hidden body");
});

test("tabs: the active trigger is white on the list; only its panel mounts; a click switches the panel", async () => {
  const c = await show("tabs", { defaultValue: "a" });
  const [a, b] = focusables();
  expect(texts(c)).toContain("Make changes");
  expect(texts(c)).not.toContain("Change password");
  const fillOf = (n: NodeMirror) => {
    c.render();
    const bb = boxOf(n);
    return c.pixel(bb.x + bb.w / 2, bb.y + 2);
  };
  expect(fillOf(a)).toBe(WHITE);
  expect(fillOf(b)).not.toBe(WHITE);
  click(c, b);
  expect(calls.at(-1)).toEqual(["tabs", "b"]);
  expect(texts(c)).toContain("Change password");
  expect(texts(c)).not.toContain("Make changes");
});

test("tabs: RIGHT moves focus to the next trigger and activates it", async () => {
  const c = await show("tabs", { defaultValue: "a" });
  const [a, b] = focusables();
  focusNode(a);
  c.press(BTN.RIGHT);
  expect(getFocused()).toBe(b);
  expect(calls.at(-1)).toEqual(["tabs", "b"]);
  expect(texts(c)).toContain("Change password");
});

test("slider: the thumb centre sits at the value's share of the track at 0, 25, 50 and 100", async () => {
  for (const v of [0, 25, 50, 100]) {
    unmount?.();
    const c = await show("slider", { defaultValue: [v] });
    const root = focusables()[0];
    const rb = boxOf(root);
    const thumb = root.children.find((k) => measureBox(k)?.w === 16)!;
    const centre = boxOf(thumb).x + 8;
    const want = rb.x + 8 + ((rb.w - 16) * v) / 100;
    expect(Math.abs(centre - want)).toBeLessThanOrEqual(1);
    c.dispose();
    core = undefined;
  }
});

test("slider: RIGHT steps by the step size and reports each value", async () => {
  const c = await show("slider", { defaultValue: [25] });
  focusNode(focusables()[0]);
  c.press(BTN.RIGHT);
  expect(calls.at(-1)).toEqual(["slider", 26]);
});

test("slider: a pointer drag from 50% to 80% sets the value to 80 and moves the thumb", async () => {
  const c = await show("slider", { defaultValue: [50] });
  const root = focusables()[0];
  const rb = boxOf(root);
  const mid = rb.y + rb.h / 2;
  const x0 = rb.x + 8 + ((rb.w - 16) * 50) / 100;
  const x1 = rb.x + 8 + ((rb.w - 16) * 80) / 100;
  drag(c, x0, x1, mid);
  expect(calls.slice(-2)).toEqual([["slider", 80], ["commit", 80]]);
});

test("direction: defaults to ltr; a DirectionProvider rtl reaches useDirection", async () => {
  const c = await show("direction", {});
  expect(texts(c)).toContain("ltr");
  unmount?.();
  const d = await show("direction", { dir: "rtl" });
  expect(texts(d)).toContain("rtl");
});

test("breadcrumb: the ChevronRight and MoreHorizontal glyphs mount and draw ink inside their boxes", async () => {
  const c = await show("breadcrumb");
  expect(texts(c)).toContain("Home");
  const images = nodesOf((n) => n.type === NODE_TYPE.image);
  expect(images.length).toBeGreaterThanOrEqual(3);
  for (const img of images) {
    const ink = colours(c, img, 2);
    const inked = [...ink.keys()].some((hex) => hex !== WHITE);
    expect(inked).toBe(true);
  }
});
