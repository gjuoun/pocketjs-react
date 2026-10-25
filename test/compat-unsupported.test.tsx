// C8 Step 11: every dropped class token is counted by its policy reason, so the reasons add up to the
// classMiss and tokenMap drop counts. The real wasm core runs the literal under the drop policy.
import { afterEach, expect, test } from "bun:test";
import { compatStats, mount, resetCompatStats } from "../src/index.ts";
import { compileClasses } from "../src/internal/pocket-build.ts";
import { installBuildStyles } from "../src/style/build-styles.ts";
import { bootCore, type Core } from "./harness.ts";

const TOKENS = ["w-full", "h-full", "p-4", "w-4", "h-4", "bg-slate-800"];
let core: Core | undefined;
afterEach(() => {
  core?.dispose();
  core = undefined;
  resetCompatStats();
  installBuildStyles({}, new Uint8Array(0), []);
});

test("the unsupported reasons sum to classMiss.tokens + tokenMap.dropped, each drop under its reason", async () => {
  const styles = compileClasses(TOKENS);
  installBuildStyles(styles.ids, styles.bin, TOKENS);
  core = await bootCore({ classes: TOKENS });
  mount(
    <div className="w-full h-full p-4">
      <div className="w-4 h-4 bg-slate-800 dark:bg-red-600 animate-spin rounded-full" />
    </div>,
    { compat: { classMiss: "drop" } },
  );
  core.step(0);
  const stats = compatStats();
  const total = Object.values(stats.unsupported).reduce((a, b) => a + b, 0);
  expect(total).toBe(stats.classMiss.tokens + stats.tokenMap.dropped);
  // dark: is a map drop; rounded-full has no pinned size, so it drops; animate-spin is a kept
  // utility the build table does not hold, so it is a classMiss.
  expect(stats.unsupported.dark).toBe(1);
  expect(stats.unsupported["no-core-feature"]).toBe(1);
  expect(stats.unsupported["not-in-build"]).toBe(1);
});
