// CSS-named inline styles against the real wasm core, compared with static class swatches.
import { afterAll, beforeAll, expect, test } from "bun:test";
import { BTN } from "@pocketjs/framework/input";
import { build } from "../tools/build.ts";
import { bootApp, bootCore, type Core } from "./harness.ts";
import { mount, View } from "../src/index.ts";

let core: Core;
beforeAll(async () => {
  core = await bootApp(await build("test/fixtures/inline-style/main.tsx", { outdir: "/tmp/pocketjs-react-test/inline-style" }));
});
afterAll(() => core.dispose());

const BOX_X = 8; // p-2 container: every line's box starts at x = 8
const midY = (label: string) => {
  const r = core.texts().find((t) => t.text === label);
  if (!r) throw new Error("not drawn: " + label);
  return r.y + Math.floor(r.h / 2);
};
const color = (label: string) => core.pixel(BOX_X + 2, midY(label));
/** Length of the run of the box's own color, starting at its left edge. */
const runLength = (label: string) => {
  const y = midY(label);
  const c = core.pixel(BOX_X + 1, y);
  let n = 0;
  while (core.pixel(BOX_X + n, y) === c) n++;
  return n;
};

test("width and an rgb() backgroundColor draw a 40 px box in the bg-yellow-500 color", () => {
  expect(color("styled")).toBe(color("yellow"));
  expect(runLength("styled")).toBe(40);
});

test("opacity: 0.5 draws the same blend as the opacity-50 utility", () => {
  expect(color("dimstyle")).toBe(color("dimclass"));
});

test("removing an inline width restores the width from className", () => {
  expect(runLength("removable")).toBe(60);
  core.press(BTN.DOWN);
  core.press(BTN.CIRCLE);
  expect(runLength("removable")).toBe(120);
});

test("an unmapped CSS property is rejected with its name", async () => {
  const raw = await bootCore({ classes: [] });
  try {
    expect(() => mount(<View style={{ fontSize: 12 } as never} />, { styles: {} })).toThrow("style.fontSize is not supported");
  } finally {
    raw.dispose();
    core = await bootApp(await build("test/fixtures/inline-style/main.tsx", { outdir: "/tmp/pocketjs-react-test/inline-style" }));
  }
});
