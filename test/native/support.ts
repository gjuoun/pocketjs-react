// Shared harness for the native spike tests: boots the overlay core the way a built app does
// (build-scan utilities as the known set, the build font slots, installBuildStyles after boot).
import type { ReactNode } from "react";
import { mount } from "../../src/index.ts";
import { compileClasses } from "../../src/internal/pocket-build.ts";
import { installBuildStyles } from "../../src/style/build-styles.ts";
import { THEMES, TOKENS } from "../../src/native/tokens.ts";
import { slotCrossProduct } from "../../tools/build.ts";
import { bootCore, type Core } from "../harness.ts";

export const ROOT = "w-full h-full flex-col bg-white";
// Literals the framework on-screen keyboard (src/input/Osk.tsx) carries: the build scan collects them from src/.
const OSK: string[] = [
  "absolute rounded-sm items-center justify-center bg-slate-700 focus:bg-blue-600 active:bg-blue-500",
  "absolute rounded-sm items-center justify-center bg-slate-800 focus:bg-blue-600 active:bg-blue-500",
  "absolute bg-slate-900",
  "text-xs font-bold text-white",
];
// Whole literals, as the build scan collects them: a literal such as "w-8 h-8 rounded-full" compiles only as a whole.
export const LITERALS: string[] = [...Object.values(TOKENS), ...Object.values(THEMES.dark), ROOT, ...OSK];
// The utilities the runtime may keep (the known set installBuildStyles receives).
export const UTILITIES: string[] = LITERALS.flatMap((l) => l.split(/\s+/)).filter(Boolean);
// The table the build would ship for LITERALS: installed as the build installs it, so mount() resolves each literal by id.
export const STYLES = compileClasses([...LITERALS]);
export const STRICT = { compat: { classMiss: "throw" as const, tokenMap: false } };

export function harness() {
  let core: Core | undefined;
  let unmount: (() => void) | undefined;
  return {
    get core(): Core { if (!core) throw new Error("harness: not booted"); return core; },
    /** `extra`: literals compiled beside the vocabulary (a mutant's own class string, never in the token set). */
    async boot(app: () => ReactNode, extra: string[] = []): Promise<Core> {
      const lits = extra.length ? [...LITERALS, ...extra] : LITERALS;
      core = await bootCore({ classes: lits, fontSlots: slotCrossProduct(lits, []) });
      const styles = extra.length ? compileClasses([...lits]) : STYLES;
      installBuildStyles(styles.ids, styles.bin, extra.length ? lits.flatMap((l) => l.split(/\s+/)).filter(Boolean) : UTILITIES);
      unmount = mount(app(), STRICT);
      core.step(0); core.step(0); core.render();
      return core;
    },
    dispose() {
      try { unmount?.(); } catch {}
      core?.dispose();
      installBuildStyles({}, new Uint8Array(0), []);
      core = undefined; unmount = undefined;
    },
  };
}

/** The ink of a drawn run: its most common colour that is not the box's own fill (the glyph colour). */
export function inkOf(core: Core, run: { x: number; y: number; w: number; h: number }): string {
  const m = new Map<string, number>();
  for (let y = run.y; y < run.y + run.h; y++) for (let x = run.x; x < run.x + run.w; x++) {
    const c = core.pixel(x, y);
    m.set(c, (m.get(c) ?? 0) + 1);
  }
  const sorted = [...m.entries()].sort((a, b) => b[1] - a[1]);
  return sorted[1]?.[0] ?? sorted[0][0];
}

/** A macrotask: React flushes a state change set by an input (a typed digit, a press) after this, not synchronously. */
export const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

/** Flush a state change: wait for React, then step and draw two frames. */
export async function settle(core: Core): Promise<void> { await tick(); core.step(0); core.step(0); core.render(); }

/**
 * The ink of a run: the colour that contrasts most with the fill beside it (the pixel two px left of the run's middle
 * row, outside the glyphs), among colours drawn at least twice in the run. Anti-aliased edges lie between fill and ink,
 * so the most contrasting colour is the glyph's own colour. Unlike inkOf, it does not pick a grey edge on small text.
 */
export function inkAgainst(core: Core, run: { x: number; y: number; w: number; h: number }): string {
  const fill = core.pixel(run.x - 2, run.y + Math.floor(run.h / 2));
  const m = new Map<string, number>();
  for (let y = run.y; y < run.y + run.h; y++) for (let x = run.x; x < run.x + run.w; x++) {
    const c = core.pixel(x, y);
    m.set(c, (m.get(c) ?? 0) + 1);
  }
  const lum = (hex: string) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const ratio = (a: string, b: string) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
  const cands = [...m.entries()].filter(([c, n]) => c !== fill && n >= 2).map(([c]) => c);
  if (cands.length === 0) return fill;
  return cands.sort((a, b) => ratio(b, fill) - ratio(a, fill))[0];
}
