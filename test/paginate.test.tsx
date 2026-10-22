// Pagination on the wasm core: what is drawn equals what was computed, positions survive a font
// size change, and the whole whitepaper paginates quickly.
import { afterEach, expect, test } from "bun:test";
import { openEpub } from "../src/books/epub.ts";
import { anchorOf, FONT_SIZES, paginate, type FontSize } from "../src/reader/paginate.ts";
import { PageView } from "../src/reader/PageView.tsx";
import { mount, View } from "../src/index.ts";
import { fontSlotFor } from "../src/internal/pocket-build.ts";
import { bootCore, type Core } from "./harness.ts";

const book = openEpub(new Uint8Array(await Bun.file("assets/books/bitcoin-whitepaper.epub").arrayBuffer()));
const calculations = book.chapter(11);
const WIDTH = 448;
const HEIGHT = 216;
const CLASSES = [
  ...Object.values(FONT_SIZES).flatMap((s) => [s.body, s.heading].flatMap((c) => [c + " text-slate-900", c + " text-amber-900", c + " text-sky-800"])),
  "w-full h-full flex-col p-4 bg-white",
  "flex-col",
];
let core: Core | undefined;
afterEach(() => core?.dispose());

test("the size table names the atlas slots its classes compile to", () => {
  for (const s of Object.values(FONT_SIZES)) {
    const px = { "text-sm": 14, "text-base": 16, "text-lg": 18 }[s.body]!;
    expect([s.slot, s.headingSlot]).toEqual([fontSlotFor(px, false), fontSlotFor(px, true)]);
  }
});

for (const size of ["S", "M", "L"] as FontSize[]) {
  test("size " + size + ": the drawn page is the computed page and fits its height", async () => {
    core = await bootCore({ classes: CLASSES });
    const { pages } = paginate(calculations, { size, width: WIDTH, height: HEIGHT });
    const page = pages[1];
    mount(
      <View className="w-full h-full flex-col p-4 bg-white">
        <PageView lines={page} size={size} width={WIDTH} />
      </View>,
    );
    core.step(0);
    const drawn = core.texts().filter((r) => r.text.trim() !== "");
    expect(drawn.map((r) => r.text)).toEqual(page.filter((l) => l.text !== "").map((l) => l.text));
    expect(Math.max(...drawn.map((r) => r.y + r.h))).toBeLessThanOrEqual(16 + HEIGHT);
    expect(drawn.length).toBeGreaterThan(4);
  });
}

test("a position keeps its text across a font size change", async () => {
  core = await bootCore({ classes: CLASSES });
  const small = paginate(calculations, { size: "S", width: WIDTH, height: HEIGHT });
  const large = paginate(calculations, { size: "L", width: WIDTH, height: HEIGHT });
  const anchor = anchorOf(small.pages[3]);
  const page = large.pages[large.pageOf(anchor)];
  const covers = page.some((l) => l.block === anchor.block && l.offset <= anchor.offset) || anchorOf(page).block === anchor.block;
  expect(covers).toBe(true);
  expect(large.pages.length).toBeGreaterThan(small.pages.length);
});

test("the whole whitepaper paginates in under 10 ms on the wasm core", async () => {
  core = await bootCore({ classes: CLASSES });
  const chapters = book.spine.map((_, i) => book.chapter(i));
  paginate(chapters[0], { size: "S", width: WIDTH, height: HEIGHT }); // warm the wrapper
  const t = performance.now();
  let pages = 0;
  for (const blocks of chapters) pages += paginate(blocks, { size: "S", width: WIDTH, height: HEIGHT }).pages.length;
  const ms = performance.now() - t;
  console.log("whitepaper: " + chapters.length + " chapters, " + pages + " pages at S in " + ms.toFixed(2) + " ms");
  expect(ms).toBeLessThan(10);
});
