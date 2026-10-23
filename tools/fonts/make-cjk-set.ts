// tools/fonts/make-cjk-set.ts [--check] — writes assets/fonts/cjk-set.txt, the CJK characters the
// reader's desktop build (tools/build-reader.ts --cjk) bakes into its body font slots:
//   line 1: GB2312 levels 1+2 (6,763 simplified hanzi) ∪ Big5 level 1 (5,401 traditional hanzi)
//           = 8,836 hanzi, decoded from the two code tables with TextDecoder, in codepoint order;
//   line 2: CJK symbols and punctuation (U+3000-303F without the combining tone marks
//           U+302A-302F, which would widen every atlas cell), full-width forms (U+FF01-FF5E), CJK
//           compatibility and small forms (U+FE30-FE4F, U+FE50-FE6B), and the box-drawing dash
//           and marks Chinese texts use (─ ○ ★).
// With --check it exits 1 when the committed file differs from what the tables give.
import { resolve } from "node:path";

export const CJK_SET_PATH = resolve(
  import.meta.dir,
  "../../assets/fonts/cjk-set.txt",
);

const isHan = (c: string) => /\p{Script=Han}/u.test(c);

function decodeAll(encoding: string, pairs: [number, number][]): string[] {
  const d = new TextDecoder(encoding);
  return pairs
    .map(([hi, lo]) => d.decode(new Uint8Array([hi, lo])))
    .filter(isHan);
}

/** GB2312 levels 1 and 2: rows B0-F7, columns A1-FE (row D7 ends at F9). */
export function gb2312(): string[] {
  const pairs: [number, number][] = [];
  for (let row = 0xb0; row <= 0xf7; row++)
    for (let col = 0xa1; col <= 0xfe; col++)
      if (!(row === 0xd7 && col > 0xf9)) pairs.push([row, col]);
  return decodeAll("gbk", pairs);
}

/** Big5 level 1 (frequently used characters): A440-C67E. */
export function big5Level1(): string[] {
  const pairs: [number, number][] = [];
  const lows = [...Array(63).keys()]
    .map((i) => 0x40 + i)
    .concat([...Array(94).keys()].map((i) => 0xa1 + i));
  for (let hi = 0xa4; hi <= 0xc6; hi++)
    for (const lo of lows)
      if (!(hi === 0xc6 && lo > 0x7e)) pairs.push([hi, lo]);
  return decodeAll("big5", pairs);
}

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) =>
    String.fromCodePoint(from + i),
  );

export function cjkSet(): { hanzi: string[]; marks: string[] } {
  const byCodePoint = (a: string, b: string) =>
    a.codePointAt(0)! - b.codePointAt(0)!;
  const hanzi = [...new Set([...gb2312(), ...big5Level1()])].sort(byCodePoint);
  const marks = [
    ...range(0x3000, 0x3029),
    ...range(0x3030, 0x303f),
    ...range(0xff01, 0xff5e),
    ...range(0xfe30, 0xfe4f),
    ...range(0xfe50, 0xfe6b),
    "─",
    "○",
    "★",
  ];
  return { hanzi, marks };
}

if (import.meta.main) {
  const { hanzi, marks } = cjkSet();
  const text = hanzi.join("") + "\n" + marks.join("") + "\n";
  if (process.argv.includes("--check")) {
    const committed = await Bun.file(CJK_SET_PATH)
      .text()
      .catch(() => "");
    if (committed !== text) {
      console.error(
        "cjk-set.txt is out of date: run bun tools/fonts/make-cjk-set.ts",
      );
      process.exit(1);
    }
    console.log(
      "cjk-set.txt ok: " + hanzi.length + " hanzi + " + marks.length + " marks",
    );
  } else {
    await Bun.write(CJK_SET_PATH, text);
    console.log(
      "cjk-set.txt: " + hanzi.length + " hanzi + " + marks.length + " marks",
    );
  }
}
