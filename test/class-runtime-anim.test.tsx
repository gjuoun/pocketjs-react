// Animation records in the class runtime. A build table that carries timelines (skeleton's animate-pulse,
// spinner's animate-spin) must load: the runtime encodes its records against the timeline table, not an empty
// one (that threw "styles.bin: bad anim id 0" at mount). A runtime literal that needs a timeline appends
// with its ids mapped into the table. And the animation advances on the core, frame by frame.
import { afterEach, expect, test } from "bun:test";
import { mount, resetCompatStats } from "../src/index.ts";
import { compileClasses } from "../src/internal/pocket-build.ts";
import { View } from "../src/elements.ts";
import { installBuildStyles } from "../src/style/build-styles.ts";
import { initClassRuntime, resolveClass } from "../src/style/class-runtime.ts";
import { bootCore, type Core } from "./harness.ts";

const PAGE = "w-full h-full bg-white";
const PULSE = "animate-pulse w-8 h-8 bg-slate-900";
const TOKENS = ["animate-pulse", "w-8", "h-8", "bg-slate-900", "h-4", "w-full", "h-full", "bg-white"];

let core: Core | undefined;
let unmount: (() => void) | undefined;
afterEach(() => {
  unmount?.();
  unmount = undefined;
  core?.dispose();
  core = undefined;
  resetCompatStats();
  initClassRuntime(new Uint8Array(0));
  installBuildStyles({}, new Uint8Array(0), []);
});

const lum = (hex: string): number => {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
};

test("the build table with animation records initialises (was: bad anim id 0)", () => {
  const built = compileClasses([PAGE, PULSE]);
  expect(built.anims.length).toBeGreaterThan(0);
  expect(() => initClassRuntime(built.bin, TOKENS)).not.toThrow();
});

test("a runtime literal that needs a timeline appends, its id past the build's records", () => {
  const built = compileClasses([PAGE, PULSE]);
  initClassRuntime(built.bin, TOKENS);
  // Every token is known, but the literal is new: it compiles at runtime and carries the animation.
  const id = resolveClass("animate-pulse h-4 bg-slate-900");
  expect(id).not.toBeNull();
  expect(id as number).toBeGreaterThanOrEqual(built.records.length);
});

test("the pulse runs on the core: the box is slate-900 at frame 0 and lighter by frame 60", async () => {
  const built = compileClasses([PAGE, PULSE]);
  core = await bootCore({ classes: [PAGE, PULSE] });
  installBuildStyles({}, built.bin, TOKENS);
  unmount = mount(
    <View className={PAGE}>
      <View className={PULSE} />
    </View>,
    { compat: { classMiss: "throw", tokenMap: false } },
  );
  core.step(0);
  core.render();
  const first = core.pixel(12, 12);
  expect(first).toBe("#0f172a");
  for (let i = 0; i < 60; i++) core.step(0);
  core.render();
  const later = core.pixel(12, 12);
  expect(later).not.toBe(first);
  expect(lum(later)).toBeGreaterThan(lum(first));
});
