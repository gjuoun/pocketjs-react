// C4b key routing (tools/web/text-entry-host.js): which physical keys type into a focused
// field and which keep the pad's button meaning. Pure functions, no DOM.
import { expect, test } from "bun:test";
import { KEYMAP, routeKey } from "../tools/web/text-entry-host.js";

const ev = (code: string, key: string, mods: Partial<{ ctrlKey: boolean; metaKey: boolean; altKey: boolean }> = {}) => ({
  code, key, ctrlKey: false, metaKey: false, altKey: false, repeat: false, ...mods,
});

test("while a field is focused, printable keys type and do not press buttons", () => {
  expect(routeKey(ev("KeyQ", "q"), true)).toEqual({ to: "text", ch: "q" });
  expect(routeKey(ev("KeyR", "R"), true)).toEqual({ to: "text", ch: "R" });
  expect(routeKey(ev("KeyX", "x"), true)).toEqual({ to: "text", ch: "x" });
  expect(routeKey(ev("Space", " "), true)).toEqual({ to: "text", ch: " " });
  expect(routeKey(ev("Digit1", "1"), true)).toEqual({ to: "text", ch: "1" });
  expect(routeKey(ev("KeyE", "é"), true)).toEqual({ to: "text", ch: "é" });
});

test("while a field is focused, Backspace, Enter and Escape are edit keys", () => {
  expect(routeKey(ev("Backspace", "Backspace"), true)).toEqual({ to: "key", key: "Backspace" });
  expect(routeKey(ev("Enter", "Enter"), true)).toEqual({ to: "key", key: "Enter" });
  expect(routeKey(ev("Escape", "Escape"), true)).toEqual({ to: "key", key: "Escape" });
});

test("arrows stay pad buttons in both modes", () => {
  expect(routeKey(ev("ArrowLeft", "ArrowLeft"), true)).toEqual({ to: "button", bit: KEYMAP.ArrowLeft });
  expect(routeKey(ev("ArrowDown", "ArrowDown"), true)).toEqual({ to: "button", bit: KEYMAP.ArrowDown });
});

test("modified printable keys are shortcuts, not text", () => {
  expect(routeKey(ev("KeyC", "c", { ctrlKey: true }), true)).toBeNull();
  expect(routeKey(ev("KeyC", "c", { metaKey: true }), true)).toBeNull();
});

test("no focused field: every key keeps the pad mapping (letters are buttons)", () => {
  expect(routeKey(ev("KeyX", "x"), false)).toEqual({ to: "button", bit: KEYMAP.KeyX });
  expect(routeKey(ev("KeyQ", "q"), false)).toEqual({ to: "button", bit: KEYMAP.KeyQ });
  expect(routeKey(ev("Space", " "), false)).toEqual({ to: "button", bit: KEYMAP.Space });
  expect(routeKey(ev("Enter", "Enter"), false)).toEqual({ to: "button", bit: KEYMAP.Enter });
});

test("no focused field: the whole KEYMAP is unchanged (regression guard)", () => {
  for (const [code, bit] of Object.entries(KEYMAP)) {
    expect(routeKey(ev(code, code), false)).toEqual({ to: "button", bit });
  }
});
