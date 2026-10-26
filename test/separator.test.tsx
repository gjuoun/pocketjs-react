// Batch A, Separator on the real wasm core. Each separator's line is measured pixel by pixel inside its
// own 200x40 box: the horizontal one is one full-width row of slate-200, the vertical one a single
// full-height column. Nothing else in the box is slate-200.
import { afterEach, expect, test } from "bun:test";
import { mount, resetCompatStats } from "../src/index.ts";
import { type NodeMirror, rootMirror } from "../src/internal/pocket.ts";
import { compileClasses } from "../src/internal/pocket-build.ts";
import { measureBox } from "../src/primitives/anchor.ts";
import { installBuildStyles } from "../src/style/build-styles.ts";
import { build } from "../tools/build.ts";
import { SeparatorScreen } from "./fixtures/shadcn-batch-a/separator.tsx";
import { bootCore, type Core } from "./harness.ts";

const LINE = "#e2e8f0"; // slate-200, the separator's own colour

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
  const built = await build("test/fixtures/shadcn-batch-a/separator.tsx", {
    outdir: "/tmp/pocketjs-react-test/batch-a-separator",
    name: "batch-a-separator",
  });
  core = await bootCore({ classes: built.tokens, fontSlots: built.fontSlots });
  installBuildStyles({}, compileClasses([]).bin, built.tokens);
  unmount = mount(<SeparatorScreen />, { compat: { classMiss: "throw", tokenMap: false } });
  core.step(0);
  core.step(0);
  core.render();
  return core;
}

/**
 * The frame of one separator: the 200x40 box whose only child is a 1px line of the orientation's
 * shape. The separator itself carries no DOM attribute on the native node (compat consumes data-*).
 */
function frameOf(orientation: "horizontal" | "vertical") {
  const walk = (n: NodeMirror): ReturnType<typeof measureBox> => {
    if (n.children.length === 1) {
      const line = measureBox(n.children[0]);
      const thin = orientation === "horizontal" ? line?.h === 1 && line.w === 200 : line?.w === 1 && line.h === 40;
      if (thin) return measureBox(n);
    }
    for (const k of n.children) {
      const found = walk(k);
      if (found) return found;
    }
    return null;
  };
  const box = walk(rootMirror);
  if (!box) throw new Error("no " + orientation + " separator frame");
  return box;
}

test("Separator: horizontal draws one full-width 1px row of slate-200 in its 200x40 box", async () => {
  const c = await boot();
  const box = frameOf("horizontal")!;
  expect({ w: box.w, h: box.h }).toEqual({ w: 200, h: 40 });
  const rows = new Set<number>();
  let lines = 0;
  for (let y = box.y; y < box.y + box.h; y++)
    for (let x = box.x; x < box.x + box.w; x++)
      if (c.pixel(x, y) === LINE) {
        lines++;
        rows.add(y);
      }
  expect(rows.size).toBe(1);
  expect(lines).toBe(200);
});

test("Separator: vertical draws one full-height 1px column of slate-200 in its 200x40 box", async () => {
  const c = await boot();
  const box = frameOf("vertical")!;
  expect({ w: box.w, h: box.h }).toEqual({ w: 200, h: 40 });
  const cols = new Set<number>();
  let lines = 0;
  for (let y = box.y; y < box.y + box.h; y++)
    for (let x = box.x; x < box.x + box.w; x++)
      if (c.pixel(x, y) === LINE) {
        lines++;
        cols.add(x);
      }
  expect(cols.size).toBe(1);
  expect(lines).toBe(40);
});
