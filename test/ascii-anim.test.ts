// The ascii-anim example on the real wasm core: a 40x18 plasma that moves, pauses on CROSS
// and restarts on CROSS again.
import { beforeAll, expect, test } from "bun:test";
import { BTN } from "@pocketjs/framework/input";
import { type BuildResult, build } from "../tools/build.ts";
import { bootApp, type Core } from "./harness.ts";

const COLS = 40;
const ROWS = 18;
let built: BuildResult;
beforeAll(async () => {
  built = await build("examples/ascii-anim/main.tsx", {
    outdir: "/tmp/pocketjs-react-test/ascii-anim",
  });
});

const ROW = new RegExp("^[ .:\\-=+*#%@]{" + COLS + "}$");
const grid = (core: Core) =>
  core
    .texts()
    .filter((r) => ROW.test(r.text))
    .map((r) => r.text);
const header = (core: Core) =>
  core
    .texts()
    .find(
      (r) => r.text.startsWith("PLASMA") || r.text.startsWith("== PAUSED =="),
    )?.text ?? "";
const frames = (core: Core) =>
  Number(/FRAME (\d+)/.exec(header(core))?.[1] ?? -1);

test("the plasma is a 40x18 grid of characters and changes from one frame to the next", async () => {
  const core = await bootApp(built);
  try {
    const first = grid(core);
    expect(first.length).toBe(ROWS);
    for (const row of first) expect(row.length).toBe(COLS);
    const f0 = frames(core);
    expect(f0).toBeGreaterThanOrEqual(0);
    for (let i = 0; i < 10; i++) core.step(0);
    const later = grid(core);
    expect(later).not.toEqual(first);
    expect(frames(core)).toBeGreaterThan(f0);
  } finally {
    core.dispose();
  }
});

test("CROSS pauses: the header says PAUSED and the field freezes", async () => {
  const core = await bootApp(built);
  try {
    for (let i = 0; i < 5; i++) core.step(0);
    core.press(BTN.CROSS);
    expect(header(core)).toContain("PAUSED");
    const frozen = grid(core);
    const pausedFrame = frames(core);
    for (let i = 0; i < 10; i++) core.step(0);
    expect(grid(core)).toEqual(frozen);
    expect(frames(core)).toBe(pausedFrame);
  } finally {
    core.dispose();
  }
});

test("CROSS again restarts a moving field from frame 0", async () => {
  const core = await bootApp(built);
  try {
    core.press(BTN.CROSS);
    expect(header(core)).toContain("PAUSED");
    core.press(BTN.CROSS);
    expect(header(core)).toContain("PLASMA");
    const restart = grid(core);
    expect(frames(core)).toBeLessThan(10); // restarted: the settle frames of the press, not ~25 from before
    for (let i = 0; i < 10; i++) core.step(0);
    expect(grid(core)).not.toEqual(restart);
  } finally {
    core.dispose();
  }
});
