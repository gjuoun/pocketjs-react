// C6 anchor measurement on the wasm core: measureBox recovers a node's border box from the layout
// bounds hit test (op 42), exact to the pixel, through text children and overflow clips.
import { afterEach, expect, test } from "bun:test";
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

async function start(): Promise<Core> {
  core = await bootCore({ classes: CLASSES });
  unmount = mount(<App />);
  core.step(0);
  core.step(0);
  return core;
}

test("a bare positioned View measures to its exact border box", async () => {
  await start();
  expect(measureBox(need("bare"))).toEqual({ x: 40, y: 60, w: 100, h: 30 });
});

test("a View with a text child measures the box, not the text", async () => {
  await start();
  expect(measureBox(need("labelled"))).toEqual({
    x: 40,
    y: 100,
    w: 100,
    h: 30,
  });
});

test("a box clipped by an overflow-hidden parent measures its visible part", async () => {
  await start();
  expect(measureBox(need("clipped"))).toEqual({ x: 240, y: 10, w: 20, h: 30 });
});

test("a node entirely outside the viewport measures null", async () => {
  await start();
  expect(measureBox(need("offscreen"))).toBeNull();
});
