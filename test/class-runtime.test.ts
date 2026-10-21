// Runtime className against the real wasm core: strings built by cn/clsx draw exactly what
// the same utilities draw as static literals (reference swatches in the same frame).
import { afterAll, beforeAll, expect, test } from "bun:test";
import { BTN } from "@pocketjs/framework/input";
import { build, type BuildResult } from "../tools/build.ts";
import { bootApp, bootCore, type Core, type TextRun } from "./harness.ts";

let built: BuildResult;
let core: Core;
const SETTLE = 15; // transition-colors duration-150 is 9 frames at 60 Hz

beforeAll(async () => {
  built = await build("test/fixtures/dynamic/main.tsx", { outdir: "/tmp/pocketjs-react-test/class-runtime" });
  core = await bootApp(built);
});
afterAll(() => core.dispose());

const run = (text: string): TextRun => {
  const r = core.texts().find((t) => t.text === text);
  if (!r) throw new Error("not drawn: " + text);
  return r;
};
/** Swatch color: the 30x10 box left of its label (gap-2 = 8 px). */
const swatch = (label: string) => { const r = run(label); return core.pixel(r.x - 8 - 15, r.y + Math.floor(r.h / 2)); };
/** Row background just left of the row label. */
const rowBg = (label: string) => { const r = run(label); return core.pixel(r.x - 4, r.y + 2); };
/** The 30x10 badge at the row's right edge. */
const badge = (label: string) => { const r = run(label); return core.pixel(440, r.y + Math.floor(r.h / 2)); };
const press = (b: number) => { core.press(b); for (let i = 0; i < SETTLE; i++) core.step(0); };

let alphaX0 = 0;
let alphaBg0 = "";

test("cn swaps px-3 for px-6 and paints bg-emerald-700 like the static literal does", () => {
  alphaX0 = run("Alpha").x;
  alphaBg0 = rowBg("Alpha");
  press(BTN.DOWN); // focus Alpha
  press(BTN.CIRCLE); // Alpha on
  press(BTN.DOWN); // focus Bravo, Alpha keeps its runtime class unfocused
  expect(run("Alpha").x - alphaX0).toBe(12);
  expect(rowBg("Alpha")).toBe(swatch("emerald"));
});

test("the focus: variant stays native on a runtime-interned record", () => {
  press(BTN.UP); // focus Alpha again (it is on)
  expect(rowBg("Alpha")).toBe(swatch("blue"));
});

test("toggling off restores the original x and color", () => {
  press(BTN.CIRCLE); // Alpha off
  press(BTN.DOWN); // focus Bravo
  expect(run("Alpha").x).toBe(alphaX0);
  expect(rowBg("Alpha")).toBe(alphaBg0);
});

test("clsx with a condition and an object draws the blue and dimmed swatches", () => {
  press(BTN.UP); // Alpha
  press(BTN.CIRCLE); // Alpha on -> badge bg-blue-600
  press(BTN.DOWN); // Bravo
  press(BTN.CIRCLE); // Bravo on -> badge bg-blue-600 opacity-50 over emerald
  press(BTN.DOWN); // Stress row takes focus, Bravo row shows bg-emerald-700
  expect(badge("Alpha")).toBe(swatch("blue"));
  expect(badge("Bravo")).toBe(swatch("dim"));
});

test("200 new class combinations in one commit cost one loadStyles, earlier ids keep drawing", () => {
  const ops = core.ops;
  const original = ops.loadStyles;
  let loads = 0;
  let records = 0;
  ops.loadStyles = (bytes: Uint8Array) => {
    loads++;
    records = new DataView(bytes.buffer, bytes.byteOffset).getUint16(6, true);
    return original.call(ops, bytes);
  };
  try {
    press(BTN.CIRCLE); // Stress: 200 views, each "h-[1px] bg-sky-400 w-[Npx]"
  } finally {
    ops.loadStyles = original;
  }
  expect(loads).toBe(1);
  expect(records).toBeGreaterThanOrEqual(223 + 200); // build table + 200 runtime records
  expect(rowBg("Alpha")).toBe(swatch("emerald"));
  expect(badge("Bravo")).toBe(swatch("dim"));
});
test("a utility name assembled at runtime is rejected, as with Tailwind", async () => {
  const name = await build("test/fixtures/built-name/main.tsx", { outdir: "/tmp/pocketjs-react-test/class-runtime" });
  const other = await bootCore({ pak: await Bun.file(name.pak).arrayBuffer() });
  try {
    expect(() => (0, eval)(require("node:fs").readFileSync(name.js, "utf8"))).toThrow('"w-[40px]" does not appear in the source');
  } finally {
    other.dispose();
  }
});
