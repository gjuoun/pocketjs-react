// C4c round 4: a tap places the caret by the drawn runs and the field font's widths. Pure math.
import { expect, test } from "bun:test";
import { caretAtPoint, caretFromOffsets, parseRuns, sameLines } from "../src/input/text-field.ts";

// A fixed-advance fake font: every character is 10 px wide.
const width = (s: string): number => s.length * 10;

test("a tap passes a character once it is past that character's middle", () => {
  const offsets = [0, 10, 20, 30, 40]; // "abcd"
  expect(caretFromOffsets(offsets, 4)).toBe(0); // left of a's middle
  expect(caretFromOffsets(offsets, 16)).toBe(2); // past b's middle (15), short of c's (25)
  expect(caretFromOffsets(offsets, 26)).toBe(3); // past c's middle, short of d's (35)
  expect(caretFromOffsets(offsets, 500)).toBe(4); // past the end
});

test("a tap on a single line maps through the run's x and the prefix widths", () => {
  const runs = parseRuns("100,20,60,18\tabcdef|");
  expect(runs).toEqual([{ x: 100, y: 20, w: 60, h: 18, text: "abcdef|" }]);
  expect(caretAtPoint(["abcdef"], runs, 132, 25, width)).toBe(3); // past c's middle, short of d's
  expect(caretAtPoint(["abcdef"], runs, 100, 25, width)).toBe(0); // at the field's left edge
});

test("a tap on a later line places the caret in that line, keeping the text before it", () => {
  const runs = parseRuns("100,20,30,18\tab\n100,38,30,18\tcd|");
  const lines = ["ab", "cd"];
  expect(caretAtPoint(lines, runs, 111, 40, width)).toBe(4); // line 1, past c: "ab\n" + 1
  expect(caretAtPoint(lines, runs, 111, 5, width)).toBe(1); // above the text: line 0, past a
  expect(caretAtPoint(lines, runs, 500, 80, width)).toBe(5); // below it: last line, its end
});

test("a read is used only when its runs are the lines the field draws now", () => {
  expect(sameLines(parseRuns("0,0,30,18\tabc|"), ["abc|"])).toBe(true);
  expect(sameLines(parseRuns("0,0,20,18\tab|"), ["abc|"])).toBe(false); // a stale read
});
