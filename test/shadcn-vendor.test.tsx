// C3 acceptance: real shadcn registry source -> codemod -> build -> render on the web host.
// The committed ui/ tree is codemod output (never hand-edited); these tests prove it is current,
// idempotent, honest about what it dropped, and that the demo needs neither the C2 runtime token
// map nor the classMiss drop policy - i.e. the rewrite really landed in the source.
import { afterEach, expect, test } from "bun:test";
import { build } from "../tools/build.ts";
import { codemod } from "../tools/codemod/shadcn.ts";
import { bootApp, bootCore, type Core, type TextRun } from "./harness.ts";
import { compatStats, mount, resetCompatStats } from "../src/index.ts";
import { compileClasses } from "../src/internal/pocket-build.ts";
import { rootMirror } from "../src/internal/pocket.ts";
import { installBuildStyles } from "../src/style/build-styles.ts";
import { Demo } from "./fixtures/shadcn-vendor/app.tsx";

const VENDOR = "test/fixtures/shadcn-vendor";
const UPSTREAM = VENDOR + "/upstream";
const UI = VENDOR + "/ui";
const OUT = "/tmp/pocketjs-react-test/compat-c3";

let core: Core | undefined;
afterEach(() => {
  core?.dispose();
  core = undefined;
  resetCompatStats();
  installBuildStyles({}, new Uint8Array(0), []);
});

const bootBuilt = async () => {
  core = await bootApp(await build(VENDOR + "/main.tsx", { outdir: OUT, name: "shadcn-vendor" }));
  core.step(0);
  return core;
};
const runOf = (c: Core, text: string): TextRun => c.texts().find((r) => r.text === text)!;
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

// ---------------------------------------------------------------- codemod
test("C3: the committed ui/ tree is exactly the codemod output", async () => {
  const report = await codemod(UPSTREAM);
  expect(report.files.map((f) => f.name)).toEqual(["badge.tsx", "button.tsx", "card.tsx", "dialog.tsx", "input.tsx"]);
  for (const file of report.files) {
    const committed = await Bun.file(UI + "/" + file.name).text();
    expect({ file: file.name, drift: committed === file.after }).toEqual({ file: file.name, drift: true });
  }
});

test("C3: the codemod is idempotent - a second run changes nothing", async () => {
  const once = await codemod(UPSTREAM);
  // Feed the output back through the same transform: no rule may fire again.
  const dir = OUT + "/idempotent";
  for (const file of once.files) await Bun.write(dir + "/" + file.name, file.after);
  const twice = await codemod(dir);
  expect(twice.totals.changed).toBe(0);
  expect(twice.totals.mapped).toBe(0);
  expect(twice.totals.compilerDropped).toEqual({});
  expect(twice.totals.asChildFlattened).toBe(0);
  for (const file of twice.files) expect({ file: file.name, same: file.after === file.before }).toEqual({ file: file.name, same: true });
});

test("C3: the report names what it dropped, substituted and flattened", async () => {
  const { totals, files } = await codemod(UPSTREAM);
  // Nothing the compiler rejects may survive into the app tree.
  for (const file of files) expect({ file: file.name, residual: file.residual }).toEqual({ file: file.name, residual: [] });
  // The compiler-only gaps C2 cannot see are dropped by name, not silently.
  expect(totals.compilerDropped.grid).toBeGreaterThanOrEqual(2);
  expect(totals.compilerDropped.fixed).toBeGreaterThanOrEqual(1);
  expect(totals.compilerDropped["shadow-sm"]).toBeGreaterThanOrEqual(1);
  // "Equivalent subset" substitutions, plus the C2 mapping and the Slot/asChild flattening.
  expect(totals.substituted["rounded-full"]).toBe(1);
  expect(totals.substituted.grid).toBeGreaterThanOrEqual(1);
  expect(totals.substituted["sr-only"]).toBe(1);
  expect(totals.mapped).toBeGreaterThan(40);
  expect(totals.asChildFlattened).toBe(2);
  // The first false-positive this codemod had: cva's defaultVariants are values, not classes.
  const button = files.find((f) => f.name === "button.tsx")!;
  expect(button.after).toContain('variant: "default"');
  expect(button.after).toContain('size: "default"');
});

// ---------------------------------------------------------------- render
test("C3: the built demo renders every vendored component on the web host", async () => {
  const c = await bootBuilt();
  expect(c.texts().map((r) => r.text)).toEqual(["Save", "Delete", "Beta", "Vendored card", "codemod output", "Card body", "Open"]);
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
  const built = await build(VENDOR + "/main.tsx", { outdir: OUT, name: "shadcn-vendor" });
  core = await bootCore({ classes: built.tokens });
  installBuildStyles({}, compileClasses([]).bin, built.tokens);
  mount(<Demo />, { compat: { classMiss: "drop" } });
  core.step(0);
  const tags = new Set<string>();
  const walk = (node: { debugName?: string; children?: unknown[] }) => {
    if (node.debugName) tags.add(node.debugName);
    for (const child of (node.children ?? []) as typeof node[]) walk(child);
  };
  walk(rootMirror as never);
  expect(tags.has("div")).toBe(true);
  expect(tags.has("button")).toBe(true);
  expect(tags.has("input")).toBe(true);
});

// The C3 proof: the source, not the runtime, speaks PocketJS. Strict class resolution throws on
// any token the build scan never saw, and the token map is off - the codemod output must pass.
test("C3: the codemod output mounts under the strict policies (classMiss=throw, tokenMap=false)", async () => {
  const built = await build(VENDOR + "/main.tsx", { outdir: OUT, name: "shadcn-vendor" });
  core = await bootCore({ classes: built.tokens });
  installBuildStyles({}, compileClasses([]).bin, built.tokens);
  mount(<Demo />, { compat: { classMiss: "throw", tokenMap: false } });
  core.step(0);
  const stats = compatStats();
  expect(stats.classMiss).toEqual({ tokens: 0, literals: 0 });
  expect(stats.tokenMap).toEqual({ mapped: 0, dropped: 0 });
  expect(core.texts().map((r) => r.text)).toContain("Vendored card");
});

// Radix Portal needs a document body, which the guest does not have: the trigger renders, the
// content does not (audit p11). Recorded as the honest limit of C3 - the real fix is C5 (native
// dialog primitives) and C10 (fixed/grid/calc in the core).
test("C3: the Radix dialog renders its trigger and keeps its content out (C5/C10)", async () => {
  const c = await bootBuilt();
  const texts = c.texts().map((r) => r.text);
  expect(texts).toContain("Open");
  expect(texts).not.toContain("Dialog title");
  expect(texts).not.toContain("Dialog body");
});
