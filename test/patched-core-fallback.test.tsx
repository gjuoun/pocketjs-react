// C6 anchor measurement, fallback: a host without HostOps.nodeRect (the pinned npm core, or an
// overlay with the op removed after boot) keeps the hit-test binary search. Runs on both roots.
import { afterEach, expect, test } from "bun:test";
import { getOps } from "@pocketjs/framework/host";
import { mount, Text, View } from "../src/index.ts";
import type { NodeMirror } from "../src/internal/pocket.ts";
import { measureBox } from "../src/primitives/anchor.ts";
import { bootCore, type Core } from "./harness.ts";

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

// Same geometry as anchor-measure.test.tsx and anchor-noderect.test.tsx.
function App() {
  return (
    <View className="w-full h-full flex-col bg-slate-900">
      <View
        ref={at("bare")}
        style={{
          position: "absolute",
          left: 40,
          top: 60,
          width: 100,
          height: 30,
        }}
      />
      <View
        ref={at("labelled")}
        style={{
          position: "absolute",
          left: 40,
          top: 100,
          width: 100,
          height: 30,
        }}
      >
        <Text className="text-sm text-white">Trig</Text>
      </View>
      <View
        style={{
          position: "absolute",
          left: 200,
          top: 0,
          width: 60,
          height: 200,
          overflow: "hidden",
        }}
      >
        <View
          ref={at("clipped")}
          style={{
            position: "absolute",
            left: 40,
            top: 10,
            width: 100,
            height: 30,
          }}
        />
      </View>
      <View
        ref={at("offscreen")}
        style={{
          position: "absolute",
          left: 900,
          top: 60,
          width: 100,
          height: 30,
        }}
      />
    </View>
  );
}

async function start(): Promise<void> {
  core = await bootCore({ classes: CLASSES });
  unmount = mount(<App />);
  core.step(0);
  core.step(0);
}

/** Hit-test queries made while `fn` runs. */
function countHitTests(fn: () => void): number {
  const ops = getOps() as unknown as Record<
    string,
    ((x: number, y: number) => number) | undefined
  >;
  const saved = { hitTestBounds: ops.hitTestBounds, hitTest: ops.hitTest };
  let calls = 0;
  if (saved.hitTestBounds)
    ops.hitTestBounds = (x, y) => (calls++, saved.hitTestBounds!(x, y));
  if (saved.hitTest) ops.hitTest = (x, y) => (calls++, saved.hitTest!(x, y));
  try {
    fn();
  } finally {
    ops.hitTestBounds = saved.hitTestBounds;
    ops.hitTest = saved.hitTest;
  }
  return calls;
}

test("with no nodeRect op the search answers the old boxes, clipped part included", async () => {
  await start();
  // The overlay exposes nodeRect; remove it so this host behaves like one that predates the op.
  const ops = getOps() as unknown as { nodeRect?: unknown };
  const nodeRect = ops.nodeRect;
  delete ops.nodeRect;
  try {
    expect(measureBox(need("bare"))).toEqual({ x: 40, y: 60, w: 100, h: 30 });
    expect(measureBox(need("labelled"))).toEqual({
      x: 40,
      y: 100,
      w: 100,
      h: 30,
    });
    expect(measureBox(need("clipped"))).toEqual({
      x: 240,
      y: 10,
      w: 20,
      h: 30,
    });
    expect(measureBox(need("offscreen"))).toBeNull();
    expect(countHitTests(() => measureBox(need("bare")))).toBeGreaterThan(0);
  } finally {
    ops.nodeRect = nodeRect;
  }
});
