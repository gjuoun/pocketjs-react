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
    async boot(app: () => ReactNode): Promise<Core> {
      core = await bootCore({ classes: LITERALS, fontSlots: slotCrossProduct(LITERALS, []) });
      installBuildStyles(STYLES.ids, STYLES.bin, UTILITIES);
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
