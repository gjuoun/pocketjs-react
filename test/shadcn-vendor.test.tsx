// C3 acceptance: real shadcn registry source -> codemod -> build -> render on the web host.
// The codemod itself (drift/idempotency/diagnostics) is covered by test/codemod-shadcn.test.ts;
// this file proves the generated tree actually mounts and draws, and that it needs neither the
// C2 runtime token map nor the classMiss drop policy.
import { afterEach, expect, test } from "bun:test";
import { compatStats, mount, resetCompatStats } from "../src/index.ts";
import { rootMirror } from "../src/internal/pocket.ts";
import { compileClasses } from "../src/internal/pocket-build.ts";
import { installBuildStyles } from "../src/style/build-styles.ts";
import { build } from "../tools/build.ts";
import { Demo } from "./fixtures/shadcn-vendor/app.tsx";
import { bootApp, bootCore, type Core, type TextRun } from "./harness.ts";

const VENDOR = "test/fixtures/shadcn-vendor";
const OUT = "/tmp/pocketjs-react-test/compat-c3";

let core: Core | undefined;
afterEach(() => {
  core?.dispose();
  core = undefined;
  resetCompatStats();
  installBuildStyles({}, new Uint8Array(0), []);
});

const buildDemo = () =>
  build(VENDOR + "/main.tsx", { outdir: OUT, name: "shadcn-vendor" });
const bootBuilt = async () => {
  core = await bootApp(await buildDemo());
  core.step(0);
  return core;
};
const runOf = (c: Core, text: string): TextRun =>
  c.texts().find((r) => r.text === text)!;
/** Dominant color of a text run's rect: the surface the label sits on. */
const surface = (c: Core, r: TextRun): string => {
  const hist = new Map<string, number>();
  for (let y = r.y; y < r.y + r.h; y++) {
    for (let x = r.x; x < r.x + r.w; x++) {
      const p = c.pixel(x, y);
      hist.set(p, (hist.get(p) ?? 0) + 1);
    }
  }
  return [...hist.entries()].sort((a, b) => b[1] - a[1])[0][0];
};

test("C3: the built demo renders every vendored component on the web host", async () => {
  const c = await bootBuilt();
  // C4: the vendored <Input placeholder="Name"/> now draws its placeholder (before C4 an
  // input could not render text at all); the rest of the list is unchanged.
  expect(c.texts().map((r) => r.text)).toEqual([
    "Save",
    "Delete",
    "Beta",
    "Name",
    "Vendored card",
    "codemod output",
    "Card body",
    "Open",
  ]);
});

test("C3: the vendored surfaces are the mapped PocketJS colors", async () => {
  const c = await bootBuilt();
  expect(surface(c, runOf(c, "Save"))).toBe("#0f172a");
  expect(surface(c, runOf(c, "Delete"))).toBe("#dc2626");
  expect(surface(c, runOf(c, "Beta"))).toBe("#e2e8f0");
  // Card maps bg-card -> bg-white; the demo overrides it (shadcn's default white label color
  // needs a dark surface until the text layer inherits color - the C2 known gap).
  expect(surface(c, runOf(c, "Vendored card"))).toBe("#0f172a");
  expect(surface(c, runOf(c, "Open"))).toBe("#0f172a");
});

test("C3: the mapped node tree keeps DOM provenance (div/button/input)", async () => {
  const built = await buildDemo();
  core = await bootCore({ classes: built.tokens });
  installBuildStyles({}, compileClasses([]).bin, built.tokens);
  mount(<Demo />, { compat: { classMiss: "drop" } });
  core.step(0);
  const tags = new Set<string>();
  const walk = (node: { debugName?: string; children?: unknown[] }) => {
    if (node.debugName) tags.add(node.debugName);
    for (const child of (node.children ?? []) as (typeof node)[]) walk(child);
  };
  walk(rootMirror as never);
  expect(tags.has("div")).toBe(true);
  expect(tags.has("button")).toBe(true);
  expect(tags.has("input")).toBe(true);
});

// The C3 proof: the source, not the runtime, speaks PocketJS. Strict class resolution throws on
// any token the build scan never saw, and the token map is off - the codemod output must pass.
test("C3: the codemod output mounts under the strict policies (classMiss=throw, tokenMap=false)", async () => {
  const built = await buildDemo();
  core = await bootCore({ classes: built.tokens });
  installBuildStyles({}, compileClasses([]).bin, built.tokens);
  mount(<Demo />, { compat: { classMiss: "throw", tokenMap: false } });
  core.step(0);
  const stats = compatStats();
  expect(stats.classMiss).toEqual({ tokens: 0, literals: 0 });
  expect(stats.tokenMap).toEqual({ mapped: 0, dropped: 0 });
  expect(core.texts().map((r) => r.text)).toContain("Vendored card");
});

// The demo's dialog is closed, so its content is not mounted - as it is not in any Radix dialog. The
// C3 limit (Radix Portal returned null without a document body, audit p11) is gone since C5: opening
// the vendored dialog mounts its content (test/shadcn-overlay.test.tsx). C10 still owns fixed/grid/calc.
test("C3: the Radix dialog renders its trigger and keeps its content out (C5/C10)", async () => {
  const c = await bootBuilt();
  const texts = c.texts().map((r) => r.text);
  expect(texts).toContain("Open");
  expect(texts).not.toContain("Dialog title");
  expect(texts).not.toContain("Dialog body");
});
