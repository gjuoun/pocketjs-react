// Batch A acceptance, on the real wasm core under the strict policies (classMiss throw, tokenMap off): the six
// vendored components of the batch, mounted from the codemod output, each drawn and each measured. The
// compatStats() numbers are exact: every drop is named, and nothing is dropped silently.
import { afterEach, expect, test } from "bun:test";
import { BTN, getFocused } from "@pocketjs/framework/input";
import { compatStats, mount, resetCompatStats } from "../src/index.ts";
import { type NodeMirror, NODE_TYPE, rootMirror } from "../src/internal/pocket.ts";
import { unpack } from "../src/internal/pocket-build.ts";
import { measureBox } from "../src/primitives/anchor.ts";
import { installBuildStyles } from "../src/style/build-styles.ts";
import { build } from "../tools/build.ts";
import { BatchA } from "./fixtures/shadcn-batch-a/app.tsx";
import { bootCore, type Core } from "./harness.ts";

const PAGE = "#ffffff";
const INK = "#0f172a"; // slate-900: the button, the progress fill, the aspect box
const LINE = "#e2e8f0"; // slate-200: separators

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
  const built = await build("test/fixtures/shadcn-batch-a/app.tsx", {
    outdir: "/tmp/pocketjs-react-test/batch-a-acceptance",
    name: "batch-a-acceptance",
  });
  const pak = await Bun.file(built.pak).arrayBuffer();
  core = await bootCore({ pak });
  const styles = unpack(new Uint8Array(pak)).find((b) => b.key === "ui:styles")!;
  installBuildStyles({}, styles.data, built.tokens);
  unmount = mount(<BatchA />, { compat: { classMiss: "throw", tokenMap: false } });
  core.step(0);
  core.step(0);
  core.render();
  return core;
}

function find(pick: (n: NodeMirror) => boolean): NodeMirror | undefined {
  const walk = (n: NodeMirror): NodeMirror | undefined => {
    if (pick(n)) return n;
    for (const k of n.children) {
      const f = walk(k);
      if (f) return f;
    }
    return undefined;
  };
  return walk(rootMirror);
}
function all(pick: (n: NodeMirror) => boolean): NodeMirror[] {
  const out: NodeMirror[] = [];
  const walk = (n: NodeMirror) => {
    if (pick(n)) out.push(n);
    for (const k of n.children) walk(k);
  };
  walk(rootMirror);
  return out;
}
const boxOf = (n: NodeMirror) => {
  const box = measureBox(n);
  if (!box) throw new Error("no box");
  return box;
};
/** Count of one colour inside a box. */
function count(c: Core, box: { x: number; y: number; w: number; h: number }, colour: string): number {
  let n = 0;
  for (let y = box.y; y < box.y + box.h; y++)
    for (let x = box.x; x < box.x + box.w; x++) if (c.pixel(x, y) === colour) n++;
  return n;
}

test("batch A: the six components draw the text the consumer wrote, and the lg image replaces its fallback", async () => {
  const c = await boot();
  expect(c.texts().map((r) => r.text)).toEqual(["Go", "Name", "Type here", "S"]);
});

test("batch A: Button asChild draws on its anchor: the anchor is the host node, its surface is slate-900", async () => {
  const c = await boot();
  const anchor = find((n) => n.debugName === "a")!;
  const box = boxOf(anchor);
  expect(c.pixel(box.x + 2, box.y + 2)).toBe(INK);
  expect(find((n) => n.debugName === "button")).toBeUndefined();
});

test("batch A: a tap on the Label focuses the Input its htmlFor names", async () => {
  const c = await boot();
  const label = boxOf(find((n) => n.text === "Name")!.parent!);
  const q = ((globalThis as { __pocketPointer?: unknown[] }).__pocketPointer ??= []);
  const x = label.x + Math.floor(label.w / 2);
  const y = label.y + Math.floor(label.h / 2);
  q.push({ x, y, down: true });
  c.step(0);
  q.push({ x, y, down: false });
  c.step(0);
  c.step(0);
  const input = find((n) => n.debugName === "input");
  if (!input) throw new Error("no input node");
  expect(getFocused()).toBe(input);
});

