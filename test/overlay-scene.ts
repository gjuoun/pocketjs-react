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

/** A pointer tap: press, release, then let the frames settle. */
export function tap(c: Core, x: number, y: number, settle = 4): void {
  const g = globalThis as { __pocketPointer?: { x: number; y: number; down: boolean; move?: boolean; leave?: boolean }[] };
  const q = (g.__pocketPointer ??= []);
  q.push({ x, y, down: true });
  c.step(0);
  q.push({ x, y, down: false });
  for (let i = 0; i < settle; i++) c.step(0);
}

/** Hold the pointer down for `frames` frames, then release it. */
export function hold(c: Core, x: number, y: number, frames: number): void {
  const g = globalThis as { __pocketPointer?: { x: number; y: number; down: boolean }[] };
  const q = (g.__pocketPointer ??= []);
  q.push({ x, y, down: true });
  for (let i = 0; i < frames; i++) c.step(0);
  q.push({ x, y, down: false });
  for (let i = 0; i < 4; i++) c.step(0);
}

/** Move the pointer (web hover events). */
export function move(c: Core, x: number, y: number): void {
  const g = globalThis as { __pocketPointer?: { x: number; y: number; down: boolean; move?: boolean }[] };
  (g.__pocketPointer ??= []).push({ x, y, down: false, move: true });
  c.step(0);
}

/** Text rect of the first text run equal to `text`, or throws. */
export function textAt(c: Core, text: string) {
  const run = c.texts().find((r) => r.text === text);
  if (!run) throw new Error("no text run " + JSON.stringify(text));
  return run;
}
