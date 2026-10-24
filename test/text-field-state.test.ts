// C4 field state: the pure display/edit logic, no native tree needed. The panel and the
// compat binding (test/text-input.test.tsx) drive these same functions on the real core.
import { describe, expect, test } from "bun:test";
import {
  CARET,
  deleteBefore,
  display,
  insertAt,
  MASK,
  moveTo,
} from "../src/input/text-field.ts";

describe("display", () => {
  test("a closed empty field shows its placeholder, flagged as such", () => {
    expect(display("", 0, false, { placeholder: "Name" })).toEqual({
      lines: ["Name"],
      placeholder: true,
    });
  });

  test("no placeholder and no value draws one space so the line keeps its height", () => {
    expect(display("", 0, false, {})).toEqual({ lines: [" "], placeholder: false });
  });

  test("an open field draws the caret marker at the caret", () => {
    expect(display("ac", 1, true, {}).lines).toEqual(["a" + CARET + "c"]);
    expect(display("abc", 3, true, {}).lines).toEqual(["abc" + CARET]);
  });

  test("the caret never renders outside the value", () => {
    expect(display("abc", 99, true, {}).lines).toEqual(["abc" + CARET]);
    expect(display("abc", -3, true, {}).lines).toEqual([CARET + "abc"]);
  });

  test("a password field masks every character, caret included", () => {
    const shown = display("abc", 2, true, { masked: true });
    expect(shown.lines[0]).toBe(MASK.repeat(2) + CARET + MASK);
    expect(shown.placeholder).toBe(false);
  });

  test("multiline splits on newlines and keeps an empty line as a space", () => {
    expect(display("a\n\nb", 0, false, { multiline: true }).lines).toEqual([
      "a",
      " ",
      "b",
    ]);
  });

  test("multiline puts the caret on its own line", () => {
    expect(display("a\nb", 2, true, { multiline: true }).lines).toEqual([
      "a",
      CARET + "b",
    ]);
  });
});

describe("insertAt", () => {
  test("inserts at the caret and advances it", () => {
    expect(insertAt("ac", 1, "b")).toEqual({ value: "abc", caret: 2 });
  });

  test("appends when the caret is past the end", () => {
    expect(insertAt("ab", 9, "c")).toEqual({ value: "abc", caret: 3 });
  });

  test("refuses an insert that would pass maxLength", () => {
    expect(insertAt("ab", 2, "c", 2)).toBeNull();
    expect(insertAt("ab", 2, "c", 3)).toEqual({ value: "abc", caret: 3 });
  });

  test("a newline is ordinary text for a multiline field", () => {
    expect(insertAt("ab", 1, "\n")).toEqual({ value: "a\nb", caret: 2 });
  });
});

describe("deleteBefore", () => {
  test("removes the character left of the caret", () => {
    expect(deleteBefore("abc", 3)).toEqual({ value: "ab", caret: 2 });
    expect(deleteBefore("abc", 2)).toEqual({ value: "ac", caret: 1 });
  });

  test("does nothing at the start", () => {
    expect(deleteBefore("abc", 0)).toEqual({ value: "abc", caret: 0 });
  });
});

test("moveTo clamps inside the value", () => {
  expect(moveTo("abc", 0, -1)).toBe(0);
  expect(moveTo("abc", 3, 1)).toBe(3);
  expect(moveTo("abc", 1, 1)).toBe(2);
});
