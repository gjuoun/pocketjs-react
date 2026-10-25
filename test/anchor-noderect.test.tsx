// C6 anchor measurement on a core that exposes HostOps.nodeRect (an overlay root, see
// tools/core-overlay.ts): measureBox reads the node's root-space rect in one call. Runs only under
// POCKETJS_CORE_ROOT; the default npm core has no nodeRect and keeps the search (anchor-measure).
import { afterEach, expect, test } from "bun:test";
import { getOps } from "@pocketjs/framework/host";
import { mount, Text, View } from "../src/index.ts";
import type { NodeMirror } from "../src/internal/pocket.ts";
import { measureBox } from "../src/primitives/anchor.ts";
import { bootCore, type Core } from "./harness.ts";

const OVERLAY = Boolean(process.env.POCKETJS_CORE_ROOT);
const CLASSES = ["w-full h-full flex-col bg-slate-900", "text-sm text-white"];
let core: Core | undefined;
let unmount: (() => void) | undefined;
afterEach(() => {
  unmount?.();
  unmount = undefined;
  core?.dispose();
  core = undefined;
});

const refs: Record<string, NodeMirror | null> = {};
const need = (name: string): NodeMirror => {
  const node = refs[name];
  if (!node) throw new Error(`no node ${name}`);
  return node;
};
const at = (name: string) => (node: NodeMirror | null) => {
  refs[name] = node;
};

// The same geometry as anchor-measure.test.tsx: bare, labelled, clipped by an overflow parent, offscreen.
function App() {
  return (
    <View className="w-full h-full flex-col bg-slate-900">
      <View ref={at("bare")} style={{ position: "absolute", left: 40, top: 60, width: 100, height: 30 }} />
      <View ref={at("labelled")} style={{ position: "absolute", left: 40, top: 100, width: 100, height: 30 }}>
        <Text className="text-sm text-white">Trig</Text>
      </View>
      <View style={{ position: "absolute", left: 200, top: 0, width: 60, height: 200, overflow: "hidden" }}>
        <View ref={at("clipped")} style={{ position: "absolute", left: 40, top: 10, width: 100, height: 30 }} />
      </View>
      <View ref={at("offscreen")} style={{ position: "absolute", left: 900, top: 60, width: 100, height: 30 }} />
    </View>
  );
}

async function start(): Promise<Core> {
  core = await bootCore({ classes: CLASSES });
  unmount = mount(<App />);
  core.step(0);
  core.step(0);
  return core;
}

/** Count hit-test queries made while `fn` runs. */
function countHitTests(fn: () => void): number {
  const ops = getOps() as unknown as Record<string, ((x: number, y: number) => number) | undefined>;
  const originals = { hitTestBounds: ops.hitTestBounds, hitTest: ops.hitTest };
  let calls = 0;
  if (originals.hitTestBounds) ops.hitTestBounds = (x, y) => (calls++, originals.hitTestBounds!(x, y));
  if (originals.hitTest) ops.hitTest = (x, y) => (calls++, originals.hitTest!(x, y));
  try {
    fn();
  } finally {
    ops.hitTestBounds = originals.hitTestBounds;
    ops.hitTest = originals.hitTest;
  }
  return calls;
}

test.skipIf(!OVERLAY)("nodeRect is exposed by the overlay core", async () => {
  await start();
  expect(typeof (getOps() as { nodeRect?: unknown }).nodeRect).toBe("function");
});

test.skipIf(!OVERLAY)("measureBox reads the rect without any hit-test search", async () => {
  await start();
  expect(countHitTests(() => measureBox(need("labelled")))).toBe(0);
  expect(countHitTests(() => measureBox(need("bare")))).toBe(0);
});

test.skipIf(!OVERLAY)("measureBox equals the root-space border box from nodeRect", async () => {
  await start();
  expect(measureBox(need("bare"))).toEqual({ x: 40, y: 60, w: 100, h: 30 });
  expect(measureBox(need("labelled"))).toEqual({ x: 40, y: 100, w: 100, h: 30 });
});

test.skipIf(!OVERLAY)("a clipped box measures its untrimmed rect (overflow is not applied), clamped to the viewport", async () => {
  await start();
  expect(measureBox(need("clipped"))).toEqual({ x: 240, y: 10, w: 100, h: 30 });
});

test.skipIf(!OVERLAY)("a node entirely outside the viewport still measures null", async () => {
  await start();
  expect(measureBox(need("offscreen"))).toBeNull();
});
