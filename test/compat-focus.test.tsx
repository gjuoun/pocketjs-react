// JG-157 focus indicator: a DOM-mapped focusable draws a default focus border with no explicit
// focus: border style; an author focus: border keeps its own colour. Real wasm core, pixel asserts.
import { afterEach, expect, test } from "bun:test";
import { BTN, getFocused } from "@pocketjs/framework/input";
import { mount } from "../src/index.ts";
import { type NodeMirror, rootMirror } from "../src/internal/pocket.ts";
import { measureBox } from "../src/primitives/anchor.ts";
import { compileClasses } from "../src/internal/pocket-build.ts";
import { installBuildStyles } from "../src/style/build-styles.ts";
import { bootCore, type Core } from "./harness.ts";

const COL = "flex flex-col gap-4 p-4 bg-white";
const PLAIN_DARK = "flex w-[120px] h-[40px] bg-slate-900";
const PLAIN_LIGHT = "flex w-[120px] h-[40px] bg-white";
const AUTHOR_RED = "flex w-[120px] h-[40px] bg-slate-900 focus:border-red-600";
const BLUE = "#2563eb";
const RED = "#dc2626";
const INTERIOR = "#0f172a";

let core: Core | undefined;
afterEach(() => core?.dispose());

const BOOT = [COL, PLAIN_DARK, PLAIN_LIGHT, AUTHOR_RED, "focus:border-blue-600", "focus:border-2", "focus:border-red-600", "text-base text-white"];

async function start(kids: Array<"dark" | "light" | "red">): Promise<{ c: Core; nodes: NodeMirror[] }> {
  core = await bootCore({ classes: BOOT });
  const cls = { dark: PLAIN_DARK, light: PLAIN_LIGHT, red: AUTHOR_RED };
  // The build hands the runtime its token set (what the source scan found); a composed literal
  // compiles from those tokens, as it does in the app.
  installBuildStyles({}, compileClasses([]).bin, BOOT.join(" ").split(/\s+/));
  mount(
    <div className={COL}>
      {kids.map((k, i) => (
        <button key={i} className={cls[k]} />
      ))}
    </div>,
  );
  core.step(0);
  const column = rootMirror.children[0].children[0];
  return { c: core, nodes: [...column.children] as NodeMirror[] };
}

/** Press DOWN until the node has focus (focus starts on nothing; the first DOWN takes the first). */
function focusOn(c: Core, node: NodeMirror): void {
  for (let i = 0; i < 6 && getFocused() !== node; i++) c.press(BTN.DOWN);
  expect(getFocused()).toBe(node);
}

/** The outermost pixel, mid-height: the focus border covers it (1px or 2px wide). */
function edge(c: Core, node: NodeMirror): string {
  const r = measureBox(node)!;
  c.render();
  return c.pixel(r.x, r.y + Math.floor(r.h / 2));
}

function interior(c: Core, node: NodeMirror): string {
  const r = measureBox(node)!;
  c.render();
  return c.pixel(r.x + 30, r.y + Math.floor(r.h / 2));
}

test("compat button shows a default focus border when focused", async () => {
  const { c, nodes } = await start(["dark", "light"]);
  const idle = edge(c, nodes[0]);
  focusOn(c, nodes[0]);
  expect(edge(c, nodes[0])).toBe(BLUE);
  expect(idle).toBe(INTERIOR);
});

test("an unfocused compat button draws no focus border", async () => {
  const { c, nodes } = await start(["dark", "light"]);
  expect(edge(c, nodes[0])).toBe(interior(c, nodes[0]));
  expect(edge(c, nodes[1])).toBe(interior(c, nodes[1]));
});

test("blurring restores the unfocused pixels exactly", async () => {
  const { c, nodes } = await start(["dark", "light"]);
  const idle = edge(c, nodes[0]);
  focusOn(c, nodes[0]);
  focusOn(c, nodes[1]);
  expect(edge(c, nodes[0])).toBe(idle);
});

test("an author focus border colour wins over the default", async () => {
  const { c, nodes } = await start(["red"]);
  focusOn(c, nodes[0]);
  expect(edge(c, nodes[0])).toBe(RED);
});
