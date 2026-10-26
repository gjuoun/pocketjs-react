// Batch A, Slot on the real wasm core. The vendored Button renders its asChild child through the real
// Slot: one host node carries the Button's class and the child's text, the press reaches the child's
// handler and then the Button's, and the Slot draws no node of its own.
import { afterEach, expect, test } from "bun:test";
import { BTN, focusNode } from "@pocketjs/framework/input";
import { mount, resetCompatStats } from "../src/index.ts";
import { type NodeMirror, rootMirror } from "../src/internal/pocket.ts";
import { compileClasses } from "../src/internal/pocket-build.ts";
import { mergeProps, Root } from "../src/primitives/slot.tsx";
import { installBuildStyles } from "../src/style/build-styles.ts";
import { build } from "../tools/build.ts";
import { SlotScreen } from "./fixtures/shadcn-batch-a/slot.tsx";
import { bootCore, type Core } from "./harness.ts";

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

async function boot(onGo?: () => void, onChild?: () => void): Promise<Core> {
  const built = await build("test/fixtures/shadcn-batch-a/slot.tsx", {
    outdir: "/tmp/pocketjs-react-test/batch-a-slot",
    name: "batch-a-slot",
  });
  core = await bootCore({ classes: built.tokens, fontSlots: built.fontSlots });
  installBuildStyles({}, compileClasses([]).bin, built.tokens);
  unmount = mount(<SlotScreen onGo={onGo} onChild={onChild} />, {
    compat: { classMiss: "throw", tokenMap: false },
  });
  core.step(0);
  return core;
}

/** The mirror whose own text is exactly `text`, in tree order. */
function textNode(text: string): NodeMirror {
  const walk = (n: NodeMirror): NodeMirror | undefined => {
    if (n.text === text) return n;
    for (const k of n.children) {
      const f = walk(k);
      if (f) return f;
    }
    return undefined;
  };
  const found = walk(rootMirror);
  if (!found) throw new Error("no text " + text);
  return found;
}

test("Slot: the anchor is the one host node: it holds the text and the Button's surface", async () => {
  const c = await boot();
  const text = textNode("Go");
  const host = text.parent!;
  // The Button's colour is on the anchor itself, not on a wrapper around it.
  const run = c.texts().find((r) => r.text === "Go")!;
  expect(c.pixel(run.x - 2, run.y + 2)).toBe("#0f172a");
  expect(host.debugName).toBe("a");
  // No wrapper: the anchor's parent is the screen, which holds the anchor and the plain Button.
  expect(host.parent!.children).toContain(host);
  expect(host.parent!.children.length).toBe(2);
});

test("Slot: the Button's press and the child's own handler both run, the child's first", async () => {
  const order: string[] = [];
  const c = await boot(
    () => order.push("button"),
    () => order.push("child"),
  );
  focusNode(textNode("Go").parent);
  c.press(BTN.CIRCLE, 4);
  expect(order).toEqual(["child", "button"]);
});

test("Slot: with no element child it draws nothing; with two it refuses", () => {
  expect(Root({ children: undefined })).toBeNull();
  expect(() => Root({ children: [<a key="1" />, <b key="2" />] })).toThrow(
    "exactly one element child",
  );
});

test("Slot: mergeProps joins className slot-first, merges style, chains handlers, lets the child win otherwise", () => {
  const calls: string[] = [];
  const merged = mergeProps(
    { className: "bg-slate-900", style: { width: 8 }, onClick: () => calls.push("slot"), role: "button" },
    { className: "px-2", style: { height: 4 }, onClick: () => calls.push("child"), role: "link" },
  );
  expect(merged.className).toBe("bg-slate-900 px-2");
  expect(merged.style).toEqual({ width: 8, height: 4 });
  expect(merged.role).toBe("link");
  (merged.onClick as () => void)();
  expect(calls).toEqual(["child", "slot"]);
});
