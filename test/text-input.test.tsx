// C4 text input, step by step on the real wasm core: the field surface (structure and
// counters) first, then the keyboard, then the typing loop. Each test mounts its own app so
// the store (one open field) starts empty.

import { afterEach, expect, test } from "bun:test";
import { BTN } from "@pocketjs/framework/input";
import { useState } from "react";
import { compatStats, mount, resetCompatStats } from "../src/index.ts";
import {
  FIELD_PLACEHOLDER_CLASS,
  FIELD_VALUE_CLASS,
  resetTextFields,
} from "../src/input/text-field.ts";
import { rootMirror } from "../src/internal/pocket.ts";
import { bootCore, type Core } from "./harness.ts";

const CLASSES = [
  "w-full h-full flex-col gap-1 p-2 bg-slate-100",
  "h-9 w-full rounded-md bg-slate-800",
  FIELD_VALUE_CLASS,
  FIELD_PLACEHOLDER_CLASS,
  // keyboard panel + keys (Osk.tsx literals)
  "absolute bg-slate-900",
  "absolute rounded-sm items-center justify-center bg-slate-700 focus:bg-blue-600 active:bg-blue-500",
  "absolute rounded-sm items-center justify-center bg-slate-800 focus:bg-blue-600 active:bg-blue-500",
  "text-xs font-bold text-white",
];

let core: Core | undefined;
afterEach(() => {
  unmountApp?.();
  unmountApp = undefined;
  core?.dispose();
  core = undefined;
  resetCompatStats();
  resetTextFields();
});

const boot = async (): Promise<Core> =>
  (core = await bootCore({ classes: CLASSES }));
let unmountApp: (() => void) | undefined;
/** mount() but recorded, so afterEach unmounts React before the core goes away. */
const mountApp = (element: React.ReactNode): void => {
  unmountApp = mount(element);
};
/** The app layer's first element (the app's root view). */
const appRoot = () => rootMirror.children[0].children[0];
/** Keycap runs currently drawn (the keyboard labels its keys; no other text does). */
const CAPS = ["DEL", "ENT", "OK", "HIDE", "1#", "ABC"];
const caps = (c: Core): string[] =>
  c
    .texts()
    .map((r) => r.text)
    .filter((t) => CAPS.includes(t));

/** Type `text` through the d-pad: for each character, move focus from the current key to
 *  the target key's (row, col) in the layout model and press CIRCLE. Uses the same ported
 *  layout math as the panel, so no pixel positions are needed. */
// The panel's focus persists between characters, so the model does too. It resets only on
// open, the same way the panel remounts with its home key.
let kb = { pos: { row: 0, col: 1 } };
function openKeyboard(c: Core): void {
  c.press(BTN.CIRCLE);
  kb = { pos: { row: 0, col: 1 } }; // q, the home key
}
async function type(c: Core, text: string): Promise<void> {
  const { homePos, layoutRows, navigate, oskLayer } = await import(
    "../src/input/osk-layout.ts"
  );
  const rects = layoutRows(oskLayer("lower"), 480 - 2 * 4);
  let pos = kb.pos;
  const find = (ch: string): { row: number; col: number } => {
    for (const row of rects)
      for (const rect of row)
        if (rect.key.ch === ch) return { row: rect.row, col: rect.col };
    throw new Error("no key for " + JSON.stringify(ch));
  };
  const step = (dir: "up" | "down" | "left" | "right"): void => {
    pos = navigate(rects, pos, dir);
    c.press(
      dir === "down"
        ? BTN.DOWN
        : dir === "up"
          ? BTN.UP
          : dir === "left"
            ? BTN.LEFT
            : BTN.RIGHT,
    );
  };
  for (const ch of text) {
    const target = find(ch);
    while (pos.row < target.row) step("down");
    while (pos.row > target.row) step("up");
    while (pos.col !== target.col) {
      const next = (pos.col + 1) % rects[pos.row].length;
      step(next === target.col ? "right" : "left");
    }
    c.press(BTN.CIRCLE);
  }
  kb.pos = pos;
}

test("an <input> mounts as a focusable view with a text child the layer owns", async () => {
  const c = await boot();
  mountApp(
    <div>
      <input placeholder="Name" />
    </div>,
  );
  c.step(0);
  const input = appRoot().children[0];
  expect(input.domTag).toBe("view");
  expect(input.debugName).toBe("input");
  expect(input.focusable).toBe(true);
  expect(input.children.length).toBe(1);
  expect(input.children[0].domTag).toBe("#text");
  expect(input.children[0].text).toBe("Name");
  expect(c.texts().map((r) => r.text)).toEqual(["Name"]);
});

test("a controlled value draws instead of the placeholder", async () => {
  const c = await boot();
  const seen: string[] = [];
  mountApp(
    <div>
      <input
        placeholder="Name"
        value="Ada"
        onChange={(e) => seen.push(e.target.value)}
      />
    </div>,
  );
  c.step(0);
  expect(appRoot().children[0].children[0].text).toBe("Ada");
  expect(c.texts().map((r) => r.text)).toEqual(["Ada"]);
  expect(seen).toEqual([]);
});

