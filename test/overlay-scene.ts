// Batch-2 scene harness: boots the wasm core with the classes a scene file uses (the probe's own
// collection: the src tree plus the scene's relative imports), then mounts the scene on the compat layer.
import { join, resolve } from "node:path";
import type { ReactNode } from "react";
import { type CompatOptions, mount } from "../src/index.ts";
import { rewriteLiteral } from "../src/compat/tokens.ts";
import { bodiesOnly } from "../src/compat/selectors.ts";
import { compileClasses, unknownUtilities } from "../src/internal/pocket-build.ts";
import { installBuildStyles } from "../src/style/build-styles.ts";
import { collect } from "../tools/collect.ts";
import { bootCore, type Core } from "./harness.ts";

const ROOT = resolve(import.meta.dir, "..");

let srcLiterals: Promise<string[]> | undefined;
function srcClasses(): Promise<string[]> {
  return (srcLiterals ??= collect(join(ROOT, "src/index.ts"), [join(ROOT, "src")]).then(
    (c) => c.literals,
  ));
}

export interface Booted {
  c: Core;
  dispose(): void;
}

/** Boot a core for `sceneFile` (its own classes plus the src tree) and mount `element` on it. */
export async function bootScene(
  sceneFile: string,
  element: () => ReactNode,
  compat: CompatOptions = { classMiss: "throw", unknownProps: "throw", tokenMap: true },
): Promise<Booted> {
  const own = await collect(sceneFile, []);
  const literals = [...new Set([...(await srcClasses()), ...own.literals])]
    .map(rewriteLiteral)
    .map(bodiesOnly);
  const tokens: string[] = [];
  const seen = new Set<string>();
  for (const lit of literals)
    for (const tok of lit.split(/\s+/))
      if (tok && !seen.has(tok) && unknownUtilities(tok).length === 0) {
        seen.add(tok);
        tokens.push(tok);
      }
  const c = await bootCore({ classes: literals });
  const compiled = compileClasses(literals);
  installBuildStyles(compiled.ids, compiled.bin, tokens);
  const unmount = mount(element() as never, { compat });
  c.step(0);
  c.step(0);
  return {
    c,
    dispose() {
      unmount();
      c.dispose();
      installBuildStyles({}, new Uint8Array(0), []);
    },
  };
}

/** One frame, then a yield to the event loop: React's scheduled work (state, effects) runs between frames,
 * as it does on a device. A synchronous loop of frames would starve it. */
export async function frame(c: Core, buttons = 0): Promise<void> {
  c.step(buttons);
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

export async function frames(c: Core, n: number): Promise<void> {
  for (let i = 0; i < n; i++) await frame(c);
}

/** A d-pad press: the button held for `settle` frames, then released and settled. */
export async function press(c: Core, buttons: number, settle = 1): Promise<void> {
  await frame(c, buttons);
  await frames(c, settle);
  await frame(c, 0);
  await frames(c, settle);
}

function pointer(): { __pocketPointer?: { x: number; y: number; down: boolean; move?: boolean; leave?: boolean }[] } {
  return globalThis as never;
}

/** A pointer tap: press, release, then let the frames settle. */
export async function tap(c: Core, x: number, y: number, settle = 4): Promise<void> {
  const q = (pointer().__pocketPointer ??= []);
  q.push({ x, y, down: true });
  await frame(c);
  q.push({ x, y, down: false });
  await frames(c, settle);
}

/** Hold the pointer down for `frames` frames, then release it. */
export async function hold(c: Core, x: number, y: number, count: number): Promise<void> {
  const q = (pointer().__pocketPointer ??= []);
  q.push({ x, y, down: true });
  await frames(c, count);
  q.push({ x, y, down: false });
  await frames(c, 4);
}

/** Move the pointer (web hover events). */
export async function move(c: Core, x: number, y: number): Promise<void> {
  (pointer().__pocketPointer ??= []).push({ x, y, down: false, move: true });
  await frame(c);
}

/** The pointer leaves the canvas (web hover). */
export async function leave(c: Core): Promise<void> {
  (pointer().__pocketPointer ??= []).push({ x: 0, y: 0, down: false, leave: true });
  await frame(c);
}

/** Text rect of the first text run equal to `text`, or throws. */
export function textAt(c: Core, text: string) {
  const run = c.texts().find((r) => r.text === text);
  if (!run) throw new Error("no text run " + JSON.stringify(text));
  return run;
}
