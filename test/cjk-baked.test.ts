// The reader's desktop build (tools/build-reader.ts --cjk) bakes 8,836 hanzi plus CJK punctuation
// into the body slots from the committed Noto Sans SC subset. Played on the wasm core with no
// runtime glyphs (the desktop host has none), Chinese draws with real advances, the drawn lines
// are the computed lines, and Han titles stay out of the bold slots, which carry no CJK.
import { afterAll, beforeAll, expect, spyOn, test } from "bun:test";
import { BTN } from "@pocketjs/framework/input";
import { strToU8, zipSync } from "fflate";
import { openEpub } from "../src/books/epub.ts";
import { cjkSafe } from "../src/style/cjk.ts";
import { buildReader } from "../tools/build-reader.ts";
import { bootApp, type Core } from "./harness.ts";

let core: Core;
let buildLog = "";

/** A one-chapter EPUB whose text has 𠮷 (U+20BB7, CJK Extension B: outside the baked set). */
async function missingGlyphBook(path: string): Promise<string> {
  const chapter =
    '<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>缺字</title></head><body><h2>缺字</h2><p>吉野家的「𠮷」字，上面是土。</p></body></html>';
  const opf =
    '<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">missing</dc:identifier><dc:title>缺字測試</dc:title><dc:language>zh</dc:language></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="c1" href="c1.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="c1"/></spine></package>';
  const nav =
    '<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><body><nav epub:type="toc"><ol><li><a href="c1.xhtml">缺字</a></li></ol></nav></body></html>';
  const container =
    '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>';
  await Bun.write(
    path,
    zipSync({
      mimetype: [strToU8("application/epub+zip"), { level: 0 }],
      "META-INF/container.xml": strToU8(container),
      "OEBPS/content.opf": strToU8(opf),
      "OEBPS/nav.xhtml": strToU8(nav),
      "OEBPS/c1.xhtml": strToU8(chapter),
    }),
  );
  return path;
}

beforeAll(async () => {
  const log = spyOn(console, "log");
  const missing = await missingGlyphBook(
    "/tmp/pocketjs-react-test/missing-glyph.epub",
  );
  // Bundled books list by asset name: sanguo first, then the missing-glyph book.
  const built = await buildReader({
    outdir: "/tmp/pocketjs-react-test/reader-cjk",
    cjk: true,
    books: {
      "sanguo.epub": "test/fixtures/books/sanguo.epub",
      "zz-missing.epub": missing,
    },
    bundleWhitepaper: false,
  });
  buildLog = log.mock.calls.map((c) => c.join(" ")).join("\n");
  log.mockRestore();
  core = await bootApp(built);
}, 60000);
afterAll(() => core?.dispose());

test("cjkSafe drops font-bold only for text with Han characters", () => {
  expect(cjkSafe("text-sm text-slate-900 font-bold", "三國志演義")).toBe(
    "text-sm text-slate-900",
  );
  expect(cjkSafe("text-sm text-slate-900 font-bold", "Library")).toBe(
    "text-sm text-slate-900 font-bold",
  );
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
  expect(runs.slice(1, -2).map((r) => r.text)).toEqual(
    computed.map((t) => t || " "),
  );
  expect(computed.filter((t) => [...t].length >= 30).length).toBeGreaterThan(3); // ~32 hanzi per line, not 19 boxes
  // The title's ink ends where the regular slot says it does (a bold slot would draw 23 px boxes).
  let right = 0;
  for (let x = title.x; x < 480; x++)
    for (let y = title.y; y < title.y + title.h; y++)
      if (core.pixel(x, y) !== core.pixel(470, 2)) right = x;
  const regular = core.ops.measureText(title.text, 1);
  console.log(
    "title ink right=" +
      right +
      " x+measure(slot 1)=" +
      (title.x + regular) +
      " measure(slot 8)=" +
      core.ops.measureText(title.text, 8),
  );
  expect(Math.abs(right - (title.x + regular))).toBeLessThanOrEqual(3);
});

test("the footer counts a chapter's characters outside the baked set: sanguo chapter 1's rare names, 𠮷", async () => {
  // Continues from the previous test, on sanguo chapter 1. The 8,836-hanzi set covers 99.5 % of the
  // novel's characters, not all: count chapter 1's characters outside it independently.
  const set = new Set(
    Array.from(
      await Bun.file("assets/fonts/cjk-set.txt").text(),
      (ch) => ch.codePointAt(0)!,
    ),
  );
  const chapter1 = openEpub(
    new Uint8Array(
      await Bun.file("test/fixtures/books/sanguo.epub").arrayBuffer(),
    ),
  )
    .chapter(0)
    .map((b) => b.text)
    .join("");
  const outside = [
    ...new Set(
      [...chapter1].filter(
        (ch) => /\p{Script=Han}/u.test(ch) && !set.has(ch.codePointAt(0)!),
      ),
    ),
  ];
  console.log(
    "sanguo chapter 1: " +
      outside.length +
      " distinct characters outside the set: " +
      outside.join(""),
  );
  expect(outside.length).toBeGreaterThan(0);
  expect(core.texts().map((r) => r.text)).toContain(
    outside.length + " characters cannot be shown on this host",
  );
  core.press(BTN.CROSS); // contents
  core.press(BTN.CROSS); // library
  core.press(BTN.DOWN);
  core.press(BTN.CIRCLE); // contents of the missing-glyph book
  core.press(BTN.CIRCLE); // its chapter
  const drawn = core.texts().map((r) => r.text);
  expect(drawn[0]).toBe("缺字");
  expect(drawn.some((t) => t.includes("𠮷"))).toBe(true); // drawn, as the core's placeholder box
  expect(drawn).toContain("1 character cannot be shown on this host");
});