test("the field surface is counted as mapped, not dropped", async () => {
  const c = await boot();
  mountApp(
    <div>
      <input placeholder="Name" value="Ada" maxLength={8} onChange={() => {}} />
    </div>,
  );
  c.step(0);
  const stats = compatStats();
  expect(stats.mappedAttrs).toEqual({
    placeholder: 1,
    value: 1,
    maxLength: 1,
    onChange: 1,
  });
  expect(stats.droppedAttrs).toEqual({});
});

test("CIRCLE opens the keyboard: keycaps draw on the overlay and focus is trapped", async () => {
  const c = await boot();
  mountApp(
    <div>
      <input placeholder="Name" />
    </div>,
  );
  c.step(0);
  c.press(BTN.DOWN); // focus the field (its only focusable)
  c.press(BTN.CIRCLE); // open its keyboard
  const drawn = caps(c);
  expect([...drawn].sort()).toEqual([...CAPS].sort());
  expect(c.texts().map((r) => r.text)).toContain("q"); // the home key is focused on q
  // d-pad cannot leave the panel: DOWN past the last row clamps, the field keeps no focus.
  for (let i = 0; i < 6; i++) c.press(BTN.DOWN);
  expect([...caps(c)].sort()).toEqual([...CAPS].sort());
});

test("CROSS closes the keyboard and focus returns to the field", async () => {
  const c = await boot();
  mountApp(
    <div>
      <input placeholder="Name" />
    </div>,
  );
  c.step(0);
  c.press(BTN.DOWN);
  c.press(BTN.CIRCLE);
  expect(caps(c).length).toBeGreaterThan(0);
  c.press(BTN.CROSS);
  expect(caps(c)).toEqual([]);
  expect(c.texts().map((r) => r.text)).toContain("Name");
  // the field is focused again (the caret row): pressing CIRCLE reopens the keyboard
  c.press(BTN.CIRCLE);
  expect(caps(c).length).toBeGreaterThan(0);
});

test("typing abc drives onChange in order and the controlled value redraws", async () => {
  const c = await boot();
  const seen: string[] = [];
  function App() {
    const [value, setValue] = useState("");
    return (
      <div>
        <input
          placeholder="Name"
          value={value}
          onChange={(e) => {
            seen.push(e.target.value);
            setValue(e.target.value);
          }}
        />
      </div>
    );
  }
  mountApp(<App />);
  c.step(0);
  c.press(BTN.DOWN);
  openKeyboard(c);
  await type(c, "abc");
  expect(seen).toEqual(["a", "ab", "abc"]);
  const texts = c.texts().map((r) => r.text);
  expect(texts).toContain("abc|");
  expect(texts).not.toContain("Name");
});

test("SQUARE deletes, START commits and closes, maxLength truncates", async () => {
  const c = await boot();
  const seen: string[] = [];
  function App() {
    const [value, setValue] = useState("");
    return (
      <div>
        <input
          placeholder="Name"
          value={value}
          maxLength={4}
          onChange={(e) => {
            seen.push(e.target.value);
            setValue(e.target.value);
          }}
        />
      </div>
    );
  }
  mountApp(<App />);
  c.step(0);
  c.press(BTN.DOWN);
  openKeyboard(c);
  await type(c, "abc");
  c.press(BTN.SQUARE); // delete one character
  expect(seen[seen.length - 1]).toBe("ab");
  expect(c.texts().map((r) => r.text)).toContain("ab|");
  c.press(BTN.START); // commit and close
  expect(caps(c)).toEqual([]);
  expect(c.texts().map((r) => r.text)).toContain("ab");
  // reopen: maxLength=4 admits one more character, then refuses the fifth
  openKeyboard(c);
  await type(c, "d");
  expect(seen[seen.length - 1]).toBe("abd");
  await type(c, "e");
  expect(seen[seen.length - 1]).toBe("abde");
  await type(c, "f"); // the 5th character: insertAt refuses, nothing is reported
  expect(seen[seen.length - 1]).toBe("abde");
  expect(c.texts().map((r) => r.text)).toContain("abde|");
});

test("the rest of the DOM input surface drops and counts instead of throwing", async () => {
  const c = await boot();
  mountApp(
    <div>
      <textarea
        placeholder="Note"
        rows={4}
        autoComplete="off"
        spellCheck={false}
        readOnly
      />
    </div>,
  );
  c.step(0);
  expect(appRoot().children[0].focusable).toBe(true);
  expect(compatStats().droppedAttrs).toEqual({
    rows: 1,
    autoComplete: 1,
    spellCheck: 1,
    readOnly: 1,
  });
  expect(compatStats().mappedAttrs).toEqual({ placeholder: 1 });
});
