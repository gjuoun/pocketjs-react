// Batch A, AspectRatio on the real wasm core. The box height is width / ratio once the frame pump has read
// the width. The first visible frame is either the settled height or empty; any other height fails.
import { afterEach, expect, test } from "bun:test";
import { mount, resetCompatStats } from "../src/index.ts";
import { type NodeMirror, rootMirror } from "../src/internal/pocket.ts";
import { compileClasses } from "../src/internal/pocket-build.ts";
import { measureBox } from "../src/primitives/anchor.ts";
import { installBuildStyles } from "../src/style/build-styles.ts";
import { build } from "../tools/build.ts";
import { AspectScreen, resize } from "./fixtures/shadcn-batch-a/aspect-ratio.tsx";
import { bootCore, type Core } from "./harness.ts";

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
  const built = await build("test/fixtures/shadcn-batch-a/aspect-ratio.tsx", {
    outdir: "/tmp/pocketjs-react-test/batch-a-aspect",
    name: "batch-a-aspect",
  });
  core = await bootCore({ classes: built.tokens, fontSlots: built.fontSlots });
  installBuildStyles({}, compileClasses([]).bin, built.tokens);
  unmount = mount(<AspectScreen />, { compat: { classMiss: "throw", tokenMap: false } });
  return core;
}

function boxNamed(name: string): ReturnType<typeof measureBox> {
  const walk = (n: NodeMirror): NodeMirror | undefined => {
    if (n.debugName === name) return n;
    for (const k of n.children) {
      const found = walk(k);
      if (found) return found;
    }
    return undefined;
  };
  const node = walk(rootMirror);
  return node ? measureBox(node) : null;
}

test("AspectRatio: after the width is read, a 2:1 box is width/2 tall", async () => {
  const c = await boot();
  c.step(0);
  for (let i = 0; i < 6; i++) c.step(0);
  const box = boxNamed("ratio-2")!;
  expect({ w: box.w, h: box.h }).toEqual({ w: 200, h: 100 });
});

test("AspectRatio: the pixels fill the 2:1 box exactly: its last row is the child's colour, the row below is the page's", async () => {
  const c = await boot();
  for (let i = 0; i < 6; i++) c.step(0);
  c.render();
  const box = boxNamed("ratio-2")!;
  const mid = box.x + Math.floor(box.w / 2);
  expect(c.pixel(mid, box.y + box.h - 1)).toBe("#0f172a");
  expect(c.pixel(mid, box.y + box.h)).not.toBe("#0f172a");
  expect(c.pixel(mid, box.y)).toBe("#0f172a");
});

test("AspectRatio: a 16:9 box is width * 9/16 tall, to the pixel within one", async () => {
  const c = await boot();
  for (let i = 0; i < 6; i++) c.step(0);
  const box = boxNamed("ratio-16x9")!;
  expect(box.w).toBe(200);
  expect(Math.abs(box.h - (200 * 9) / 16)).toBeLessThanOrEqual(1);
});

// The first visible frame is the settled box: the width is read before the first render (the box
// measures at PROBE px with nothing mounted, so an unmeasured frame would draw nothing, never a wrong size).
test("AspectRatio: the first visible frame already has the settled 2:1 size", async () => {
  await boot();
  core!.step(0);
  core!.render();
  const first = boxNamed("ratio-2")!;
  expect({ w: first.w, h: first.h }).toEqual({ w: 200, h: 100 });
});

test("AspectRatio: a width change on the same instance re-measures within a few frames", async () => {
  const c = await boot();
  for (let i = 0; i < 6; i++) c.step(0);
  expect(boxNamed("ratio-2")!.h).toBe(100);
  // A React state update from outside a frame is scheduled as a microtask: let it run first.
  resize(120);
  await new Promise((done) => setTimeout(done, 0));
  for (let i = 0; i < 10; i++) c.step(0);
  const box = boxNamed("ratio-2")!;
  expect({ w: box.w, h: box.h }).toEqual({ w: 120, h: 60 });
});
