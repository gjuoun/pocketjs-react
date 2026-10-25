// JG-156 visual fidelity, Step 1: the defects behind the Gemini FIX verdict, each as a pixel or tree
// assertion on the real wasm core. The group comment names the step that turns it green. Ink is
// measured as the pixels that differ from the run's dominant surface colour, because a text run's
// rect can be its whole host box (a stretched badge or glyph), where a rect centre proves nothing.
import { mkdirSync } from "node:fs";
import { afterEach, expect, test } from "bun:test";
import { BTN, getFocused } from "@pocketjs/framework/input";
import { compatStats, mount, resetCompatStats } from "../src/index.ts";
import { NODE_TYPE, type NodeMirror, rootMirror } from "../src/internal/pocket.ts";
import { compileClasses, FB_H, FB_W, unpack } from "../src/internal/pocket-build.ts";
import { measureBox } from "../src/primitives/anchor.ts";
import { installBuildStyles } from "../src/style/build-styles.ts";
import { iconVariantOf } from "../src/style/icon-colour.ts";
import { build } from "../tools/build.ts";
import { Demo } from "./fixtures/shadcn-vendor/app.tsx";
import { Overlays } from "./fixtures/shadcn-vendor/overlays.tsx";
import { IconSheet } from "./fixtures/icons/sheet.tsx";
import { Inherit } from "./fixtures/visual-fidelity/inherit.tsx";
import { bootCore, type Core, type TextRun } from "./harness.ts";
import { encodePng } from "./png.ts";

const VENDOR = "test/fixtures/shadcn-vendor";
const FIXTURES = "test/fixtures/visual-fidelity";
const OUT = "/tmp/pocketjs-react-test/jg156";
let core: Core | undefined;
let unmount: (() => void) | undefined;
afterEach(() => {
  unmount?.();
  unmount = undefined;
  core?.dispose();
  core = undefined;
  resetCompatStats();
  installBuildStyles({}, new Uint8Array(0), []);
});

async function bootBuilt(
  entry: string,
  name: string,
  app: unknown,
): Promise<Core> {
  const built = await build(entry, { outdir: OUT, name });
  const pak = await Bun.file(built.pak).arrayBuffer();
  core = await bootCore({ pak });
  const styles = unpack(new Uint8Array(pak)).find((b) => b.key === "ui:styles")!;
  installBuildStyles({}, styles.data, built.tokens);
  unmount = mount(app as never, { compat: { classMiss: "drop" } });
  core.step(0);
  return core;
}
const bootOverlays = () =>
  bootBuilt(VENDOR + "/overlays-main.tsx", "jg156-overlays", <Overlays />);
const bootDemo = () => bootBuilt(VENDOR + "/main.tsx", "jg156-demo", <Demo />);
const bootSheet = () => bootBuilt("test/fixtures/icons/sheet-main.tsx", "jg159-sheet", <IconSheet />);

/** First text mirror whose content is exactly `text`, in tree order. */
function textNode(text: string): NodeMirror | undefined {
  const walk = (n: NodeMirror): NodeMirror | undefined => {
    if (n.text === text) return n;
    for (const k of n.children) {
      const f = walk(k);
      if (f) return f;
    }
    return undefined;
  };
  return walk(rootMirror);
}
/** The element a text mirror sits in (the box a label is laid out in). */
function hostOf(text: string): NodeMirror {
  const t = textNode(text);
  if (!t?.parent) throw new Error("no host for " + JSON.stringify(text));
  return t.parent;
}
function runOf(c: Core, text: string): TextRun {
  const r = c.texts().find((t) => t.text === text);
  if (!r)
    throw new Error(
      "no run " +
        JSON.stringify(text) +
        "; have " +
        JSON.stringify(c.texts().map((t) => t.text)),
    );
  return r;
}
const lum = (hex: string): number => {
  const n = parseInt(hex.slice(1), 16);
  return (
    0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)
  );
};
/** Bounding box of the pixels in `r` that differ from the run's dominant colour (the ink). */
function inkBox(
  c: Core,
  r: TextRun,
): { x: number; y: number; w: number; h: number; n: number } | null {
  const hist = new Map<string, number>();
  const px = (x: number, y: number) => c.pixel(x, y);
  for (let y = r.y; y < r.y + r.h; y++)
    for (let x = r.x; x < r.x + r.w; x++)
      hist.set(px(x, y), (hist.get(px(x, y)) ?? 0) + 1);
  const bg = [...hist.entries()].sort((a, b) => b[1] - a[1])[0][0];
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -1,
    y1 = -1,
    n = 0;
  for (let y = r.y; y < r.y + r.h; y++)
    for (let x = r.x; x < r.x + r.w; x++)
      if (px(x, y) !== bg) {
        n++;
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
  return n === 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, n };
}
const centreOff = (
  ink: { x: number; y: number; w: number; h: number },
  box: { x: number; y: number; w: number; h: number },
) => ({
  dx: Math.abs(ink.x + ink.w / 2 - (box.x + box.w / 2)),
  dy: Math.abs(ink.y + ink.h / 2 - (box.y + box.h / 2)),
});

