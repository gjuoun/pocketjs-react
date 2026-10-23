// C1 class-miss policy: class tokens outside the build table throw by default (the strict
// web-host contract, unchanged) and drop+count under mount({ compat: { classMiss: "drop" } })
// - with the supported subset of the same literal still styling the node. The class runtime
// runs for real here: the build table is installed like tools/build.ts does.
import { afterEach, expect, test } from "bun:test";
import { bootCore, type Core } from "./harness.ts";
import { compatStats, mount, resetCompatStats } from "../src/index.ts";
import { compileClasses } from "../src/internal/pocket-build.ts";
import { classRuntimeStats } from "../src/style/class-runtime.ts";
import { installBuildStyles } from "../src/style/build-styles.ts";
import { rootMirror } from "../src/internal/pocket.ts";

const TOKENS = ["w-4", "h-4", "bg-slate-800", "w-full", "h-full", "p-4"];
let core: Core | undefined;
afterEach(() => {
  core?.dispose();
  resetCompatStats();
  classRuntimeStats.droppedTokens = 0;
  classRuntimeStats.droppedLiterals = 0;
});

const boot = async (): Promise<Core> => {
  const styles = compileClasses(TOKENS);
  installBuildStyles(styles.ids, styles.bin, TOKENS);
  return (core = await bootCore({ classes: TOKENS }));
};

test("guard: outside tokens still throw on the default policy", async () => {
  await boot();
  expect(() => mount(<div className="w-4 h-4 bg-primary" />)).toThrow("does not appear in the source");
});

test("classMiss drop: a shadcn-shaped literal mounts, counts, and the supported subset styles", async () => {
  const c = await boot();
  mount(
    <div className="w-full h-full p-4">
      <div className="w-4 h-4 bg-slate-800 rounded-full px-2 py-0.5 bg-primary" />
    </div>,
    { compat: { classMiss: "drop" } },
  );
  c.step(0);
  c.render();
  expect(core!.pixel(20, 20)).toBe("#1e293b");
  // C2 maps bg-primary -> bg-slate-900 and drops rounded-full; the mapped vocabulary is not
  // in this ad-hoc build table yet, so the remaining miss is the mapping's own target.
  expect(compatStats().classMiss).toEqual({ tokens: 3, literals: 1 });
  expect(compatStats().tokenMap).toEqual({ mapped: 1, dropped: 1 });
});

test("classMiss drop: an entirely unknown literal leaves the node unstyled, not crashed", async () => {
  const c = await boot();
  mount(<div className="bg-primary font-semibold" />, { compat: { classMiss: "drop" } });
  c.step(0);
  expect(compatStats().classMiss).toEqual({ tokens: 2, literals: 1 });
  expect(compatStats().tokenMap).toEqual({ mapped: 2, dropped: 0 });
  expect(rootMirror.children[0].children[0].children.length).toBe(0);
});

test("tokenMap: false keeps the shadcn vocabulary and counts it as a plain miss", async () => {
  const c = await boot();
  mount(<div className="bg-primary" />, { compat: { classMiss: "drop", tokenMap: false } });
  c.step(0);
  expect(compatStats().classMiss).toEqual({ tokens: 1, literals: 1 });
  expect(compatStats().tokenMap).toEqual({ mapped: 0, dropped: 0 });
});
