// JG-156 visual fidelity, Step 1: the defects behind the Gemini FIX verdict, each as a pixel or tree
// assertion on the real wasm core. The group comment names the step that turns it green. Ink is
// measured as the pixels that differ from the run's dominant surface colour, because a text run's
// rect can be its whole host box (a stretched badge or glyph), where a rect centre proves nothing.
import { afterEach, expect, test } from "bun:test";
import { mount } from "../src/index.ts";
import { rootMirror, type NodeMirror } from "../src/internal/pocket.ts";
import { compileClasses } from "../src/internal/pocket-build.ts";
import { measureBox } from "../src/primitives/anchor.ts";
import { installBuildStyles } from "../src/style/build-styles.ts";
import { build } from "../tools/build.ts";
import { Overlays } from "./fixtures/shadcn-vendor/overlays.tsx";
import { Demo } from "./fixtures/shadcn-vendor/app.tsx";
import { Inherit } from "./fixtures/visual-fidelity/inherit.tsx";
import { bootCore, type Core, type TextRun } from "./harness.ts";

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
  installBuildStyles({}, new Uint8Array(0), []);
});

async function bootBuilt(entry: string, name: string, app: unknown): Promise<Core> {
  const built = await build(entry, { outdir: OUT, name });
  core = await bootCore({ classes: built.tokens });
  installBuildStyles({}, compileClasses([]).bin, built.tokens);
  unmount = mount(app as never, { compat: { classMiss: "drop" } });
  core.step(0);
  return core;
}
const bootOverlays = () => bootBuilt(VENDOR + "/overlays-main.tsx", "jg156-overlays", <Overlays />);
const bootDemo = () => bootBuilt(VENDOR + "/main.tsx", "jg156-demo", <Demo />);

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
  if (!r) throw new Error("no run " + JSON.stringify(text) + "; have " + JSON.stringify(c.texts().map((t) => t.text)));
  return r;
}
const lum = (hex: string): number => {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
};
/** Bounding box of the pixels in `r` that differ from the run's dominant colour (the ink). */
function inkBox(c: Core, r: TextRun): { x: number; y: number; w: number; h: number; n: number } | null {
  const hist = new Map<string, number>();
  const px = (x: number, y: number) => c.pixel(x, y);
  for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) hist.set(px(x, y), (hist.get(px(x, y)) ?? 0) + 1);
  const bg = [...hist.entries()].sort((a, b) => b[1] - a[1])[0][0];
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1, n = 0;
  for (let y = r.y; y < r.y + r.h; y++)
    for (let x = r.x; x < r.x + r.w; x++)
      if (px(x, y) !== bg) {
        n++;
        x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      }
  return n === 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, n };
}
const centreOff = (ink: { x: number; y: number; w: number; h: number }, box: { x: number; y: number; w: number; h: number }) => ({
  dx: Math.abs(ink.x + ink.w / 2 - (box.x + box.w / 2)),
  dy: Math.abs(ink.y + ink.h / 2 - (box.y + box.h / 2)),
});

// --- G1 (Step 2): text colour inherits from the nearest ancestor that sets one ----------------
// The probe-free check: a view sets text-slate-900 and its raw label carries no colour of its own.
test("G1 inherit: a label under bg-white text-slate-900 is dark ink, an explicit text-white stays white", async () => {
  const c = await bootBuilt(FIXTURES + "/inherit-main.tsx", "jg156-inherit", <Inherit />);
  const dark = (r: TextRun) => { let n = 0; for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (lum(c.pixel(x, y)) < 128) n++; return n; };
  expect(dark(runOf(c, "Inherited"))).toBeGreaterThan(20);
  const explicit = runOf(c, "Explicit");
  expect(dark(explicit)).toBe(0);
});

test("G1 fixture: the status text is not white on the slate-100 page", async () => {
  const c = await bootOverlays();
  const r = runOf(c, "Deletes 0");
  let dark = 0;
  for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (lum(c.pixel(x, y)) < 128) dark++;
  expect(dark).toBeGreaterThan(20);
});

// --- G2 (Step 6, Step 7): buttons are content-width with centred labels ------------------------
test("G2 Under is content-width: box = label + px-4 on both sides (±1px)", async () => {
  const c = await bootOverlays();
  const box = measureBox(hostOf("Under"))!;
  expect(Math.abs(box.w - (runOf(c, "Under").w + 32))).toBeLessThanOrEqual(1);
});

test("G2 Open trigger is content-width like Under: box = label + px-4 (±1px)", async () => {
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
test("G3 Select chevron glyph ink is centred in its box", async () => {
  const c = await bootOverlays();
  const box = measureBox(hostOf("v"))!;
  const ink = inkBox(c, runOf(c, "v"))!;
  const { dx, dy } = centreOff(ink, box);
  expect(dx).toBeLessThanOrEqual(1);
  expect(dy).toBeLessThanOrEqual(1);
});

// --- G4 (Step 5): the badge label is vertically centred in its pill ---------------------------
test("G4 Beta label ink is vertically centred in the badge", async () => {
  const c = await bootDemo();
  const box = measureBox(hostOf("Beta"))!;
  const ink = inkBox(c, runOf(c, "Beta"))!;
  expect(centreOff(ink, box).dy).toBeLessThanOrEqual(1);
});

test("G4 Beta badge is not stretched to the row height (content height, ±2px)", async () => {
  const c = await bootDemo();
  expect(measureBox(hostOf("Beta"))!.h).toBeLessThanOrEqual(24);
});

// --- G5 (Step 8): card title and description keep an even 8px gap (guard; not reproduced) -----
test("G5 Card title to description gap is gap-2 (8px) ±1 (guard)", async () => {
  const c = await bootDemo();
  const t = runOf(c, "Vendored card");
  const d = runOf(c, "codemod output");
  expect(Math.abs(d.y - (t.y + t.h) - 8)).toBeLessThanOrEqual(1);
});