// --- G1 (Step 2): text colour inherits from the nearest ancestor that sets one ----------------
// The probe-free check: a view sets text-slate-900 and its raw label carries no colour of its own.
/** Count the run's pixels whose luminance is below (dark ink) or above (light ink) 128. */
function ink(c: Core, r: TextRun, tone: "dark" | "light"): number {
  let n = 0;
  for (let y = r.y; y < r.y + r.h; y++)
    for (let x = r.x; x < r.x + r.w; x++) {
      const l = lum(c.pixel(x, y));
      if (tone === "dark" ? l < 128 : l >= 128) n++;
    }
  return n;
}

void compatStats; // counters are read in the Step 9 screenshot run

test("G1 inherit: a label under bg-white text-slate-900 takes the dark colour", async () => {
  const c = await bootBuilt(
    FIXTURES + "/inherit-main.tsx",
    "jg156-inherit",
    <Inherit />,
  );
  expect(ink(c, runOf(c, "Inherited"), "dark")).toBeGreaterThan(20);
});

test("G1 inherit: an explicit colour wins over the ancestor (white on slate-900 stays white)", async () => {
  const c = await bootBuilt(
    FIXTURES + "/inherit-main.tsx",
    "jg156-inherit",
    <Inherit />,
  );
  const r = runOf(c, "Explicit");
  expect(ink(c, r, "light")).toBeGreaterThan(20);
});

test("G1 inherit: a focus-variant colour is not overridden (the label keeps the core default)", async () => {
  const c = await bootBuilt(
    FIXTURES + "/inherit-main.tsx",
    "jg156-inherit",
    <Inherit />,
  );
  const r = runOf(c, "Variant");
  expect(ink(c, r, "dark")).toBe(0);
  expect(ink(c, r, "light")).toBeGreaterThan(20);
});

test("G1 fixture: the status text is not white on the slate-100 page", async () => {
  const c = await bootOverlays();
  const r = runOf(c, "Deletes 0");
  let dark = 0;
  for (let y = r.y; y < r.y + r.h; y++)
    for (let x = r.x; x < r.x + r.w; x++) if (lum(c.pixel(x, y)) < 128) dark++;
  expect(dark).toBeGreaterThan(20);
});

// --- G2 (Step 6, Step 7): buttons are content-width with centred labels ------------------------
test("G2 Open trigger is content-width: box = label + px-4 (±1px)", async () => {
  const c = await bootOverlays();
  const box = measureBox(hostOf("Open"))!;
  expect(Math.abs(box.w - (runOf(c, "Open").w + 32))).toBeLessThanOrEqual(1);
});

test("G2 Save in its row is content-width (guard)", async () => {
  const c = await bootDemo();
  const box = measureBox(hostOf("Save"))!;
  expect(Math.abs(box.w - (runOf(c, "Save").w + 32))).toBeLessThanOrEqual(1);
});

