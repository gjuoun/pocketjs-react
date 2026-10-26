// Batch A, Progress on the real wasm core. Each 200px track's fill is counted on its middle row: the
// slate-900 columns are the fill, the slate-300 columns the rest. 0, 50 and 100 come through the vendored
// indicator's transform, 25 through the value prop, null is indeterminate (no fill).
import { afterEach, expect, test } from "bun:test";
import { compatStats, mount, resetCompatStats } from "../src/index.ts";
import { compileClasses } from "../src/internal/pocket-build.ts";
import { measureBox } from "../src/primitives/anchor.ts";
import { installBuildStyles } from "../src/style/build-styles.ts";
import { build } from "../tools/build.ts";
import { ProgressScreen } from "./fixtures/shadcn-batch-a/progress.tsx";
import { bootCore, type Core } from "./harness.ts";
import { rootMirror, type NodeMirror } from "../src/internal/pocket.ts";

const FILL = "#0f172a"; // slate-900
const TRACK = "#cbd5e1"; // slate-300

let core: Core | undefined;
let unmount: (() => void) | undefined;
afterEach(() => {
  unmount?.();
  unmount = undefined;
  core?.dispose();
  core = undefined;
  resetCompatStats();
  installBuildStyles({}, new Uint8Array(0), []);
});

async function boot(): Promise<Core> {
  const built = await build("test/fixtures/shadcn-batch-a/progress.tsx", {
    outdir: "/tmp/pocketjs-react-test/batch-a-progress",
    name: "batch-a-progress",
  });
  core = await bootCore({ classes: built.tokens, fontSlots: built.fontSlots });
  installBuildStyles({}, compileClasses([]).bin, built.tokens);
  unmount = mount(<ProgressScreen />, { compat: { classMiss: "throw", tokenMap: false } });
  core.step(0);
  core.step(0);
  core.render();
  return core;
}

/** The 200x8 track boxes, in tree order (one per Progress.Root). */
function tracks(): { x: number; y: number; w: number; h: number }[] {
  const out: { x: number; y: number; w: number; h: number }[] = [];
  const walk = (n: NodeMirror) => {
    const box = measureBox(n);
    if (box && box.w === 200 && box.h === 8 && !out.some((b) => b.y === box.y)) out.push(box);
    for (const k of n.children) walk(k);
  };
  walk(rootMirror);
  return out;
}

/** Fill columns on a track's middle row: the slate-900 pixels, and the slate-300 ones. */
function columns(c: Core, box: { x: number; y: number; w: number }) {
  const y = box.y + 4;
  let fill = 0;
  let track = 0;
  for (let x = box.x; x < box.x + box.w; x++) {
    const p = c.pixel(x, y);
    if (p === FILL) fill++;
    else if (p === TRACK) track++;
  }
  return { fill, track };
}

test("Progress: value 0 draws no fill, the whole track is slate-300", async () => {
  const c = await boot();
  const t = tracks()[0];
  expect(columns(c, t)).toEqual({ fill: 0, track: 200 });
});

test("Progress: value 50 (the vendored transform) fills half the track, to the column", async () => {
  const c = await boot();
  const t = tracks()[1];
  const { fill, track } = columns(c, t);
  expect(Math.abs(fill - 100)).toBeLessThanOrEqual(1);
  expect(fill + track).toBe(200);
});

test("Progress: value 100 fills the whole track", async () => {
  const c = await boot();
  const t = tracks()[2];
  expect(columns(c, t)).toEqual({ fill: 200, track: 0 });
});

test("Progress: an explicit value prop of 25 fills a quarter of the track", async () => {
  const c = await boot();
  const t = tracks()[3];
  const { fill } = columns(c, t);
  expect(Math.abs(fill - 50)).toBeLessThanOrEqual(1);
});

test("Progress: a null value is indeterminate: no fill is drawn", async () => {
  const c = await boot();
  expect(columns(c, tracks()[4]).fill).toBe(0);
});

test("Progress: the transform never reaches the core, and each indicator's style is counted once", async () => {
  await boot();
  expect(compatStats().droppedAttrs.style).toBe(3);
});
