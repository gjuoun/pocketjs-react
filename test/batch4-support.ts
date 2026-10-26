// Shared mount helper for the batch-4 tests: boots the core with the class table of the whole library plus the
// given files, mounts one tree in compat strict mode, and hands back the laid-out nodes.
import { readdirSync } from "node:fs";
import type { ReactNode } from "react";
import { mount } from "../src/index.ts";
import { type NodeMirror, rootMirror } from "../src/internal/pocket.ts";
import {
  compileClasses,
  unknownUtilities,
} from "../src/internal/pocket-build.ts";
import { bodiesOnly } from "../src/compat/selectors.ts";
import { rewriteLiteral } from "../src/compat/tokens.ts";
import { installBuildStyles } from "../src/style/build-styles.ts";
import { measureBox } from "../src/primitives/anchor.ts";
import { collect } from "../tools/collect.ts";
import { bootCore, type Core } from "./harness.ts";

const SRC = new URL("../src", import.meta.url).pathname;

/** Every literal the library and the given files carry, rewritten the way the build sees them. */
export async function classLiterals(files: string[] = []): Promise<string[]> {
  const lits = (await collect(SRC + "/index.ts", [SRC])).literals;
  for (const f of files) lits.push(...(await collect(f, [])).literals);
  return [...new Set(lits)].map(rewriteLiteral).map(bodiesOnly);
}

export interface Mounted {
  core: Core;
  root: NodeMirror;
  /** Every node of the mounted tree, depth first. */
  nodes(): NodeMirror[];
  /** Laid-out border box of a node in screen pixels (null when not visible). */
  box(node: NodeMirror): ReturnType<typeof measureBox>;
  dispose(): void;
}

/** Mount one element tree on a fresh core. `files` are extra source files whose classes must be in the table. */
export async function mountTree(
  element: ReactNode,
  files: string[] = [],
  size: { width?: number; height?: number } = {},
): Promise<Mounted> {
  const classes = await classLiterals(files);
  const core = await bootCore({ classes, ...size });
  const compiled = compileClasses(classes);
  const tokens = [...new Set(classes.flatMap((l) => l.split(/\s+/)))].filter(
    (t) => t && unknownUtilities(t).length === 0,
  );
  installBuildStyles(compiled.ids, compiled.bin, tokens);
  const unmount = mount(element, {
    compat: {
      classMiss: "throw",
      unknownProps: "drop",
      tokenMap: true,
    } as never,
  });
  core.step(0);
  core.step(0);
  core.render();
  const walk = (n: NodeMirror, out: NodeMirror[] = []): NodeMirror[] => {
    out.push(n);
    for (const c of n.children) walk(c, out);
    return out;
  };
  return {
    core,
    root: rootMirror,
    nodes: () => walk(rootMirror),
    box: (node) => measureBox(node),
    dispose() {
      try {
        unmount();
      } catch {}
      core.dispose();
      installBuildStyles({}, new Uint8Array(0), []);
    },
  };
}

export const dirOfUi = new URL(
  "../test/fixtures/shadcn-full/ui",
  import.meta.url,
).pathname;
export const uiFiles = () =>
  readdirSync(dirOfUi)
    .filter((f) => /\.tsx?$/.test(f))
    .map((f) => dirOfUi + "/" + f);
