// C3 codemod unit + drift tests: the committed ui/ tree is generated, current and idempotent,
// and its diagnostics name every token it mapped, substituted or dropped.
import { expect, test } from "bun:test";
import { codemod } from "../tools/codemod/shadcn.ts";

const VENDOR = "test/fixtures/shadcn-vendor";
const UPSTREAM = VENDOR + "/upstream";
const UI = VENDOR + "/ui";
const TMP = "/tmp/pocketjs-react-test/compat-c3/codemod";

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
  for (const file of once.files) await Bun.write(TMP + "/once/" + file.name, file.after);
  const twice = await codemod(TMP + "/once");
  expect(twice.totals.changed).toBe(0);
  expect(twice.totals.mapped).toBe(0);
  expect(twice.totals.compilerDropped).toEqual({});
  expect(twice.totals.substituted).toEqual({});
  expect(twice.totals.asChildFlattened).toBe(0);
  for (const file of twice.files) expect({ file: file.name, same: file.after === file.before }).toEqual({ file: file.name, same: true });
});

test("C3: the report names what it dropped, substituted and flattened", async () => {
  const { totals, files } = await codemod(UPSTREAM);
  // Nothing the compiler rejects survives into the app tree.
  for (const file of files) expect({ file: file.name, residual: file.residual }).toEqual({ file: file.name, residual: [] });
  // The compiler-only gaps C2 cannot see are dropped by name, not silently.
  expect(totals.compilerDropped.fixed).toBeGreaterThanOrEqual(1);
  expect(totals.compilerDropped["shadow-sm"]).toBeGreaterThanOrEqual(1);
  expect(totals.compilerDropped["col-start-2"]).toBeGreaterThanOrEqual(1);
  // "Equivalent subset" substitutions, plus the C2 mapping and the Slot/asChild flattening.
  expect(totals.substituted["rounded-full"]).toBe(1);
  expect(totals.substituted.grid).toBeGreaterThanOrEqual(2);
  expect(totals.substituted["sr-only"]).toBe(1);
  expect(totals.mapped).toBeGreaterThan(40);
  expect(totals.asChildFlattened).toBe(2);
  // The first false positive this codemod had: cva's defaultVariants are values, not classes.
  const button = files.find((f) => f.name === "button.tsx")!;
  expect(button.after).toContain('variant: "default"');
  expect(button.after).toContain('size: "default"');
  // Slot left the vendored components: asChild is flattened to the base tag (C1 F1 policy).
  expect(button.after).not.toContain("Slot");
  expect(button.after).not.toContain("asChild");
});

test("C3: rules R0-R3 in isolation (rounded-full derivation, aliases, opacity, empty)", async () => {
  const dir = TMP + "/rules";
  const source = [
    'import { cn } from "pocketjs-react"',
    "export const a = cn('h-9 rounded-full px-2')",
    "export const b = cn('rounded-full py-0.5 text-xs')",
    "export const c = cn('inline-flex size-9 hover:bg-primary/90 shadow-sm grid')",
    "export const d = cn('sr-only')",
    'export const e = cn(`p-${4} text-sm`)',
    "",
  ].join("\n");
  await Bun.write(dir + "/rules.ts", source);
  const report = await codemod(dir);
  const after = report.files[0].after;
  expect(after).toContain('cn("h-9 rounded-[18px] px-2")');
  expect(after).toContain('cn("rounded-[10px] py-0.5 text-xs")');
  expect(after).toContain('cn("flex w-9 h-9 active:bg-slate-900 flex flex-col")');
  expect(after).toContain('cn("hidden")');
  // A template literal with expressions is reported, not guessed at.
  expect(report.files[0].skipped).toBe(1);
  expect(report.files[0].after).toContain("p-${4} text-sm");
  expect(report.files[0].residual).toEqual([]);
  expect(report.files[0].mapDropped["shadow-sm"]).toBeUndefined();
  expect(report.files[0].compilerDropped["shadow-sm"]).toBe(1);
});

test("C3: --check is clean on ui/ and reports drift without writing", async () => {
  const root = import.meta.dir + "/..";
  const run = (out: string) => Bun.spawnSync({ cmd: ["bun", "tools/codemod/shadcn.ts", UPSTREAM, out, "--check"], cwd: root });
  const clean = run(UI);
  expect({ status: clean.exitCode, out: clean.stdout.toString().trim().split("\n").at(-1) }).toEqual({ status: 0, out: "check: clean" });
  // A stale generated file must be reported, and --check must not rewrite it.
  const drift = TMP + "/drift";
  for (const file of await codemod(UPSTREAM).then((r) => r.files)) await Bun.write(drift + "/" + file.name, file.after + "\n");
  const drifted = run(drift);
  expect(drifted.exitCode).toBe(1);
  expect(drifted.stdout.toString()).toContain("DRIFT");
  expect(await Bun.file(drift + "/button.tsx").text()).toContain('cn(buttonVariants({ variant, size, className }))');
});
