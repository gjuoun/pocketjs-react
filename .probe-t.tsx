import { mount } from "./src/index.ts";
import { BTN, getFocused } from "@pocketjs/framework/input";
import { bootCore } from "./test/harness.ts";
import { resetTextFields } from "./src/input/text-field.ts";
import { layoutRows, oskLayer, homePos, navigate } from "./src/input/osk-layout.ts";
const CLASSES = [
  "w-full h-full flex-col gap-1 p-2 bg-slate-100",
  "h-9 w-full rounded-md bg-slate-800",
  "text-base text-slate-900",
  "text-base text-slate-500",
  "absolute bg-slate-900",
  "absolute rounded-sm items-center justify-center bg-slate-700 focus:bg-blue-600 active:bg-blue-500",
  "absolute rounded-sm items-center justify-center bg-slate-800 focus:bg-blue-600 active:bg-blue-500",
  "text-xs font-bold text-white",
];
const core = await bootCore({ classes: CLASSES });
const seen: string[] = [];
function App() {
  const [value, setValue] = useStateLocal("");
  return <div><input placeholder="Name" value={value} maxLength={4} onChange={(e) => { seen.push(e.target.value); setValue(e.target.value); }} /></div>;
}
import { useState as useStateLocal } from "react";
mount(<App /> as never);
core.step(0);
const rects = layoutRows(oskLayer("lower"), 472);
const labelOf = (n: any): string => {
  for (const row of rects) for (const r of row) {
    // find node by walking overlay children? too slow; just print texts order instead
  }
  return "";
};
const dump = (tag: string) => console.log(tag, JSON.stringify(core.texts().map(r => r.text).filter(t => t.length <= 2 && !["1#"].includes(t))), "seen:", JSON.stringify(seen));
core.press(BTN.DOWN);
core.press(BTN.CIRCLE);
dump("open");
// helper: type d
let pos = homePos(rects);
const stepTo = async (target: any) => {
  while (pos.row < target.row) { pos = navigate(rects, pos, "down"); core.press(BTN.DOWN); }
  while (pos.row > target.row) { pos = navigate(rects, pos, "up"); core.press(BTN.UP); }
  while (pos.col !== target.col) { const next = (pos.col + 1) % rects[pos.row].length; const dir = next === target.col ? "right" : "left"; pos = navigate(rects, pos, dir); core.press(dir === "right" ? BTN.RIGHT : BTN.LEFT); }
  core.press(BTN.CIRCLE);
};
const find = (ch: string) => { for (const row of rects) for (const r of row) if (r.key.ch === ch) return { row: r.row, col: r.col }; throw new Error("x"); };
await stepTo(find("d"));
dump("after d");
await stepTo(find("e"));
dump("after e");
