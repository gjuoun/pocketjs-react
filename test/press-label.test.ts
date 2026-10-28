// Pressable's text label: it takes its surface's colour (inherited), and only a dark base fill with no text colour of its own
// gets white. The compat primitive decides this per className; these cases pin the rule.
import { expect, test } from "bun:test";
import { labelClass } from "../src/primitives/press.tsx";

test("a label on a light surface sets no colour, so it takes the surface's colour (dark text on white)", () => {
  expect(labelClass("flex-row items-center bg-transparent")).toBe("text-sm");
  expect(labelClass("flex h-9 bg-white data-[state=on]:bg-slate-900")).toBe("text-sm");
});

test("a label on a dark base fill is white, since nothing above it sets a colour", () => {
  expect(labelClass("flex w-[120px] h-[40px] bg-slate-900 px-2")).toBe("text-sm text-white");
  expect(labelClass("flex bg-blue-600 px-2")).toBe("text-sm text-white");
});

test("a label whose surface sets its own text colour inherits it (no override)", () => {
  expect(labelClass("flex bg-slate-900 text-slate-900")).toBe("text-sm");
  expect(labelClass("flex bg-slate-900 text-[13px] text-white")).toBe("text-sm");
});

test("a state variant's fill is not the base fill", () => {
  expect(labelClass("flex focus:bg-blue-600 active:bg-slate-800")).toBe("text-sm");
});
