// Focus ring: the default focus indicator of a DOM-mapped focusable is a 2px ring drawn just
// outside its box (an absolute overlay node), so focusing never moves the box or its text. Real wasm
// core. Runs on the overlay core (nodeRect) and on the default core (binary-search fallback): the same
// pixel assertions hold on both.
import { afterEach, beforeEach, expect, test } from "bun:test";
import { getOps } from "@pocketjs/framework/host";
import { BTN, getFocused } from "@pocketjs/framework/input";
import { useState } from "react";
import { Text, View } from "../src/elements.ts";
import { mount, resetCompatStats } from "../src/index.ts";
import { type NodeMirror, rootMirror } from "../src/internal/pocket.ts";
import { compileClasses } from "../src/internal/pocket-build.ts";
import { measureBox } from "../src/primitives/anchor.ts";
import { Pressable } from "../src/primitives/press.tsx";
import { installBuildStyles } from "../src/style/build-styles.ts";
import { bootCore, type Core } from "./harness.ts";

const OVERLAY = Boolean(process.env.POCKETJS_CORE_ROOT);
const BLUE = "#2563eb";
const LIGHT = "#f1f5f9"; // bg-slate-100: the surface every ring is drawn over
const ROOT = "w-full h-full bg-slate-100";
const BASE = "flex w-[120px] h-[40px] bg-slate-900 px-2";
// The class a compat button carries after the default focus is appended (the combined literal).
const BASE_FOCUS = BASE + " focus:border-blue-600 focus:border-2";
const TXT = "text-sm text-white";
const ROW = "flex w-[120px] h-[40px] bg-slate-900 px-2";
const LIT = "absolute inset-0 active:bg-blue-600";
const SUPPRESS = "absolute inset-0 active:bg-slate-800";
const VARIANT: Record<"plain" | "ring3" | "ring2" | "offset", string> = {
  plain: "",
  ring3: "focus-visible:ring-[3px] focus-visible:ring-ring/50",
  ring2: "ring-2 focus-visible:ring-ring",
  offset: "ring-2 ring-offset-2 focus-visible:ring-ring",
};
const AUTO = "flex bg-slate-900 px-2";
const AUTO_FOCUS = AUTO + " focus:border-blue-600 focus:border-2";
const CLIP = "flex flex-col";
const CLIP_BTN = "ml-4 flex w-[120px] h-[40px] bg-slate-900 px-2";
const BOOT = [ROOT, BASE, BASE_FOCUS, AUTO, AUTO_FOCUS, TXT, ROW, LIT, SUPPRESS, CLIP, CLIP_BTN, "focus:border-blue-600", "focus:border-2"];

let core: Core | undefined;
let unmount: (() => void) | undefined;
const gate = globalThis as { __pocketHover?: boolean; __pocketPointer?: unknown[] };

beforeEach(() => installBuildStyles({}, compileClasses([]).bin, BOOT.join(" ").split(/\s+/)));
afterEach(() => {
  unmount?.();
  unmount = undefined;
  resetCompatStats();
  core?.dispose();
  core = undefined;
  delete gate.__pocketHover;
  installBuildStyles({}, new Uint8Array(0), []);
});

/** A ref callback that stores the mounted node (compat elements hand back their NodeMirror). */
function at(set: (n: NodeMirror) => void): never {
  return ((n: unknown) => {
    if (n) set(n as NodeMirror);
  }) as never;
}

interface Scene {
  c: Core;
  a: NodeMirror;
  b: NodeMirror;
}

/** Two compat buttons at fixed spots: `a` carries the variant under test, `b` is the plain neighbour. */
async function start(variant: keyof typeof VARIANT = "plain"): Promise<Scene> {
  core = await bootCore({ classes: BOOT });
  const refs: { a?: NodeMirror; b?: NodeMirror } = {};
  unmount = mount(
    <View className={ROOT}>
      <button ref={at((n) => { refs.a = n; })} className={(BASE + " " + VARIANT[variant]).trim()} style={{ position: "absolute", left: 40, top: 60 } as never}>
        <Text className={TXT}>Go</Text>
      </button>
      <button ref={at((n) => { refs.b = n; })} className={BASE} style={{ position: "absolute", left: 40, top: 120 } as never}>
        <Text className={TXT}>Next</Text>
      </button>
    </View>,
  );
  core.step(0);
  core.step(0);
  return { c: core, a: refs.a!, b: refs.b! };
}

/** Press DOWN until `node` has focus, then let the ring settle. */
function focusOn(c: Core, node: NodeMirror): void {
  for (let i = 0; i < 12 && getFocused() !== node; i++) c.press(BTN.DOWN, 2);
  expect(getFocused()).toBe(node);
  c.step(0);
  c.step(0);
}

/** A pixel of the frame just drawn. */
function px(c: Core, x: number, y: number): string {
  c.render();
  return c.pixel(x, y);
}

