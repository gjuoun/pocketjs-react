// <TextField> is the native spelling of <input>: one field, one keyboard, one onChange
// contract. Same typing proof as the DOM path, through the public export.
import { afterEach, expect, test } from "bun:test";
import { BTN } from "@pocketjs/framework/input";
import { useState } from "react";
import { mount, TextField } from "../src/index.ts";
import {
  homePos,
  layoutRows,
  navigate,
  oskLayer,
} from "../src/input/osk-layout.ts";
import { resetTextFields } from "../src/input/text-field.ts";
import { bootCore, type Core } from "./harness.ts";

const CLASSES = [
  "w-full h-full flex-col gap-1 p-2 bg-slate-100",
  "text-base text-slate-900",
  "text-base text-slate-500",
  "absolute bg-slate-900",
  "absolute rounded-sm items-center justify-center bg-slate-700 focus:bg-blue-600 active:bg-blue-500",
  "absolute rounded-sm items-center justify-center bg-slate-800 focus:bg-blue-600 active:bg-blue-500",
  "text-xs font-bold text-white",
];
let core: Core | undefined;
let unmount: (() => void) | undefined;
afterEach(() => {
  unmount?.();
  unmount = undefined;
  core?.dispose();
  core = undefined;
  resetTextFields();
});

async function typeKeys(c: Core, text: string): Promise<void> {
  const rects = layoutRows(oskLayer("lower"), 472);
  let pos = homePos(rects);
  for (const ch of text) {
    let target = { row: -1, col: -1 };
    for (const row of rects)
      for (const r of row)
        if (r.key.ch === ch) target = { row: r.row, col: r.col };
    while (pos.row !== target.row) {
      const dir = pos.row < target.row ? "down" : "up";
      pos = navigate(rects, pos, dir);
      c.press(dir === "down" ? BTN.DOWN : BTN.UP);
    }
    while (pos.col !== target.col) {
      const next = (pos.col + 1) % rects[pos.row].length;
      const dir = next === target.col ? "right" : "left";
      pos = navigate(rects, pos, dir);
      c.press(dir === "right" ? BTN.RIGHT : BTN.LEFT);
    }
    c.press(BTN.CIRCLE);
  }
}

test("<TextField> types through the d-pad and redraws its controlled value", async () => {
  core = await bootCore({ classes: CLASSES });
  const seen: string[] = [];
  function App() {
    const [value, setValue] = useState("");
    return (
      <TextField
        placeholder="Name"
        value={value}
        onChange={(e) => {
          seen.push(e.target.value);
          setValue(e.target.value);
        }}
      />
    );
  }
  unmount = mount(<App />);
  core.step(0);
  core.press(BTN.DOWN);
  core.press(BTN.CIRCLE);
  await typeKeys(core, "ab");
  expect(seen).toEqual(["a", "ab"]);
  expect(core.texts().map((r) => r.text)).toContain("ab|");
});
