// Batch A, Label on the real wasm core: the label draws its text, a tap on the text focuses the control
// its htmlFor names, and a tap on empty space focuses nothing. The control's id is counted as consumed.
import { afterEach, expect, test } from "bun:test";
import { getFocused } from "@pocketjs/framework/input";
import { mount, compatStats, resetCompatStats } from "../src/index.ts";
import { type NodeMirror, rootMirror } from "../src/internal/pocket.ts";
import { compileClasses } from "../src/internal/pocket-build.ts";
import { measureBox } from "../src/primitives/anchor.ts";
import { installBuildStyles } from "../src/style/build-styles.ts";
import { build } from "../tools/build.ts";
import { LabelScreen } from "./fixtures/shadcn-batch-a/label.tsx";
import { bootCore, type Core, type TextRun } from "./harness.ts";

let core: Core | undefined;
let unmount: (() => void) | undefined;
afterEach(() => {
  unmount?.();
  unmount = undefined;
  core?.dispose();
  core = undefined;
  resetCompatStats();
  installBuildStyles({}, new Uint8Array(0), []);
  delete (globalThis as { __pocketPointer?: unknown }).__pocketPointer;
});

async function boot(): Promise<Core> {
  const built = await build("test/fixtures/shadcn-batch-a/label.tsx", {
    outdir: "/tmp/pocketjs-react-test/batch-a-label",
    name: "batch-a-label",
  });
  core = await bootCore({ classes: built.tokens, fontSlots: built.fontSlots });
  installBuildStyles({}, compileClasses([]).bin, built.tokens);
  unmount = mount(<LabelScreen />, { compat: { classMiss: "throw", tokenMap: false } });
  core.step(0);
  core.texts();
  return core;
}

function walk(node: NodeMirror, pick: (n: NodeMirror) => boolean): NodeMirror | undefined {
  if (pick(node)) return node;
  for (const k of node.children) {
    const found = walk(k, pick);
    if (found) return found;
  }
  return undefined;
}
const textHost = (text: string): NodeMirror =>
  walk(rootMirror, (n) => n.text === text)!.parent!;
const inputNode = (): NodeMirror => walk(rootMirror, (n) => n.debugName === "input")!;

/** A tap at (x, y): press down, release, and settle a few frames, as a mouse click does. */
function tap(c: Core, x: number, y: number): void {
  const q = ((globalThis as { __pocketPointer?: unknown[] }).__pocketPointer ??= []);
  q.push({ x, y, down: true });
  c.step(0);
  q.push({ x, y, down: false });
  c.step(0);
  c.step(0);
}
const centre = (node: NodeMirror) => {
  const box = measureBox(node)!;
  return { x: box.x + Math.floor(box.w / 2), y: box.y + Math.floor(box.h / 2) };
};

test("Label: the label draws its text in ink, not in the page colour", async () => {
  const c = await boot();
  const run: TextRun = c.texts().find((r) => r.text === "Name")!;
  let ink = 0;
  for (let y = run.y; y < run.y + run.h; y++)
    for (let x = run.x; x < run.x + run.w; x++) if (c.pixel(x, y) !== c.pixel(run.x - 3, run.y - 3)) ink++;
  expect(ink).toBeGreaterThan(20);
});

test("Label: a tap on the label text focuses the input its htmlFor names", async () => {
  const c = await boot();
  expect(getFocused()).toBeNull();
  const at = centre(textHost("Name"));
  tap(c, at.x, at.y);
  expect(getFocused()).toBe(inputNode());
});

test("Label: a tap on empty space focuses nothing", async () => {
  const c = await boot();
  tap(c, 470, 260);
  expect(getFocused()).toBeNull();
});

test("Label: the input's id is consumed by the label map and counted as a mapped attribute", async () => {
  await boot();
  expect(compatStats().mappedAttrs.id).toBe(1);
  expect(compatStats().droppedAttrs.id).toBeUndefined();
});
