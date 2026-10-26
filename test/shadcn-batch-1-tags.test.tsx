// Batch 1 tags on the real wasm core, from the build (pak boot, so the chevron is its baked icon). Each of the
// four tags the batch needed has a pixel assertion: a key cap's border and padding (kbd), the rules of a table
// (header and body), a caption above the rows (caption), and the select's arrow at its right edge (native-select).
import { afterEach, expect, test } from "bun:test";
import { compatStats, mount, resetCompatStats } from "../src/index.ts";
import { type NodeMirror, NODE_TYPE, rootMirror } from "../src/internal/pocket.ts";
import { unpack } from "../src/internal/pocket-build.ts";
import { measureBox } from "../src/primitives/anchor.ts";
import { installBuildStyles } from "../src/style/build-styles.ts";
import { build } from "../tools/build.ts";
import { TagsScreen } from "./fixtures/shadcn-batch-1/tags.tsx";
import { bootCore, type Core, type TextRun } from "./harness.ts";

const SLATE_200 = "#e2e8f0"; // the table's rules (border-slate-200)
const SLATE_300 = "#cbd5e1"; // the key cap's border (border-slate-300)

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
  const built = await build("test/fixtures/shadcn-batch-1/tags-main.tsx", {
    outdir: "/tmp/pocketjs-react-test/batch-1-tags",
    name: "batch-1-tags",
  });
  const pak = await Bun.file(built.pak).arrayBuffer();
  core = await bootCore({ pak });
  const styles = unpack(new Uint8Array(pak)).find((b) => b.key === "ui:styles")!;
  installBuildStyles({}, styles.data, built.tokens);
  // Strict classMiss, the default token map: the glyph primitive's own "size-4" is mapped to w-4 h-4 (C2),
  // as in every compat mount, so nothing is dropped.
  unmount = mount(<TagsScreen />, { compat: { classMiss: "throw" } });
  core.step(0);
  core.step(0);
  core.render();
  return core;
}

function find(pick: (n: NodeMirror) => boolean): NodeMirror {
  const walk = (n: NodeMirror): NodeMirror | undefined => {
    if (pick(n)) return n;
    for (const k of n.children) {
      const f = walk(k);
      if (f) return f;
    }
    return undefined;
  };
  const node = walk(rootMirror);
  if (!node) throw new Error("not found");
  return node;
}
/** The text node that holds exactly `text` (a raw run, or a text host). */
const textNode = (text: string): NodeMirror => find((n) => n.text === text);
/** The view a raw run sits in: run -> its holder text -> the view. */
const viewOf = (text: string): NodeMirror => {
  let n = textNode(text);
  while (n.parent && n.parent.type !== NODE_TYPE.view) n = n.parent;
  return n.parent!;
};
const runOf = (c: Core, text: string): TextRun => c.texts().find((r) => r.text === text)!;
const boxOf = (n: NodeMirror) => {
  const box = measureBox(n);
  if (!box) throw new Error("no box");
  return box;
};

test("strict: the screen mounts with no dropped class, attribute or tag", async () => {
  await boot();
  const stats = compatStats();
  expect(stats.classMiss).toEqual({ tokens: 0, literals: 0 });
  expect(stats.unknownAttrs).toEqual({});
  expect(stats.unknownTags).toBe(0);
  expect(stats.iconMiss).toBe(0);
});

test("kbd: a key cap draws its border, and its key sits inside the border and the padding", async () => {
  const c = await boot();
  const cap = boxOf(viewOf("K"));
  const run = runOf(c, "K");
  expect(c.pixel(cap.x, cap.y + Math.floor(cap.h / 2))).toBe(SLATE_300);
  expect(c.pixel(cap.x + 2, cap.y + 2)).not.toBe(SLATE_300);
  // border (1px) plus px-1 (4px) on each side: the key starts at least 5px in, and ends 5px short of the edge.
  expect(run.x - cap.x).toBeGreaterThanOrEqual(5);
  expect(cap.x + cap.w - (run.x + run.w)).toBeGreaterThanOrEqual(5);
});

test("table: the header row is ruled below, and the body row is ruled above and below", async () => {
  const c = await boot();
  const head = boxOf(viewOf("Name"));
  const body = boxOf(viewOf("Apple"));
  const x = (b: { x: number; w: number }) => b.x + Math.floor(b.w / 2);
  // The header's bottom rule and the body's top rule are the same boundary: both sides are drawn.
  expect(c.pixel(x(head), head.y + head.h - 1)).toBe(SLATE_200);
  expect(c.pixel(x(body), body.y)).toBe(SLATE_200);
  expect(c.pixel(x(body), body.y + body.h - 1)).toBe(SLATE_200);
  expect(body.y).toBeGreaterThanOrEqual(head.y + head.h);
});

test("caption: its text draws above the rows, in ink", async () => {
  const c = await boot();
  const cap = runOf(c, "Recent");
  const head = boxOf(viewOf("Name"));
  expect(cap.y + cap.h).toBeLessThanOrEqual(head.y);
  const bg = c.pixel(cap.x - 3, cap.y - 3);
  let ink = 0;
  for (let y = cap.y; y < cap.y + cap.h; y++)
    for (let x = cap.x; x < cap.x + cap.w; x++) if (c.pixel(x, y) !== bg) ink++;
  expect(ink).toBeGreaterThan(20);
});

test("native-select: its arrow is drawn at the right edge, inside the wrapper, and the selected option shows", async () => {
  const c = await boot();
  // The chosen option is 'Beta' (defaultValue b): the closed select shows it, and not 'Alpha'.
  expect(c.texts().map((r) => r.text)).toContain("Beta");
  expect(c.texts().map((r) => r.text)).not.toContain("Alpha");
  // The option is a text host inside the select; the select and the chevron are siblings in the wrapper.
  // run 'Beta' -> its option (a text host) -> the select -> the wrapper that also holds the chevron.
  const optionNode = textNode("Beta").parent!;
  const select = boxOf(optionNode.parent!);
  const wrapper = optionNode.parent!.parent!;
  const images: NodeMirror[] = [];
  const collect = (n: NodeMirror) => {
    if (n.type === NODE_TYPE.image) images.push(n);
    for (const k of n.children) collect(k);
  };
  collect(wrapper);
  expect(images.length).toBe(1);
  const arrow = boxOf(images[0]);
  expect(arrow.w).toBe(16);
  // right-3.5 (14px) from the select's edge: the arrow sits inside the select's right end.
  expect(select.x + select.w - (arrow.x + arrow.w)).toBeLessThanOrEqual(20);
  expect(arrow.x + arrow.w).toBeLessThanOrEqual(select.x + select.w);
  let ink = 0;
  const bg = c.pixel(select.x + 2, select.y + 2);
  for (let y = arrow.y; y < arrow.y + arrow.h; y++)
    for (let x = arrow.x; x < arrow.x + arrow.w; x++) if (c.pixel(x, y) !== bg) ink++;
  expect(ink).toBeGreaterThan(10);
});

function isInside(node: NodeMirror, box: { x: number; y: number; w: number; h: number }): boolean {
  const b = measureBox(node);
  return b !== null && b.x >= box.x && b.y >= box.y && b.x + b.w <= box.x + box.w && b.y + b.h <= box.y + box.h;
}
