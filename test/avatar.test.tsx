// Batch A, Avatar on the real wasm core, under the pak boot (the strict host: an unknown texture throws
// unless the lookup is guarded). The fallback letters are ink; the root's corners are cut by its radius; the
// registered icon draws; the unknown URL falls back without throwing; the delayed fallback waits its frames.
import { afterEach, expect, test } from "bun:test";
import { compatStats, mount, resetCompatStats } from "../src/index.ts";
import { type NodeMirror, rootMirror } from "../src/internal/pocket.ts";
import { unpack } from "../src/internal/pocket-build.ts";
import { measureBox } from "../src/primitives/anchor.ts";
import { installBuildStyles } from "../src/style/build-styles.ts";
import { build } from "../tools/build.ts";
import { AvatarScreen } from "./fixtures/shadcn-batch-a/avatar.tsx";
import { bootCore, type Core, type TextRun } from "./harness.ts";

const PAGE = "#ffffff";
const FALLBACK = "#f1f5f9"; // slate-100

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
  const built = await build("test/fixtures/shadcn-batch-a/avatar.tsx", {
    outdir: "/tmp/pocketjs-react-test/batch-a-avatar",
    name: "batch-a-avatar",
  });
  const pak = await Bun.file(built.pak).arrayBuffer();
  core = await bootCore({ pak });
  const styles = unpack(new Uint8Array(pak)).find((b) => b.key === "ui:styles")!;
  installBuildStyles({}, styles.data, built.tokens);
  unmount = mount(<AvatarScreen />, { compat: { classMiss: "throw", tokenMap: false } });
  core.step(0);
  core.step(0);
  core.render();
  return core;
}

function walk(pick: (n: NodeMirror) => boolean): NodeMirror {
  const find = (n: NodeMirror): NodeMirror | undefined => {
    if (pick(n)) return n;
    for (const k of n.children) {
      const f = find(k);
      if (f) return f;
    }
    return undefined;
  };
  const node = find(rootMirror);
  if (!node) throw new Error("not found");
  return node;
}
/** The Avatar.Root that holds a fallback's text: text -> fallback view -> root. */
const rootOfText = (text: string): NodeMirror => walk((n) => n.text === text).parent!.parent!;
const runOf = (c: Core, text: string): TextRun => c.texts().find((r) => r.text === text)!;

test("Avatar: the fallback letters draw as ink in the centre of the avatar", async () => {
  const c = await boot();
  const run = runOf(c, "CN");
  const box = measureBox(rootOfText("CN"))!;
  let ink = 0;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let y = run.y; y < run.y + run.h; y++)
    for (let x = run.x; x < run.x + run.w; x++)
      if (c.pixel(x, y) !== FALLBACK) {
        ink++;
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
  expect(ink).toBeGreaterThan(20);
  expect(Math.abs((minX + maxX) / 2 - (box.x + box.w / 2))).toBeLessThanOrEqual(3);
  expect(Math.abs((minY + maxY) / 2 - (box.y + box.h / 2))).toBeLessThanOrEqual(3);
});

test("Avatar: the corner is cut by the radius: the corner pixel is the page, the edge midpoints are the fallback", async () => {
  const c = await boot();
  const box = measureBox(rootOfText("CN"))!;
  expect({ w: box.w, h: box.h }).toEqual({ w: 32, h: 32 });
  expect(c.pixel(box.x, box.y)).toBe(PAGE);
  expect(c.pixel(box.x + box.w - 1, box.y + box.h - 1)).toBe(PAGE);
  expect(c.pixel(box.x + 1, box.y + 16)).toBe(FALLBACK);
  expect(c.pixel(box.x + 16, box.y + 1)).toBe(FALLBACK);
});

test("Avatar: data-size sm and lg make 24px and 40px boxes", async () => {
  await boot();
  const sm = measureBox(rootOfText("S"))!;
  expect({ w: sm.w, h: sm.h }).toEqual({ w: 24, h: 24 });
  const lg = measureBox(walk((n) => n.debugName === "img-lg").parent!)!;
  expect({ w: lg.w, h: lg.h }).toEqual({ w: 40, h: 40 });
});

test("Avatar: a registered icon key draws the image, and its fallback is not drawn", async () => {
  const c = await boot();
  const img = measureBox(walk((n) => n.debugName === "img-lg"))!;
  let drawn = 0;
  for (let y = img.y; y < img.y + img.h; y++)
    for (let x = img.x; x < img.x + img.w; x++) if (c.pixel(x, y) !== PAGE && c.pixel(x, y) !== FALLBACK) drawn++;
  expect(drawn).toBeGreaterThan(0);
  expect(c.texts().map((r) => r.text)).not.toContain("LG");
});

test("Avatar: an unknown URL falls back to its letters and does not throw on the strict host", async () => {
  const c = await boot();
  expect(c.texts().map((r) => r.text)).toContain("XY");
  expect(compatStats().classMiss).toEqual({ tokens: 0, literals: 0 });
});

test("Avatar: a fallback with delayMs waits its frames before it draws (100 ms is 6 frames at 60 Hz)", async () => {
  const c = await boot();
  expect(c.texts().map((r) => r.text)).not.toContain("DL");
  for (let i = 0; i < 8; i++) c.step(0);
  c.render();
  expect(c.texts().map((r) => r.text)).toContain("DL");
});
