// CJK text rules: whitespace between CJK characters (the CSS segment-break rule) and line-start
// punctuation in pagination, on a real Chinese chapter. Lines are computed with the core's own
// wrapper, so a moved character must still fit the page width.
import { afterEach, expect, test } from "bun:test";
import { xhtmlToBlocks } from "../src/books/blocks.ts";
import { openEpub } from "../src/books/epub.ts";
import { FONT_SIZES, type FontSize, paginate } from "../src/reader/paginate.ts";
import { bootCore, type Core } from "./harness.ts";

const book = openEpub(
  new Uint8Array(
    await Bun.file("test/fixtures/books/sanguo.epub").arrayBuffer(),
  ),
);
const CLASSES = Object.values(FONT_SIZES).flatMap((s) => [s.body, s.heading]);
const WIDTH = 456;
/** Characters that must not start a line. */
export const CLOSING =
  /^[，。、；：？！」』）》〉】…﹐﹑﹒﹔﹕﹖﹗﹚﹜﹞．〕〗]/;
let core: Core | undefined;
afterEach(() => core?.dispose());

test("a line break between two CJK characters is dropped; between Latin words it is a space", () => {
  expect(xhtmlToBlocks("<p>張\r\n飛</p>")).toEqual([
    { kind: "para", text: "張飛" },
  ]);
  expect(xhtmlToBlocks("<p>a\nb</p>")).toEqual([{ kind: "para", text: "a b" }]);
  expect(xhtmlToBlocks("<p>楚\n、漢</p>")).toEqual([
    { kind: "para", text: "楚、漢" },
  ]);
  expect(xhtmlToBlocks("<p>漢 Han\n朝</p>")).toEqual([
    { kind: "para", text: "漢 Han 朝" },
  ]);
});

test("the sanguo chapters carry no whitespace between CJK characters", () => {
  for (let i = 0; i < book.spine.length; i++)
    for (const b of book.chapter(i))
      expect(b.text).not.toMatch(
        /[\p{Script=Han}，。、；：？！「」『』][ \t\r\n]+[\p{Script=Han}，。、；：？！「」『』]/u,
      );
});

for (const size of ["S", "M", "L"] as FontSize[]) {
  test(
    "size " +
      size +
      ": no line of sanguo chapter 1 starts with closing punctuation, and every line fits",
    async () => {
      core = await bootCore({ classes: CLASSES });
      const s = FONT_SIZES[size];
      const { lines } = paginate(book.chapter(0), {
        size,
        width: WIDTH,
        height: 198,
      });
      const text = lines.filter((l) => l.kind !== "blank");
      expect(text.length).toBeGreaterThan(40);
      expect(
        text.filter((l) => CLOSING.test(l.text)).map((l) => l.text.slice(0, 4)),
      ).toEqual([]);
      expect(
        text
          .filter((l) => /[「『（《〈【]$/.test(l.text))
          .map((l) => l.text.slice(-4)),
      ).toEqual([]);
      const tooWide = text.filter(
        (l) =>
          core!.ops.measureText(
            l.text,
            l.kind === "heading" ? s.headingSlot : s.slot,
          ) > WIDTH,
      );
      expect(tooWide.map((l) => l.text)).toEqual([]);
      // Nothing is lost or duplicated: the lines of a block concatenate back to the block.
      const blocks = book.chapter(0);
      blocks.forEach((b, i) =>
        expect(
          lines
            .filter((l) => l.block === i && l.kind !== "blank")
            .map((l) => l.text)
            .join("")
            .replace(/\s/g, ""),
        ).toBe(b.text.replace(/\s/g, "")),
      );
    },
  );
}