test("batch A: the horizontal separator is one full-width row of slate-200, the vertical one a full-height column", async () => {
  const c = await boot();
  // The page holds seven children in order: the anchor, the label, the input, the separator, the avatar row,
  // the aspect box and the progress. The vertical separator is the middle child of the avatar row.
  const page = find((n) => n.debugName === "div" && n.children.length === 7)!;
  // A 1px box is not measurable on the stock host (its hit search probes every 4th row), so the
  // horizontal line is found where layout puts it: the one row of the page's width between the input and
  // the avatar row (the input's own borders sit outside that band).
  // The line spans the input's width (the page's content width, 464 px at the 480 px viewport).
  const input = boxOf(page.children[2]);
  const row = boxOf(page.children[4]);
  const rowsWithLine: number[] = [];
  for (let y = input.y + input.h; y < row.y; y++) {
    let n = 0;
    for (let x = input.x; x < input.x + input.w; x++) if (c.pixel(x, y) === LINE) n++;
    if (n === input.w) rowsWithLine.push(y);
  }
  expect(rowsWithLine.length).toBe(1);
  const vertical = boxOf(page.children[4].children[1]);
  expect(vertical.w).toBe(1);
  expect(count(c, vertical, LINE)).toBe(vertical.h);
});

test("batch A: the AspectRatio box is 200 px wide and 50 px tall (4:1), and its pixels are the child's colour", async () => {
  const c = await boot();
  const box = boxOf(find((n) => n.debugName === "aspect")!);
  expect({ w: box.w, h: box.h }).toEqual({ w: 200, h: 50 });
  expect(c.pixel(box.x + 100, box.y + 49)).toBe(INK);
  expect(c.pixel(box.x + 100, box.y + 50)).not.toBe(INK);
});

test("batch A: the 50% Progress fills half of its 200 px track, to the column", async () => {
  const c = await boot();
  // The track is the node holding the indicator and the filler (two children), 200 x 8.
  const track = boxOf(find((n) => n !== rootMirror && n.children.length === 2 && n.children.every((k) => k.children.length === 0) && measureBox(n)?.w === 200 && measureBox(n)?.h === 8)!);
  const fill = count(c, { x: track.x, y: track.y + 4, w: track.w, h: 1 }, INK);
  expect(Math.abs(fill - 100)).toBeLessThanOrEqual(1);
});

test("batch A: the lg avatar's image is drawn in its 40 px box", async () => {
  const c = await boot();
  const img = boxOf(find((n) => n.type === NODE_TYPE.image)!);
  expect({ w: img.w, h: img.h }).toEqual({ w: 40, h: 40 });
  expect(count(c, img, PAGE)).toBeLessThan(img.w * img.h);
});

test("batch A: compatStats has no silent drop: classMiss, tokenMap, unknown props and tags are zero, and every drop is named", async () => {
  await boot();
  const stats = compatStats();
  expect(stats.classMiss).toEqual({ tokens: 0, literals: 0 });
  expect(stats.tokenMap).toEqual({ mapped: 0, dropped: 0 });
  expect(stats.unsupported).toEqual({});
  expect(stats.unknownAttrs).toEqual({});
  expect(stats.unknownTags).toBe(0);
  expect(stats.iconMiss).toBe(0);
  // Consumed: the id by the label map, the orientation and the size by selector tokens (the separators,
  // the avatar root and the button anchor), the placeholder by the field.
  expect(stats.mappedAttrs).toEqual({ id: 1, placeholder: 1, "data-orientation": 2, "data-size": 2 });
  // Dropped and named: the DOM attributes the native nodes do not keep, and the Progress indicator's
  // style (its transform is read for the fill and never given to the core, counted once per indicator).
  expect(stats.droppedAttrs).toEqual({ "data-slot": 2, "data-variant": 1, "data-size": 1, type: 1, style: 1 });
});
