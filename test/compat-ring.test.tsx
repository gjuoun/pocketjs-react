// C8 focus ring: the vendored shadcn Button and Input carry focus-visible:ring-* tokens the core
// cannot draw. The approximation is the focus border every DOM-mapped focusable already
// gets (Q1=A): focused, the outermost pixel is the focus blue; unfocused, it is the surface.
import { afterEach, expect, test } from "bun:test";
import { BTN, getFocused } from "@pocketjs/framework/input";
import { mount, resetCompatStats } from "../src/index.ts";
import { type NodeMirror, rootMirror } from "../src/internal/pocket.ts";
import { compileClasses } from "../src/internal/pocket-build.ts";
import { measureBox } from "../src/primitives/anchor.ts";
import { installBuildStyles } from "../src/style/build-styles.ts";
import { build } from "../tools/build.ts";
import { Demo } from "./fixtures/shadcn-vendor/app.tsx";
import { bootCore, type Core } from "./harness.ts";

const BLUE = "#2563eb";
const VENDOR = "test/fixtures/shadcn-vendor";
let core: Core | undefined;
afterEach(() => {
  core?.dispose();
  core = undefined;
  resetCompatStats();
  installBuildStyles({}, new Uint8Array(0), []);
});

async function boot(): Promise<Core> {
  const built = await build(VENDOR + "/main.tsx", { outdir: "/tmp/pocketjs-react-test/compat-c8-ring", name: "shadcn-vendor" });
  core = await bootCore({ classes: built.tokens });
  installBuildStyles({}, compileClasses([]).bin, built.tokens);
  mount(<Demo />, { compat: { classMiss: "drop" } });
  core.step(0);
  return core;
}

/** The first mounted node with this DOM tag (the vendored Input is a view tagged "input"). */
function byTag(tag: string): NodeMirror | undefined {
  const walk = (node: NodeMirror): NodeMirror | undefined => {
    if (node.debugName === tag) return node;
    for (const child of node.children as NodeMirror[]) {
      const hit = walk(child);
      if (hit) return hit;
    }
    return undefined;
  };
  return walk(rootMirror as never);
}

/** The text-bearing button labelled `label` (the Button element itself, not its text run). */
function buttonLabelled(label: string): NodeMirror | undefined {
  const walk = (node: NodeMirror): NodeMirror | undefined => {
    if (node.debugName === "button" && (node.children as NodeMirror[]).some((c) => c.text === label)) return node;
    for (const child of node.children as NodeMirror[]) {
      const hit = walk(child);
      if (hit) return hit;
    }
    return undefined;
  };
  return walk(rootMirror as never);
}

/** The vendored Button and Input carry transition-*: the focus colour animates in, so the
 *  pixels are read after the transition settles, not on the first frame. */
const SETTLE = 40;
function focusOn(c: Core, node: NodeMirror): void {
  for (let i = 0; i < 12 && getFocused() !== node; i++) c.press(BTN.DOWN, 2);
  expect(getFocused()).toBe(node);
  for (let i = 0; i < SETTLE; i++) c.step(0);
}

/** The outermost pixel, mid-height: the focus border covers it. */
function edge(c: Core, node: NodeMirror): string {
  const r = measureBox(node)!;
  c.render();
  return c.pixel(r.x, r.y + Math.floor(r.h / 2));
}

test("the vendored shadcn Button draws the focus border for its focus-visible ring", async () => {
  const c = await boot();
  const save = buttonLabelled("Save")!;
  expect(save).toBeDefined();
  const idle = edge(c, save);
  focusOn(c, save);
  expect(edge(c, save)).toBe(BLUE);
  expect(idle).not.toBe(BLUE);
});

test("the vendored shadcn Input draws the focus border when focused", async () => {
  const c = await boot();
  const field = byTag("input")!;
  expect(field).toBeDefined();
  focusOn(c, field);
  expect(edge(c, field)).toBe(BLUE);
});
