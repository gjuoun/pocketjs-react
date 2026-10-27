// Percent lengths (w-1/2, top-1/4, max-w-1/4, min-h-1/2, the screen root's 3/4) resolve against the parent box on the
// real core, and follow the parent when its size changes. The expected boxes are the arithmetic of the fraction of
// the parent (or of the screen, 480 x 272, under the root), rounded to whole pixels as measureBox reports them.
import { afterEach, expect, test } from "bun:test";
import { mount, resetCompatStats } from "../src/index.ts";
import { type NodeMirror, rootMirror } from "../src/internal/pocket.ts";
import { unpack } from "../src/internal/pocket-build.ts";
import { measureBox } from "../src/primitives/anchor.ts";
import { classOf } from "../src/style/class-runtime.ts";
import { installBuildStyles } from "../src/style/build-styles.ts";
import { build } from "../tools/build.ts";
import { control, PercentScreen } from "./fixtures/compat-percent/screen.tsx";
import { bootCore, type Core } from "./harness.ts";

const GREEN = "#22c55e"; // bg-green-500

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
  const built = await build("test/fixtures/compat-percent/screen-main.tsx", {
    outdir: "/tmp/pocketjs-react-test/compat-percent",
    name: "compat-percent",
  });
  const pak = await Bun.file(built.pak).arrayBuffer();
  core = await bootCore({ pak });
  const styles = unpack(new Uint8Array(pak)).find((b) => b.key === "ui:styles")!;
  installBuildStyles({}, styles.data, built.tokens);
  unmount = mount(<PercentScreen />, { compat: { classMiss: "throw" } });
  core.step(0);
  core.step(0);
  core.render();
  return core;
}

/** The node whose class string carries a marker colour (the class is kept verbatim on the node). */
function byMarker(marker: string): NodeMirror {
  const walk = (n: NodeMirror): NodeMirror | undefined => {
    if (classOf(n).split(" ").includes(marker)) return n;
    for (const k of n.children) {
      const f = walk(k);
      if (f) return f;
    }
    return undefined;
  };
  const node = walk(rootMirror);
  if (!node) throw new Error("no node carries " + marker);
  return node;
}

function boxOf(marker: string): { x: number; y: number; w: number; h: number } {
  const b = measureBox(byMarker(marker));
  if (!b) throw new Error("no box for " + marker);
  return { x: b.x, y: b.y, w: b.w, h: b.h };
}

test("percent lengths resolve against the parent box, and follow a change of its size", async () => {
  const c = await boot();
  // The parent is 200 x 100 at the origin.
  expect(boxOf("bg-red-500")).toEqual({ x: 50, y: 50, w: 100, h: 50 }); // top-1/2 left-1/4 w-1/2 h-1/2
  expect(boxOf("bg-blue-500")).toEqual({ x: 150, y: 75, w: 50, h: 25 }); // bottom-0 right-0 w-3/4 (max-w-1/4 = 50) h-1/4
  expect(boxOf("bg-slate-900")).toEqual({ x: 0, y: 50, w: 10, h: 50 }); // min-h-1/2 of the 100 px parent
  // The screen root is the viewport: w-1/4 of 480 and h-full of 272.
  expect(boxOf("bg-white")).toEqual({ x: 360, y: 0, w: 120, h: 272 });
  // translate-x-1/2 and translate-y-1/4 are shares of the node's own 40 x 20 box: drawn 20 px across and 5 px down.
  // The pixels are the same on both channels (a stock hit-test box does not see the translate; the drawing does).
  expect(c.pixel(30, 165)).toBe(GREEN);
  expect(c.pixel(10, 165)).not.toBe(GREEN);
  expect(c.pixel(30, 152)).not.toBe(GREEN);

  // The parent narrows to 120 px; the same fractions re-resolve within 40 frames (a stock core runs its full pass every 16th).
  control.narrow = true;
  for (let i = 0; i < 40; i++) {
    c.step(0);
    c.render();
  }
  expect(boxOf("bg-red-500")).toEqual({ x: 30, y: 50, w: 60, h: 50 });
  expect(boxOf("bg-blue-500")).toEqual({ x: 90, y: 75, w: 30, h: 25 });
  expect(boxOf("bg-slate-900")).toEqual({ x: 0, y: 50, w: 10, h: 50 });
  expect(boxOf("bg-white")).toEqual({ x: 360, y: 0, w: 120, h: 272 });
  expect(c.pixel(30, 165)).toBe(GREEN);
}, 60_000);