// --- G3 (Step 4): the chevron glyph is centred in its box, not drawn at the top-left ----------
/** Every icon Image mounted, in tree order. */
function iconImages(): NodeMirror[] {
  const out: NodeMirror[] = [];
  const walk = (n: NodeMirror) => {
    if (n.type === NODE_TYPE.image) out.push(n);
    for (const k of n.children) walk(k);
  };
  walk(rootMirror);
  return out;
}
/** Ink box of an icon: the pixels that differ from the surface under its corner (transparent there). */
function iconInk(c: Core, box: { x: number; y: number; w: number; h: number }) {
  c.render();
  const bg = c.pixel(box.x, box.y);
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (let y = box.y; y < box.y + box.h; y++)
    for (let x = box.x; x < box.x + box.w; x++)
      if (c.pixel(x, y) !== bg) {
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

// G3: the Select chevron is a real icon: a 16px Image, its ink centred in the box; no 'v' text.
test("G3 Select chevron is a real icon: 16px square, ink centred, no placeholder", async () => {
  const c = await bootOverlays();
  const icons = iconImages();
  expect(icons.length).toBe(1);
  expect(iconVariantOf(icons[0])).toMatch(/^icon\.chevron-down\.16\./);
  const box = measureBox(icons[0])!;
  expect(box.w).toBe(16);
  expect(box.h).toBe(16);
  const ink = iconInk(c, box)!;
  expect(centreOff(ink, box).dx).toBeLessThanOrEqual(1);
  expect(centreOff(ink, box).dy).toBeLessThanOrEqual(1);
  expect(c.texts().some((r) => r.text === "v")).toBe(false);
});

test("G7 Dialog close X is a real icon: 16px square, ink centred", async () => {
  const c = await bootOverlays();
  focusOn(c, "Open");
  c.press(BTN.CIRCLE, 4);
  expect(c.texts().map((r) => r.text)).toContain("Dialog title");
  const x = iconImages().find((n) => iconVariantOf(n)?.startsWith("icon.x.16."));
  expect(x).toBeDefined();
  const box = measureBox(x!)!;
  expect(box.w).toBe(16);
  expect(box.h).toBe(16);
  const ink = iconInk(c, box)!;
  expect(centreOff(ink, box).dx).toBeLessThanOrEqual(1);
  expect(centreOff(ink, box).dy).toBeLessThanOrEqual(1);
});

test("G8 Select check mark is a real icon once an item is selected", async () => {
  const c = await bootOverlays();
  focusOn(c, "Pick fruit");
  c.press(BTN.CIRCLE, 4);
  focusOn(c, "Apple");
  c.press(BTN.CIRCLE, 4);
  c.press(BTN.CIRCLE, 4);
  expect(iconImages().some((n) => iconVariantOf(n)?.startsWith("icon.check.16."))).toBe(true);
});

test("G9 the icon sheet draws all six icons in three colour variants", async () => {
  await bootSheet();
  const ids = iconImages().map((n) => iconVariantOf(n)).sort();
  const names = ["check", "chevron-down", "chevron-right", "chevron-up", "circle", "x"];
  const expected = [];
  for (const colour of ["slate-900", "slate-500", "white"])
    for (const name of names) expected.push(`icon.${name}.${name === "circle" ? 8 : 16}.${colour}`);
  expect(ids).toEqual(expected.sort());
});

// --- G4 (Step 5): the badge label is vertically centred in the badge; the badge is content height ----
test("G4 Beta label ink is vertically centred in the badge", async () => {
  const c = await bootDemo();
  const badge = hostOf("Beta").parent!;
  const box = measureBox(badge)!;
  const ink = inkBox(c, runOf(c, "Beta"))!;
  expect(centreOff(ink, box).dy).toBeLessThanOrEqual(1);
});

test("G4 Beta badge is not stretched to the row height (content height, ±2px)", async () => {
  await bootDemo();
  expect(measureBox(hostOf("Beta").parent!)!.h).toBeLessThanOrEqual(24);
});

// --- G5 (Step 8): card title and description keep an even 8px gap (guard; not reproduced) -----
test("G5 Card title to description gap is gap-2 (8px) ±1 (guard)", async () => {
  const c = await bootDemo();
  const t = runOf(c, "Vendored card");
  const d = runOf(c, "codemod output");
  expect(Math.abs(d.y - (t.y + t.h) - 8)).toBeLessThanOrEqual(1);
});

// --- Step 9: the three Gemini QA screenshots (idle, menu open, select open) -----------------------
const SHOTS = "/tmp/pocketjs-react-test/jg156";
/** The label of the focused node's first text (a Button or Trigger shows its label). */
function focusedLabel(): string | undefined {
  const walk = (node: {
    text?: string;
    children: unknown[];
  }): string | undefined => {
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
  for (let i = 0; i < 6 && focusedLabel() !== label; i++) c.press(BTN.DOWN, 4);
  expect(focusedLabel()).toBe(label);
}
async function snapshot(c: Core, name: string, dir = SHOTS): Promise<void> {
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
  mkdirSync(dir, { recursive: true });
  await Bun.write(dir + "/" + name + ".png", encodePng(rgba, FB_W, FB_H));
}

test("screenshot: idle overlays demo", async () => {
  const c = await bootOverlays();
  await snapshot(c, "idle");
});

test("screenshot: menu open", async () => {
  const c = await bootOverlays();
  focusOn(c, "Menu");
  c.press(BTN.CIRCLE, 4);
  expect(c.texts().map((t) => t.text)).toContain("Edit");
  await snapshot(c, "menu-open");
});

test("screenshot: select open", async () => {
  const c = await bootOverlays();
  focusOn(c, "Pick fruit");
  c.press(BTN.CIRCLE, 4);
  expect(c.texts().map((t) => t.text)).toContain("Apple");
  await snapshot(c, "select-open");
});

// --- Icon screenshots for the Gemini gate: the real icons on the demo and the icon sheet -------
const ICON_SHOTS = "/tmp/pocketjs-react-test/jg159";

test("screenshot: select chevron, idle", async () => {
  const c = await bootOverlays();
  await snapshot(c, "select-chevron", ICON_SHOTS);
});

test("screenshot: dialog close X", async () => {
  const c = await bootOverlays();
  focusOn(c, "Open");
  c.press(BTN.CIRCLE, 4);
  await snapshot(c, "dialog-x", ICON_SHOTS);
});

test("screenshot: select check mark", async () => {
  const c = await bootOverlays();
  focusOn(c, "Pick fruit");
  c.press(BTN.CIRCLE, 4);
  focusOn(c, "Apple");
  c.press(BTN.CIRCLE, 4);
  c.press(BTN.CIRCLE, 4);
  await snapshot(c, "select-check", ICON_SHOTS);
});

test("screenshot: icon sheet (chevron, x, check, circle in three colours)", async () => {
  const c = await bootSheet();
  await snapshot(c, "icon-sheet", ICON_SHOTS);
});
