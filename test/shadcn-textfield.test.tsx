// C4 acceptance on the C3 pipeline: the vendored shadcn Input (ui/input.tsx, zero edits) is
// focusable, typable through the d-pad keyboard, and shows its controlled value back.
import { afterEach, expect, test } from "bun:test";
import { BTN } from "@pocketjs/framework/input";
import {
  homePos,
  layoutRows,
  navigate,
  oskLayer,
} from "../src/input/osk-layout.ts";
import { build } from "../tools/build.ts";
import { bootApp, type Core } from "./harness.ts";

const VENDOR = "test/fixtures/shadcn-vendor";
const OUT = "/tmp/pocketjs-react-test/compat-c4";
let core: Core | undefined;
afterEach(() => {
  core?.dispose();
  core = undefined;
});

const boot = async (): Promise<Core> => {
  const built = await build(VENDOR + "/field.tsx", {
    outdir: OUT,
    name: "shadcn-field",
  });
  core = await bootApp(built);
  core.step(0);
  return core;
};
const runs = (c: Core): string[] => c.texts().map((r) => r.text);

/** Type through the d-pad. The panel's focus persists between characters, so the layout
 *  model keeps its position; it resets when the keyboard opens (home key q). */
async function typeKeys(
  c: Core,
  text: string,
  pos = homePos(layoutRows(oskLayer("lower"), 472)),
): Promise<void> {
  const rects = layoutRows(oskLayer("lower"), 472);
  const step = (dir: "up" | "down" | "left" | "right", press: number): void => {
    pos = navigate(rects, pos, dir);
    c.press(press);
  };
  for (const ch of text) {
    let target = { row: -1, col: -1 };
    for (const row of rects)
      for (const r of row)
        if (r.key.ch === ch) target = { row: r.row, col: r.col };
    while (pos.row < target.row) step("down", BTN.DOWN);
    while (pos.row > target.row) step("up", BTN.UP);
    while (pos.col !== target.col) {
      const next = (pos.col + 1) % rects[pos.row].length;
      step(
        next === target.col ? "right" : "left",
        next === target.col ? BTN.RIGHT : BTN.LEFT,
      );
    }
    c.press(BTN.CIRCLE);
  }
}

test("the vendored Input renders its placeholder and is focusable", async () => {
  const c = await boot();
  expect(runs(c)).toEqual(["Name"]);
  c.press(BTN.DOWN);
  c.press(BTN.CIRCLE); // opens the keyboard on the field
  expect(runs(c)).toContain("q");
});

test("typing abc through the d-pad shows the controlled value, placeholder gone", async () => {
  const c = await boot();
  c.press(BTN.DOWN);
  c.press(BTN.CIRCLE);
  await typeKeys(c, "abc");
  expect(runs(c)).toContain("abc|");
  expect(runs(c)).not.toContain("Name");
});

test("the app's own onChange state drives the field: CROSS closes, value stays", async () => {
  const c = await boot();
  c.press(BTN.DOWN);
  c.press(BTN.CIRCLE);
  await typeKeys(c, "ab");
  c.press(BTN.CROSS);
  expect(runs(c)).toContain("ab");
  expect(runs(c).some((t) => t.endsWith("|"))).toBe(false);
});