/** The n pixels left of a box, mid-height: x-1 .. x-n. */
function leftBand(c: Core, box: { x: number; y: number; h: number }, n: number): string[] {
  const y = box.y + Math.floor(box.h / 2);
  return Array.from({ length: n }, (_, i) => px(c, box.x - 1 - i, y));
}

test("focusing a compat button never moves its box or its text", async () => {
  const { c, a } = await start();
  const before = measureBox(a)!;
  const textBefore = c.texts().find((r) => r.text === "Go")!;
  focusOn(c, a);
  expect(measureBox(a)).toEqual(before);
  const textAfter = c.texts().find((r) => r.text === "Go")!;
  expect({ x: textAfter.x, y: textAfter.y }).toEqual({ x: textBefore.x, y: textBefore.y });
});

test("the interior of a focused button is pixel-identical to its idle interior", async () => {
  const { c, a } = await start();
  const box = measureBox(a)!;
  const grid = () => {
    const out: string[] = [];
    for (let y = box.y + 3; y < box.y + box.h - 3; y += 3)
      for (let x = box.x + 3; x < box.x + box.w - 3; x += 3) out.push(px(c, x, y));
    return out.join(",");
  };
  const idle = grid();
  focusOn(c, a);
  expect(grid()).toBe(idle);
});

test("a focused button draws a 2px blue ring just outside its box, on every side", async () => {
  const { c, a } = await start();
  const box = measureBox(a)!;
  expect(leftBand(c, box, 2)).toEqual([LIGHT, LIGHT]);
  focusOn(c, a);
  const after = measureBox(a)!;
  expect(after).toEqual(box);
  expect(leftBand(c, after, 2)).toEqual([BLUE, BLUE]);
  const midY = after.y + Math.floor(after.h / 2);
  const midX = after.x + Math.floor(after.w / 2);
  expect([px(c, after.x + after.w, midY), px(c, after.x + after.w + 1, midY)]).toEqual([BLUE, BLUE]);
  expect([px(c, midX, after.y - 1), px(c, midX, after.y - 2)]).toEqual([BLUE, BLUE]);
  expect([px(c, midX, after.y + after.h), px(c, midX, after.y + after.h + 1)]).toEqual([BLUE, BLUE]);
});

test("an auto-sized button (no fixed width) keeps its box when focused: the border would grow it", async () => {
  core = await bootCore({ classes: BOOT });
  const c = core;
  const refs: { a?: NodeMirror } = {};
  unmount = mount(
    <View className={ROOT}>
      <button ref={at((n) => { refs.a = n; })} className={AUTO} style={{ position: "absolute", left: 40, top: 60 } as never}>
        <Text className={TXT}>Save changes</Text>
      </button>
    </View>,
  );
  c.step(0);
  c.step(0);
  const a = refs.a!;
  const before = measureBox(a)!;
  focusOn(c, a);
  expect(measureBox(a)).toEqual(before);
  expect(leftBand(c, before, 2)).toEqual([BLUE, BLUE]);
});

test("a ring at the edge of an overflow-hidden box is clipped where CSS clips it", async () => {
  core = await bootCore({ classes: BOOT });
  const c = core;
  const refs: { a?: NodeMirror } = {};
  unmount = mount(
    <View className={ROOT}>
      <View className={CLIP} style={{ position: "absolute", left: 20, top: 100, width: 200, height: 100, overflow: "hidden" } as never}>
        <button ref={at((n) => { refs.a = n; })} className={CLIP_BTN}>
          <Text className={TXT}>Clip</Text>
        </button>
      </View>
    </View>,
  );
  c.step(0);
  c.step(0);
  const a = refs.a!;
  focusOn(c, a);
  const box = measureBox(a)!;
  // The box sits on the clip's top line: the band above it lies outside the clip, so it is cut.
  const top = [px(c, box.x + 20, box.y - 1), px(c, box.x + 20, box.y - 2)];
  expect(top).toEqual([LIGHT, LIGHT]);
  // The band to the left is inside the clip (its left edge is 20px left of the box): it is drawn.
  expect(leftBand(c, box, 2)).toEqual([BLUE, BLUE]);
});

test("the ring census: a focused control paints exactly 4(w+h)+16 blue pixels around its box, none idle", async () => {
  const { c, a } = await start();
  const box = measureBox(a)!;
  const blue = (): number => {
    c.render();
    let n = 0;
    for (let y = box.y - 4; y < box.y + box.h + 4; y++)
      for (let x = box.x - 4; x < box.x + box.w + 4; x++) if (c.pixel(x, y) === BLUE) n++;
    return n;
  };
  expect(blue()).toBe(0);
  focusOn(c, a);
  expect(blue()).toBe(4 * (box.w + box.h) + 16);
});

test("focus-visible:ring-[3px] draws a 3px band", async () => {
  const { c, a } = await start("ring3");
  focusOn(c, a);
  expect(leftBand(c, measureBox(a)!, 4)).toEqual([BLUE, BLUE, BLUE, LIGHT]);
});

