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

test("while a field has focus, the caret keys edit it; with no field they stay pad buttons", () => {
  expect(routeKey(ev("ArrowLeft", "ArrowLeft"), true)).toEqual({ to: "key", key: "Left" });
  expect(routeKey(ev("ArrowRight", "ArrowRight"), true)).toEqual({ to: "key", key: "Right" });
  expect(routeKey(ev("ArrowUp", "ArrowUp"), true, true)).toEqual({ to: "key", key: "Up" });
  expect(routeKey(ev("ArrowDown", "ArrowDown"), true, true)).toEqual({ to: "key", key: "Down" });
  // a single-line field has no lines: up and down keep moving focus
  expect(routeKey(ev("ArrowUp", "ArrowUp"), true, false)).toEqual({ to: "button", bit: 0x10 });
  expect(routeKey(ev("ArrowLeft", "ArrowLeft"), false)).toEqual({ to: "button", bit: 0x80 });
  expect(routeKey(ev("ArrowDown", "ArrowDown"), false, true)).toEqual({ to: "button", bit: 0x40 });
});

test("forward delete is an edit key while a field has focus", () => {
  expect(routeKey(ev("Delete", "Delete"), true)).toEqual({ to: "key", key: "Delete" });
  expect(routeKey(ev("Delete", "Delete"), false)).toBeNull();
});
test("modified printable keys are shortcuts, not text", () => {
  expect(routeKey(ev("KeyC", "c", { ctrlKey: true }), true)).toBeNull();
  expect(routeKey(ev("KeyC", "c", { metaKey: true }), true)).toBeNull();
});

// The pad mapping as the reader shipped it before C4b, pinned as literals so the guard cannot
// drift with the module it guards (a mutated KEYMAP must turn these red).
const LEGACY: Record<string, number> = {
  ArrowUp: 0x10, ArrowRight: 0x20, ArrowDown: 0x40, ArrowLeft: 0x80, KeyX: 0x4000, Enter: 0x2000, KeyZ: 0x2000,
  KeyA: 0x8000, KeyS: 0x1000, ShiftLeft: 0x1, ShiftRight: 0x1, Space: 0x8, KeyL: 0x100, KeyR: 0x200, KeyQ: 0x100, KeyE: 0x200,
};

test("no focused field: every key keeps the pad mapping (letters are buttons)", () => {
  expect(routeKey(ev("KeyX", "x"), false)).toEqual({ to: "button", bit: 0x4000 });
  expect(routeKey(ev("KeyQ", "q"), false)).toEqual({ to: "button", bit: 0x100 });
  expect(routeKey(ev("Space", " "), false)).toEqual({ to: "button", bit: 0x8 });
  expect(routeKey(ev("Enter", "Enter"), false)).toEqual({ to: "button", bit: 0x2000 });
});

test("no focused field: the whole pad table is unchanged (regression guard)", () => {
  expect(Object.keys(KEYMAP).sort()).toEqual(Object.keys(LEGACY).sort());
  for (const [code, bit] of Object.entries(LEGACY)) {
    expect(routeKey(ev(code, code), false)).toEqual({ to: "button", bit });
  }
});
