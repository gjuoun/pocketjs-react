// --asset embeds bytes the guest reads back; --glyphs bakes codepoints that only runtime text uses.
import { expect, test } from "bun:test";
import { build } from "../tools/build.ts";
import { bootApp } from "./harness.ts";

const OUT = "/tmp/pocketjs-react-test/build-assets";
const EPUB = "assets/books/bitcoin-whitepaper.epub";
const SYMBOLS = ["W", "\u2211", "\u2264", "\u221e", "\u00e9", "\u2014"];

async function widths(glyphs: string[]) {
  const built = await build("test/fixtures/assets/main.tsx", { outdir: OUT, name: glyphs.length ? "with" : "without", assets: { "book.epub": EPUB }, glyphs });
  const core = await bootApp(built);
  try {
    const runs = core.texts();
    const bytes = (globalThis as { __asset?: Uint8Array }).__asset!;
    const bg = core.pixel(2, 2);
    /** Lit pixels inside a run's rect: 0 means nothing was drawn for it. */
    const ink = (s: string) => {
      const r = runs.find((run) => run.text === s);
      if (!r) return -1;
      let n = 0;
      for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (core.pixel(x, y) !== bg) n++;
      return n;
    };
    return { bytes, w: Object.fromEntries(SYMBOLS.map((s) => [s, runs.find((r) => r.text === s)?.w ?? -1])), ink: Object.fromEntries(SYMBOLS.map((s) => [s, ink(s)])) };
  } finally {
    core.dispose();
  }
}

test("a bundled asset reads back byte-identical in the guest", async () => {
  const { bytes } = await widths([]);
  const file = new Uint8Array(await Bun.file(EPUB).arrayBuffer());
  expect(bytes.length).toBe(file.length);
  expect(Bun.hash(bytes)).toBe(Bun.hash(file));
});

test("--glyphs draws book symbols that otherwise fall back to one placeholder box", async () => {
  const without = await widths([]);
  const withGlyphs = await widths(["test/glyphs.txt"]);
  console.log("without glyphs: widths " + JSON.stringify(without.w) + " ink " + JSON.stringify(without.ink));
  console.log("with glyphs:    widths " + JSON.stringify(withGlyphs.w) + " ink " + JSON.stringify(withGlyphs.ink));
  const missing = SYMBOLS.slice(1, 5); // the dash happens to share the placeholder's ink count, so compare these four
  // Without the glyph file, every missing symbol draws the same placeholder box.
  expect(new Set(missing.map((s) => without.w[s] + "/" + without.ink[s])).size).toBe(1);
  // With it, each draws its own glyph: distinct advances and ink, and ASCII is unchanged.
  expect(new Set(missing.map((s) => withGlyphs.w[s])).size).toBe(4);
  for (const s of missing) expect(withGlyphs.ink[s]).not.toBe(without.ink[s]);
  expect(withGlyphs.ink.W).toBe(without.ink.W);
});
