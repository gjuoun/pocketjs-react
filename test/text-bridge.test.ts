// C4c native-keyboard bridge: a hidden textarea on a touch host receives the native keyboard
// (and IME) input; this routes it into the same __pocketText seam as physical keys. Pure logic.
import { expect, test } from "bun:test";
import {
  bridgeBeforeInput,
  bridgeCompositionEnd,
  bridgeCompositionStart,
  createBridgeState,
  createFocusFollower,
} from "../tools/web/text-entry-host.js";

type Ev = { t: string; s?: string; k?: string };
const rig = () => {
  const out: Ev[] = [];
  return { out, st: createBridgeState(), emit: (e: Ev) => out.push(e) };
};
const input = (inputType: string, data: string | null = null, extra: Record<string, unknown> = {}) => ({
  inputType, data, isComposing: false, ...extra,
});

test("a typed letter is sent as text and the native insert is cancelled", () => {
  const { out, st, emit } = rig();
  expect(bridgeBeforeInput(st, input("insertText", "a"), emit)).toBe(true);
  expect(out).toEqual([{ t: "ch", s: "a" }]);
});

test("line break and backspace become edit keys, and the native edit is cancelled", () => {
  const { out, st, emit } = rig();
  expect(bridgeBeforeInput(st, input("insertLineBreak"), emit)).toBe(true);
  expect(bridgeBeforeInput(st, input("deleteContentBackward"), emit)).toBe(true);
  expect(out).toEqual([{ t: "key", k: "Enter" }, { t: "key", k: "Backspace" }]);
});

test("paste sends its text once, read from the data transfer when data is empty", () => {
  const { out, st, emit } = rig();
  const dataTransfer = { getData: (type: string) => (type === "text/plain" ? "hello" : "") };
  expect(bridgeBeforeInput(st, input("insertFromPaste", null, { dataTransfer }), emit)).toBe(true);
  expect(out).toEqual([{ t: "ch", s: "hello" }]);
});

test("IME composition sends nothing until the commit, then the committed text once", () => {
  const { out, st, emit } = rig();
  bridgeCompositionStart(st);
  // while composing the native preedit is allowed to draw in the hidden field
  expect(bridgeBeforeInput(st, input("insertCompositionText", "n"), emit)).toBe(false);
  expect(bridgeBeforeInput(st, input("insertCompositionText", "ni hao"), emit)).toBe(false);
  expect(out).toEqual([]);
  bridgeCompositionEnd(st, "你好", emit);
  expect(out).toEqual([{ t: "ch", s: "你好" }]);
  // the browser may echo the commit as its own beforeinput: it must not type a second time
  expect(bridgeBeforeInput(st, input("insertFromComposition", "你好"), emit)).toBe(true);
  expect(out).toEqual([{ t: "ch", s: "你好" }]);
});

test("events flagged isComposing pass through to the field untouched", () => {
  const { out, st, emit } = rig();
  expect(bridgeBeforeInput(st, input("insertText", "x", { isComposing: true }), emit)).toBe(false);
  expect(out).toEqual([]);
});

test("an empty composition commit sends nothing", () => {
  const { out, st, emit } = rig();
  bridgeCompositionStart(st);
  bridgeCompositionEnd(st, "", emit);
  expect(out).toEqual([]);
});

test("a letter typed after a commit is not mistaken for the commit echo", () => {
  const { out, st, emit } = rig();
  bridgeCompositionStart(st);
  bridgeCompositionEnd(st, "你好", emit);
  expect(bridgeBeforeInput(st, input("insertText", "x"), emit)).toBe(true);
  expect(out).toEqual([{ t: "ch", s: "你好" }, { t: "ch", s: "x" }]);
});
test("a commit echoed as insertText (Safari order) is not typed a second time", () => {
  const { out, st, emit } = rig();
  bridgeCompositionStart(st);
  bridgeCompositionEnd(st, "你好", emit);
  expect(bridgeBeforeInput(st, input("insertText", "你好"), emit)).toBe(true);
  expect(out).toEqual([{ t: "ch", s: "你好" }]);
});

// The native entry follows the guest field by edges: it leaves when the field loses focus, never
// because the guest has not caught up with a fresh tap yet (the iOS one-frame race).
test("the native entry is not blurred in the frame before the guest catches up with a tap", () => {
  const follow = createFocusFollower();
  expect(follow.update(false)).toBe(false); // tap landed on the field; guest flag not set yet
  expect(follow.update(false)).toBe(false); // still not set
  expect(follow.update(true)).toBe(false);  // guest focused the field
  expect(follow.update(false)).toBe(true);  // the field lost focus: leave
  expect(follow.update(false)).toBe(false); // and only once
});
