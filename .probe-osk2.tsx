import { mount } from "./src/index.ts";
import { BTN } from "@pocketjs/framework/input";
import { bootCore } from "./test/harness.ts";
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
mount(<div><input placeholder="Name" /></div> as never);
core.step(0);
const dump = (tag: string) => console.log(tag, JSON.stringify(core.texts().map(r => r.text)));
core.press(BTN.DOWN);
core.press(BTN.CIRCLE);
dump("open");
core.press(BTN.CROSS);
dump("after CROSS");
core.press(BTN.CIRCLE);
dump("reopen");
