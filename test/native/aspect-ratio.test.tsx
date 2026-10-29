import { afterEach, expect, test } from "bun:test";
import { View } from "../../src/index.ts";
import { rootMirror, type NodeMirror } from "../../src/internal/pocket.ts";
import { AspectRatio, heightFor } from "../../src/native/aspect-ratio.tsx";
import { geometryFor, walk, type Rect } from "../../tools/qa/acceptance/geometry.ts";
import { harness, ROOT } from "./support.ts";

const h = harness();
afterEach(() => h.dispose());
const WHITE = "#ffffff";
const INK = "#0f172a";

function nodeNamed(name: string): NodeMirror | undefined {
  let found: NodeMirror | undefined;
  walk(rootMirror, (n) => { if (!found && n.debugName === name) found = n; });
  return found;
}
function rectOf(name: string): Rect {
  const n = nodeNamed(name);
  if (!n) throw new Error("no node " + name);
  const r = geometryFor(h.core).rect(n);
  if (!r) throw new Error("no rect for " + name);
  return r;
}
function frames(n = 8): void { for (let i = 0; i < n; i++) { h.core.step(0); h.core.render(); } }

test("the height is the parent's width divided by the ratio: 200 wide at 16/9 is 113", async () => {
  await h.boot(() => (
    <View className={ROOT}>
      <View style={{ width: 200 }}>
        <AspectRatio ratio={16 / 9}><View className="w-full h-full bg-slate-900" /></AspectRatio>
      </View>
    </View>
  ), ["bg-slate-900"]);
  frames();
  const r = rectOf("aspect-ratio");
  expect(r.w).toBe(200);
  expect(r.h).toBe(113);
  expect(r.h).toBe(heightFor(200, 16 / 9));
});

test("the height follows the parent's width, not the viewport", async () => {
  await h.boot(() => (
    <View className={ROOT}>
      <View style={{ width: 320 }}>
        <AspectRatio ratio={4 / 3}><View className="w-full h-full bg-slate-900" /></AspectRatio>
      </View>
    </View>
  ), ["bg-slate-900"]);
  frames();
  const r = rectOf("aspect-ratio");
  expect(r.w).toBe(320);
  expect(r.h).toBe(240);
});

test("an oversized child is clipped to the box: the pixels stop at its bottom edge", async () => {
  await h.boot(() => (
    <View className={ROOT}>
      <View style={{ width: 200 }}>
        <AspectRatio ratio={1}><View className="w-full h-[400px] bg-slate-900" /></AspectRatio>
      </View>
    </View>
  ), ["bg-slate-900", "h-[400px]"]);
  frames();
  const r = rectOf("aspect-ratio");
  expect(r.h).toBe(200);
  h.core.render();
  expect(h.core.pixel(10, r.y + 100)).toBe(INK);
  expect(h.core.pixel(10, r.y + r.h + 10)).toBe(WHITE);
});

test("a ratio of zero or less is a square", async () => {
  await h.boot(() => (
    <View className={ROOT}>
      <View style={{ width: 180 }}>
        <AspectRatio ratio={0}><View className="w-full h-full bg-slate-900" /></AspectRatio>
      </View>
    </View>
  ), ["bg-slate-900"]);
  frames();
  const r = rectOf("aspect-ratio");
  expect(r.w).toBe(180);
  expect(r.h).toBe(180);
});
