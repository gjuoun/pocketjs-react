// The reader's desktop build (tools/build-reader.ts --cjk) bakes 8,836 hanzi plus CJK punctuation
// into the body slots from the committed Noto Sans SC subset. Played on the wasm core with no
// runtime glyphs (the desktop host has none), Chinese draws with real advances, the drawn lines
// are the computed lines, and Han titles stay out of the bold slots, which carry no CJK.
import { afterAll, beforeAll, expect, spyOn, test } from "bun:test";
import { BTN } from "@pocketjs/framework/input";
import { buildReader } from "../tools/build-reader.ts";
import { cjkSafe } from "../src/style/cjk.ts";
import { bootApp, type Core } from "./harness.ts";

let core: Core;
let buildLog = "";

beforeAll(async () => {
  const log = spyOn(console, "log");
  const built = await buildReader({ outdir: "/tmp/pocketjs-react-test/reader-cjk", cjk: true, books: { "sanguo.epub": "test/fixtures/books/sanguo.epub" }, bundleWhitepaper: false });
  buildLog = log.mock.calls.map((c) => c.join(" ")).join("\n");
  log.mockRestore();
  core = await bootApp(built);
}, 60000);
afterAll(() => core?.dispose());

test("cjkSafe drops font-bold only for text with Han characters", () => {
  expect(cjkSafe("text-sm text-slate-900 font-bold", "三國志演義")).toBe("text-sm text-slate-900");
  expect(cjkSafe("text-sm text-slate-900 font-bold", "Library")).toBe("text-sm text-slate-900 font-bold");
});

test("the build reports the baked set", () => {
  expect(buildLog).toMatch(/cjk: 8836 hanzi \+ \d+ marks/);
});

test("chapter 1 draws with real advances, its lines are the computed lines, its title uses the regular slot", () => {
  expect(core.texts().map((r) => r.text)).toContain("三國志演義");
  core.press(BTN.CIRCLE); // contents
  core.press(BTN.CIRCLE); // chapter 1
  const runs = core.texts();
  const title = runs[0];
  expect(title.text).toBe("第一回：宴桃園豪傑三結義，斬黃巾英雄首立功");
  expect(core.ops.measureText("中", 1)).toBe(14); // the placeholder box is 23
  expect(core.ops.measureText("驕", 1)).toBe(14);
  const computed = (globalThis as { __readerPage?: string[] }).__readerPage!;
  expect(runs.slice(1, -2).map((r) => r.text)).toEqual(computed.map((t) => t || " "));
  expect(computed.filter((t) => [...t].length >= 30).length).toBeGreaterThan(3); // ~32 hanzi per line, not 19 boxes
  // The title's ink ends where the regular slot says it does (a bold slot would draw 23 px boxes).
  let right = 0;
  for (let x = title.x; x < 480; x++) for (let y = title.y; y < title.y + title.h; y++) if (core.pixel(x, y) !== core.pixel(470, 2)) right = x;
  const regular = core.ops.measureText(title.text, 1);
  console.log("title ink right=" + right + " x+measure(slot 1)=" + (title.x + regular) + " measure(slot 8)=" + core.ops.measureText(title.text, 8));
  expect(Math.abs(right - (title.x + regular))).toBeLessThanOrEqual(3);
});
