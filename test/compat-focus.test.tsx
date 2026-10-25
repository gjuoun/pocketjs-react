// Focus indicator: a DOM-mapped focusable draws a default focus border with no explicit
// focus: border style; an author focus: border keeps its own colour. Real wasm core, pixel asserts.
import { afterEach, beforeEach, expect, test } from "bun:test";
import { BTN, getFocused } from "@pocketjs/framework/input";
import { mount, resetCompatStats, View } from "../src/index.ts";
import { type NodeMirror, rootMirror } from "../src/internal/pocket.ts";
import { measureBox } from "../src/primitives/anchor.ts";
import { compileClasses, FB_H, FB_W } from "../src/internal/pocket-build.ts";
import { installBuildStyles } from "../src/style/build-styles.ts";
import { build } from "../tools/build.ts";
import { Demo } from "./fixtures/shadcn-vendor/app.tsx";
import { Overlays } from "./fixtures/shadcn-vendor/overlays.tsx";
import { bootCore, type Core } from "./harness.ts";
import { encodePng } from "./png.ts";

const COL = "flex flex-col gap-4 p-4 bg-white";
const PLAIN_DARK = "flex w-[120px] h-[40px] bg-slate-900";
const PLAIN_LIGHT = "flex w-[120px] h-[40px] bg-white";
const AUTHOR_RED = "flex w-[120px] h-[40px] bg-slate-900 focus:border-red-600";
const BLUE = "#2563eb";
const RED = "#dc2626";
const GREEN = "#00ff00";
const NATIVE_FOCUS = "flex w-[120px] h-[40px] bg-slate-900 focus:bg-slate-200";
const BG_FOCUS = "flex w-[120px] h-[40px] bg-slate-900 focus:bg-slate-200";
const INTERIOR = "#0f172a";

let core: Core | undefined;
let unmount: (() => void) | undefined;
beforeEach(() => installBuildStyles({}, compileClasses([]).bin, BOOT.join(" ").split(/\s+/)));
afterEach(() => {
  unmount?.();
  unmount = undefined;
  resetCompatStats();
  core?.dispose();
  installBuildStyles({}, new Uint8Array(0), []);
});

const BOOT = [COL, PLAIN_DARK, PLAIN_LIGHT, AUTHOR_RED, "focus:border-blue-600", "focus:border-2", "focus:border-red-600", "focus:bg-slate-200", "text-base text-white"];

async function start(kids: Array<"dark" | "light" | "red" | "bg" | "native" | "green">): Promise<{ c: Core; nodes: NodeMirror[] }> {
  core = await bootCore({ classes: BOOT });
  const cls = { dark: PLAIN_DARK, light: PLAIN_LIGHT, red: AUTHOR_RED, bg: BG_FOCUS, native: NATIVE_FOCUS, green: PLAIN_DARK };
  unmount = mount(
    <div className={COL}>
      {kids.map((k, i) => (
        <button key={i} className={cls[k]} />
      ))}
    </div>,
  );
  core.step(0);
  const column = rootMirror.children[0].children[0];
  return { c: core, nodes: [...column.children] as NodeMirror[] };
}

/** Press DOWN until the node has focus (focus starts on nothing; the first DOWN takes the first). */
function focusOn(c: Core, node: NodeMirror): void {
  for (let i = 0; i < 6 && getFocused() !== node; i++) c.press(BTN.DOWN);
  expect(getFocused()).toBe(node);
}

/** The outermost pixel, mid-height: the focus border covers it (1px or 2px wide). */
function edge(c: Core, node: NodeMirror): string {
  const r = measureBox(node)!;
  c.render();
  return c.pixel(r.x, r.y + Math.floor(r.h / 2));
}

function interior(c: Core, node: NodeMirror): string {
  const r = measureBox(node)!;
  c.render();
  return c.pixel(r.x + 30, r.y + Math.floor(r.h / 2));
}

