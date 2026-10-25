// C4c round 3: forward delete and line movement in the field state, pure (no tree, no host).
import { expect, test } from "bun:test";
import { deleteAfterAt, moveLineTo } from "../src/input/text-field.ts";

test("forward delete removes the character at the caret and does nothing at the end", () => {
  expect(deleteAfterAt("abc", 1)).toEqual({ value: "ac", caret: 1 });
  expect(deleteAfterAt("abc", 0)).toEqual({ value: "bc", caret: 0 });
  expect(deleteAfterAt("abc", 3)).toEqual({ value: "abc", caret: 3 });
});

test("up and down move by line and keep the column where the line allows", () => {
  const v = "ab\ncdef\ng";
  expect(moveLineTo(v, 6, -1)).toBe(2); // col 3 on "cdef" -> "ab" is 2 long: its end
  expect(moveLineTo(v, 4, 1)).toBe(9); // col 1 on "cdef" -> "g" is 1 long: its end
  expect(moveLineTo(v, 1, 1)).toBe(4); // col 1 on "ab" -> col 1 on "cdef"
  expect(moveLineTo("ab\ncd", 3, -1)).toBe(0); // column 0 stays column 0
});

test("up on the first line goes to the start, down on the last line goes to the end", () => {
  const v = "ab\ncdef\ng";
  expect(moveLineTo(v, 1, -1)).toBe(0);
  expect(moveLineTo(v, 8, 1)).toBe(9);
});

test("a leading newline is its own empty first line", () => {
  expect(moveLineTo("\nab", 0, 1)).toBe(1);
  expect(moveLineTo("\nab", 1, -1)).toBe(0);
});
