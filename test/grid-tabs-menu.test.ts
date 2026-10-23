// Grid, Tabs, Menu and the windowed List on the wasm core. Focus is read from the drawn focus
// color (the blue swatch at the top), never from internal state.
import { beforeAll, expect, test } from "bun:test";
import { BTN } from "@pocketjs/framework/input";
import { type BuildResult, build } from "../tools/build.ts";
import { bootApp, type Core } from "./harness.ts";

let built: BuildResult;
beforeAll(async () => {
  built = await build("test/fixtures/components/main.tsx", {
    outdir: "/tmp/pocketjs-react-test/components",
  });
});

let blue = "";
async function screen(mode: string): Promise<Core> {
  (globalThis as { __mode?: string; __selected?: string[] }).__mode = mode;
  (globalThis as { __selected?: string[] }).__selected = [];
  const core = await bootApp(built);
  core.texts();
  blue = core.pixel(10, 12); // the reference swatch, sampled before any overlay covers it
  return core;
}
const selected = () =>
  (globalThis as { __selected?: string[] }).__selected ?? [];

function focused(core: Core, labels: RegExp): string[] {
  const runs = core.texts();
  return runs
    .filter((r) => labels.test(r.text) && core.pixel(r.x - 3, r.y + 2) === blue)
    .map((r) => r.text);
}

test("Grid: RIGHT twice then DOWN lands on item 6; RIGHT at a row end stays", async () => {
  const core = await screen("grid");
  try {
    core.press(BTN.DOWN); // enter the grid at G1
    expect(focused(core, /^G\d$/)).toEqual(["G1"]);
    core.press(BTN.RIGHT);
    core.press(BTN.RIGHT);
    core.press(BTN.DOWN);
    expect(focused(core, /^G\d$/)).toEqual(["G6"]);
    core.press(BTN.RIGHT); // row end, no wrap
    expect(focused(core, /^G\d$/)).toEqual(["G6"]);
    core.press(BTN.CIRCLE);
    expect(selected()).toEqual(["G6"]);
  } finally {
    core.dispose();
  }
});

test("Tabs: R switches tabs, L returns, and the tab gets its focused item back", async () => {
  const core = await screen("tabs");
  try {
    core.press(BTN.DOWN);
    core.press(BTN.DOWN); // B2
    expect(focused(core, /^[BF]\d$/)).toEqual(["B2"]);
    core.press(BTN.RTRIGGER);
    expect(core.texts().map((r) => r.text)).toContain("F1");
    expect(focused(core, /^[BF]\d$/)).toEqual(["F1"]);
    core.press(BTN.LTRIGGER);
    expect(focused(core, /^[BF]\d$/)).toEqual(["B2"]);
  } finally {
    core.dispose();
  }
});

test("Menu: START opens it with focus trapped, CROSS closes and restores", async () => {
  const core = await screen("menu");
  try {
    core.press(BTN.DOWN);
    expect(focused(core, /^(Page|Contents|Settings)$/)).toEqual(["Page"]);
    core.press(BTN.START);
    expect(focused(core, /^(Page|Contents|Settings)$/)).toEqual(["Contents"]);
    for (let i = 0; i < 3; i++) core.press(BTN.DOWN);
    expect(focused(core, /^(Page|Contents|Settings)$/)).toEqual(["Settings"]);
    core.press(BTN.CROSS);
    expect(core.texts().map((r) => r.text)).not.toContain("Settings");
    expect(focused(core, /^(Page|Contents|Settings)$/)).toEqual(["Page"]);
  } finally {
    core.dispose();
  }
});

test("windowed List: DOWN scrolls a 4-item window through 12 items", async () => {
  const core = await screen("list");
  try {
    const visible = () =>
      core
        .texts()
        .map((r) => r.text)
        .filter((t) => /^L\d+$/.test(t));
    expect(visible()).toEqual(["L1", "L2", "L3", "L4"]);
    core.press(BTN.DOWN);
    for (let i = 0; i < 6; i++) core.press(BTN.DOWN);
    expect(focused(core, /^L\d+$/)).toEqual(["L7"]);
    expect(visible()).toEqual(["L4", "L5", "L6", "L7"]);
    for (let i = 0; i < 9; i++) core.press(BTN.DOWN);
    expect(visible()).toEqual(["L9", "L10", "L11", "L12"]);
    core.press(BTN.CIRCLE);
    expect(selected()).toEqual(["L12"]);
  } finally {
    core.dispose();
  }
});