test("compat button shows a default focus border when focused", async () => {
  const { c, nodes } = await start(["dark", "light"]);
  const idle = edge(c, nodes[0]);
  focusOn(c, nodes[0]);
  expect(edge(c, nodes[0])).toBe(BLUE);
  expect(idle).toBe(INTERIOR);
});

test("an unfocused compat button draws no focus border", async () => {
  const { c, nodes } = await start(["dark", "light"]);
  expect(edge(c, nodes[0])).toBe(interior(c, nodes[0]));
  expect(edge(c, nodes[1])).toBe(interior(c, nodes[1]));
});

test("blurring restores the unfocused pixels exactly", async () => {
  const { c, nodes } = await start(["dark", "light"]);
  const idle = edge(c, nodes[0]);
  focusOn(c, nodes[0]);
  focusOn(c, nodes[1]);
  expect(edge(c, nodes[0])).toBe(idle);
});

test("an author focus border colour wins over the default", async () => {
  const { c, nodes } = await start(["red"]);
  focusOn(c, nodes[0]);
  expect(edge(c, nodes[0])).toBe(RED);
});

test("an author focus border colour does not stack the default width", async () => {
  const { c, nodes } = await start(["red"]);
  focusOn(c, nodes[0]);
  const r = measureBox(nodes[0])!;
  c.render();
  expect(c.pixel(r.x + 1, r.y + 20)).toBe(INTERIOR);
});

test("an inline border style wins: no default border is added", async () => {
  core = await bootCore({ classes: BOOT });
  unmount = mount(
    <div className={COL}>
      <button className={PLAIN_DARK} style={{ borderWidth: 3, borderColor: GREEN }} />
    </div>,
  );
  core.step(0);
  const node = rootMirror.children[0].children[0].children[0] as NodeMirror;
  focusOn(core, node);
  expect(edge(core, node)).toBe(GREEN);
});

test("an author focus background keeps its fill and still gets the default border", async () => {
  const { c, nodes } = await start(["bg"]);
  const idle = interior(c, nodes[0]);
  focusOn(c, nodes[0]);
  expect(edge(c, nodes[0])).toBe(BLUE);
  expect(interior(c, nodes[0])).not.toBe(idle);
});

test("a native focusable View gets no default border (native surface is untouched)", async () => {
  core = await bootCore({ classes: BOOT });
  unmount = mount(
    <div className={COL}>
      <View className={NATIVE_FOCUS} focusable />
    </div>,
  );
  core.step(0);
  const node = rootMirror.children[0].children[0].children[0] as NodeMirror;
  focusOn(core, node);
  expect(edge(core, node)).toBe(interior(core, node));
});

/** Every pixel inside a node's border box, row-major. */
function boxPixels(c: Core, node: NodeMirror): string[] {
  const r = measureBox(node)!;
  c.render();
  const out: string[] = [];
  for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) out.push(c.pixel(x, y));
  return out;
}

test("unfocused siblings keep their pixels and boxes when focus moves", async () => {
  const { c, nodes } = await start(["dark", "light", "dark"]);
  const boxesIdle = nodes.map((n) => JSON.stringify(measureBox(n)));
  const idleFirst = boxPixels(c, nodes[0]);
  const idleLast = boxPixels(c, nodes[2]);
  focusOn(c, nodes[1]);
  expect(nodes.map((n) => JSON.stringify(measureBox(n)))).toEqual(boxesIdle);
  expect(boxPixels(c, nodes[0])).toEqual(idleFirst);
  expect(boxPixels(c, nodes[2])).toEqual(idleLast);
  focusOn(c, nodes[2]);
  expect(boxPixels(c, nodes[0])).toEqual(idleFirst);
  expect(nodes.map((n) => JSON.stringify(measureBox(n)))).toEqual(boxesIdle);
  console.log("unfocused pixels identical");
});

// --- d-pad end to end on the built shadcn demo (compat focus pass) -----------------------------
const VENDOR = "test/fixtures/shadcn-vendor";
const SHOTS = "/tmp/pocketjs-react-test/jg157";

