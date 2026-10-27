// Build and boot one acceptance target in-process: a gallery section (its real body, in the gallery Frame)
// or a defect mutant. The in-process core keeps the mirror tree, so the gates can read node geometry.
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createElement } from "react";
import { mount, resetCompatStats } from "../../../src/index.ts";
import { type NodeMirror, rootMirror } from "../../../src/internal/pocket.ts";
import { compileClasses } from "../../../src/internal/pocket-build.ts";
import { installBuildStyles } from "../../../src/style/build-styles.ts";
import { bootCore, type Core } from "../../../test/harness.ts";
import { build } from "../../build.ts";
import { MUTANTS } from "../../../test/fixtures/acceptance-defects/mutants.tsx";

export const ROOT = resolve(import.meta.dir, "../../..");
export const OUT = join(ROOT, "dist/qa/screens");
export type Target =
  | { kind: "section"; name: string }
  | { kind: "mutant"; name: string }
  | { kind: "fixture"; name: string };
export const targetId = (t: Target): string => t.kind + "-" + t.name;
/** The bare name a report shows: the section or mutant name. */
export const targetName = (t: Target): string => t.name;
/** The gallery section a mutant replaces (its driver and its report row). */
export function MUTANT_COMPONENT(name: string): string {
  return MUTANTS[name].component;
}

/** The generated entry: the gallery Frame around a section body, or around a mutant body. */
function entrySource(t: Target): string {
  if (t.kind === "fixture")
    return 'import Screen from "' + ROOT + '/test/fixtures/acceptance-defects/' + t.name + '.tsx";\nexport default Screen;\n';
  const head = 'import { View } from "pocketjs-react";\nimport { Frame } from "' + ROOT + '/test/fixtures/shadcn-gallery/frame.tsx";\n';
  if (t.kind === "section")
    return (
      head +
      'import { SECTIONS } from "' + ROOT + '/test/fixtures/shadcn-gallery/layout.ts";\n' +
      'import { BODIES } from "' + ROOT + '/test/fixtures/shadcn-gallery/sections.tsx";\n' +
      "const index = SECTIONS.findIndex((s) => s.name === " + JSON.stringify(t.name) + ");\n" +
      "export default function Screen() {\n" +
      "  const Body = BODIES[" + JSON.stringify(t.name) + "];\n" +
      '  return (<View className="w-full h-full flex-col bg-slate-100"><Frame index={index} total={SECTIONS.length} name={' +
      JSON.stringify(t.name) + '} h={SECTIONS[index].h}><Body /></Frame></View>);\n}\n'
    );
  return (
    head +
    'import { MUTANTS } from "' + ROOT + '/test/fixtures/acceptance-defects/mutants.tsx";\n' +
    "const M = MUTANTS[" + JSON.stringify(t.name) + "];\n" +
    "export default function Screen() {\n  const Body = M.body;\n" +
    '  return (<View className="w-full h-full flex-col bg-slate-100"><Frame index={0} total={1} name={M.component} h={M.h}><Body /></Frame></View>);\n}\n'
  );
}

export interface Booted {
  id: string;
  core: Core;
  unmount: () => void;
  screen: () => unknown;
}

/** Build the target's entry and boot it on a fresh in-process core, two frames settled. */
export async function bootTarget(t: Target): Promise<Booted> {
  const id = targetId(t);
  mkdirSync(OUT, { recursive: true });
  const entry = join(OUT, id + ".tsx");
  writeFileSync(entry, entrySource(t));
  const built = await build(entry, { outdir: OUT, name: id });
  const core = await bootCore({ classes: built.tokens, fontSlots: built.fontSlots });
  installBuildStyles({}, compileClasses([]).bin, built.tokens);
  const mod = (await import(entry)) as { default: () => unknown };
  const unmount = mount(createElement(mod.default as never), { compat: { classMiss: "drop" } });
  core.step(0);
  core.step(0);
  core.render();
  return { id, core, unmount, screen: mod.default };
}

export function disposeTarget(b: Booted): void {
  try {
    b.unmount();
  } catch {}
  b.core.dispose();
  resetCompatStats();
  installBuildStyles({}, new Uint8Array(0), []);
}

/** The first mirror node (tree order from the root) that matches. */
export function findNode(pred: (n: NodeMirror) => boolean, root: NodeMirror = rootMirror): NodeMirror | undefined {
  if (pred(root)) return root;
  for (const k of root.children) {
    const f = findNode(pred, k);
    if (f) return f;
  }
  return undefined;
}