test("a bare ring-2 draws a 2px band", async () => {
  const { c, a } = await start("ring2");
  focusOn(c, a);
  expect(leftBand(c, measureBox(a)!, 3)).toEqual([BLUE, BLUE, LIGHT]);
});

test("ring-offset-2 is dropped: the band is the ring width, not the offset", async () => {
  const { c, a } = await start("offset");
  focusOn(c, a);
  expect(leftBand(c, measureBox(a)!, 3)).toEqual([BLUE, BLUE, LIGHT]);
});

test("blurring removes the ring, and the ring moves to the next focused button", async () => {
  const { c, a, b } = await start();
  focusOn(c, a);
  const boxA = measureBox(a)!;
  focusOn(c, b);
  expect(leftBand(c, boxA, 2)).toEqual([LIGHT, LIGHT]);
  expect(leftBand(c, measureBox(b)!, 2)).toEqual([BLUE, BLUE]);
});

test("an unmounted focused target leaves no ring node behind", async () => {
  const before = rootMirror.children.length;
  const { c, a } = await start();
  focusOn(c, a);
  unmount!();
  unmount = undefined;
  c.step(0);
  expect(rootMirror.children.length).toBe(before);
});

test("hover claims the highlight: the ring yields to a lit row, and returns when the pointer leaves", async () => {
  gate.__pocketHover = true;
  core = await bootCore({ classes: BOOT });
  const c = core;
  const refs: { a?: NodeMirror; row?: NodeMirror } = {};
  unmount = mount(
    <View className={ROOT}>
      <button ref={at((n) => { refs.a = n; })} className={BASE} style={{ position: "absolute", left: 40, top: 60 } as never}>
        <Text className={TXT}>Go</Text>
      </button>
      <View style={{ position: "absolute", left: 40, top: 140 } as never}>
        <Pressable hoverable onPress={() => {}} nodeRef={at((n) => { refs.row = n; })} className={ROW}>
          Row
        </Pressable>
      </View>
    </View>,
  );
  c.step(0);
  c.step(0);
  const a = refs.a!;
  const row = refs.row!;
  focusOn(c, a);
  const box = measureBox(a)!;
  expect(leftBand(c, box, 2)).toEqual([BLUE, BLUE]);
  const rb = measureBox(row)!;
  const pointer = (x: number, y: number, move: boolean) => {
    (gate.__pocketPointer ??= []).push(move ? { x, y, move: true } : { leave: true });
    c.step(0);
    c.step(0);
  };
  const hx = rb.x + rb.w - 4;
  const hy = rb.y + Math.floor(rb.h / 2);
  pointer(hx, hy, true);
  expect(px(c, hx, hy)).toBe(BLUE);
  expect(leftBand(c, box, 2)).toEqual([LIGHT, LIGHT]);
  pointer(0, 0, false);
  expect(leftBand(c, box, 2)).toEqual([BLUE, BLUE]);
});

test(OVERLAY ? "overlay core: the ring is measured with nodeRect, not the hit-test search" : "default core: the ring falls back to the hit-test search", async () => {
  const { c, a } = await start();
  const ops = getOps() as unknown as Record<string, ((x: number, y: number) => number) | undefined>;
  const original = ops.hitTestBounds;
  let hits = 0;
  if (original) ops.hitTestBounds = (x, y) => (hits++, original(x, y));
  try {
    focusOn(c, a);
  } finally {
    ops.hitTestBounds = original;
  }
  if (OVERLAY) expect(hits).toBe(0);
  else expect(hits).toBeGreaterThan(0);
});

test("hidden target: display none removes the ring", async () => {
  core = await bootCore({ classes: BOOT });
  const c = core;
  let setHidden: (v: boolean) => void = () => {};
  const refs: { a?: NodeMirror } = {};
  function App() {
    const [hidden, set] = useState(false);
    setHidden = set;
    return (
      <View className={ROOT}>
        <button ref={at((n) => { refs.a = n; })} className={BASE} style={{ position: "absolute", left: 40, top: 60, ...(hidden ? { display: "none" } : {}) } as never}>
          <Text className={TXT}>Go</Text>
        </button>
      </View>
    );
  }
  unmount = mount(<App />);
  c.step(0);
  c.step(0);
  const a = refs.a!;
  focusOn(c, a);
  const box = measureBox(a)!;
  expect(leftBand(c, box, 2)).toEqual([BLUE, BLUE]);
  setHidden(true);
  // The state update commits on the scheduler's next tick, then a frame draws the hidden target.
  await new Promise((resolve) => setTimeout(resolve, 0));
  c.step(0);
  c.step(0);
  expect(measureBox(a)).toBeNull();
  expect(leftBand(c, box, 2)).toEqual([LIGHT, LIGHT]);
});