async function bootBuilt(entry: string, name: string, app: unknown): Promise<Core> {
  const built = await build(entry, { outdir: SHOTS, name });
  core = await bootCore({ classes: built.tokens, fontSlots: built.fontSlots });
  installBuildStyles({}, compileClasses([]).bin, built.tokens);
  unmount = mount(app as never, { compat: { classMiss: "drop" } });
  core.step(0);
  return core;
}

/** shadcn's transition-all animates the focus colour over frames: sample only after it lands. */
function settle(c: Core): void {
  for (let i = 0; i < 40; i++) c.step(0);
  c.render();
}

/** Every focusable node under a root, in document order (the d-pad order). */
function focusables(node: NodeMirror, out: NodeMirror[] = []): NodeMirror[] {
  if (node.focusable) out.push(node);
  for (const child of node.children) focusables(child, out);
  return out;
}

test("d-pad moves focus through every mapped focusable, each showing the border", async () => {
  const c = await bootBuilt(VENDOR + "/main.tsx", "jg157-demo", <Demo />);
  const nodes = focusables(rootMirror);
  expect(nodes.length).toBeGreaterThan(2);
  const idle = nodes.map((n) => edge(c, n));
  for (let i = 0; i < nodes.length; i++) {
    focusOn(c, nodes[i]);
    settle(c);
    expect(edge(c, nodes[i])).toBe(BLUE);
    nodes.forEach((n, j) => {
      if (j !== i) expect(edge(c, n)).toBe(idle[j]);
    });
  }
  console.log("d-pad: " + nodes.length + " focusables, each focused edge blue, unfocused unchanged");
});

// --- the four QA screenshots (Gemini gate is a handoff): idle, menu-open, select-open, focus-moved
/** The label of the focused node's first text (same walk as the visual-fidelity shots). */
function focusedLabel(): string | undefined {
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
function focusOnLabel(c: Core, label: string): void {
  for (let i = 0; i < 6 && focusedLabel() !== label; i++) c.press(BTN.DOWN, 4);
  expect(focusedLabel()).toBe(label);
}
async function snapshot(c: Core, name: string): Promise<void> {
  c.render();
  const rgba = new Uint8Array(FB_W * FB_H * 4);
  for (let y = 0; y < FB_H; y++)
    for (let x = 0; x < FB_W; x++) {
      const hex = c.pixel(x, y);
      const i = (y * FB_W + x) * 4;
      rgba[i] = parseInt(hex.slice(1, 3), 16);
      rgba[i + 1] = parseInt(hex.slice(3, 5), 16);
      rgba[i + 2] = parseInt(hex.slice(5, 7), 16);
      rgba[i + 3] = 255;
    }
  await Bun.write(SHOTS + "/" + name + ".png", encodePng(rgba, FB_W, FB_H));
}

test("screenshot: idle", async () => {
  const c = await bootBuilt(VENDOR + "/overlays-main.tsx", "jg157-overlays", <Overlays />);
  await snapshot(c, "idle");
});

test("screenshot: menu-open", async () => {
  const c = await bootBuilt(VENDOR + "/overlays-main.tsx", "jg157-overlays", <Overlays />);
  focusOnLabel(c, "Menu");
  c.press(BTN.CIRCLE, 4);
  expect(c.texts().map((t) => t.text)).toContain("Edit");
  await snapshot(c, "menu-open");
});

test("screenshot: select-open", async () => {
  const c = await bootBuilt(VENDOR + "/overlays-main.tsx", "jg157-overlays", <Overlays />);
  focusOnLabel(c, "Pick fruit");
  c.press(BTN.CIRCLE, 4);
  expect(c.texts().map((t) => t.text)).toContain("Apple");
  await snapshot(c, "select-open");
});

test("screenshot: focus-moved", async () => {
  const c = await bootBuilt(VENDOR + "/main.tsx", "jg157-demo", <Demo />);
  c.press(BTN.DOWN, 4);
  settle(c);
  expect(edge(c, getFocused() as NodeMirror)).toBe(BLUE);
  await snapshot(c, "focus-moved");
});
