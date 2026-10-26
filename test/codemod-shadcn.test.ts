// C3 codemod unit + drift tests: the committed ui/ tree is generated, current and idempotent,
// and its diagnostics name every token it mapped, substituted or dropped.
import { expect, test } from "bun:test";
import { mergeNotice } from "../tools/codemod/fetch-shadcn.ts";
import { codemod } from "../tools/codemod/shadcn.ts";

const VENDOR = "test/fixtures/shadcn-vendor";
const UPSTREAM = VENDOR + "/upstream";
const UI = VENDOR + "/ui";
const TMP = "/tmp/pocketjs-react-test/compat-c3/codemod";

test("C3: the committed ui/ tree is exactly the codemod output", async () => {
  const report = await codemod(UPSTREAM);
  expect(report.files.map((f) => f.name)).toEqual([
    "aspect-ratio.tsx",
    "avatar.tsx",
    "badge.tsx",
    "button.tsx",
    "card.tsx",
    "dialog.tsx",
    "dropdown-menu.tsx",
    "input.tsx",
    "label.tsx",
    "progress.tsx",
    "select.tsx",
    "separator.tsx",
  ]);
  for (const file of report.files) {
    const committed = await Bun.file(UI + "/" + file.name).text();
    expect({ file: file.name, drift: committed === file.after }).toEqual({
      file: file.name,
      drift: true,
    });
  }
});

test("C3: the codemod is idempotent - a second run changes nothing", async () => {
  const once = await codemod(UPSTREAM);
  for (const file of once.files)
    await Bun.write(TMP + "/once/" + file.name, file.after);
  const twice = await codemod(TMP + "/once");
  expect(twice.totals.changed).toBe(0);
  expect(twice.totals.mapped).toBe(0);
  expect(twice.totals.compilerDropped).toEqual({});
  expect(twice.totals.substituted).toEqual({});
  for (const file of twice.files)
    expect({ file: file.name, same: file.after === file.before }).toEqual({
      file: file.name,
      same: true,
    });
});

test("C3: the report names what it dropped, substituted and flattened", async () => {
  const { totals, files } = await codemod(UPSTREAM);
  // Nothing the compiler rejects survives into the app tree.
  for (const file of files)
    expect({ file: file.name, residual: file.residual }).toEqual({
      file: file.name,
      residual: [],
    });
  // The compiler-only gaps C2 cannot see are dropped by name, not silently.
  expect(totals.compilerDropped.fixed).toBeGreaterThanOrEqual(1);
  // C8 Step 6: shadow-sm is the core's soft shadow now, so it is mapped, not dropped.
  expect(totals.mapDropped["shadow-sm"]).toBeUndefined();
  expect(totals.compilerDropped["shadow-sm"]).toBeUndefined();
  // C8 Step 5: every drop names its reason; nothing falls through to "unmapped".
  expect(totals.reasons.unmapped).toBeUndefined();
  expect(totals.reasons.animation).toBeGreaterThan(0);
  expect(totals.compilerDropped["col-start-2"]).toBeGreaterThanOrEqual(1);
  // "Equivalent subset" substitutions and the C2 mapping.
  // badge (1), progress (1) and avatar's four size-keyed circles (4) round to a pixel radius.
  expect(totals.substituted["rounded-full"]).toBe(6);
  expect(totals.substituted.grid).toBeGreaterThanOrEqual(2);
  expect(totals.substituted["sr-only"]).toBe(1);
  expect(totals.mapped).toBeGreaterThan(40);
  // The first false positive this codemod had: cva's defaultVariants are values, not classes.
  const button = files.find((f) => f.name === "button.tsx")!;
  expect(button.after).toContain('variant: "default"');
  expect(button.after).toContain('size: "default"');
  // Batch A (R-S): Slot is kept. asChild reaches the real Slot, the radix-ui edge moves to the
  // native namespace, and the codemod no longer flattens the expression to its base tag.
  expect(button.after).toContain("asChild ? Slot.Root");
  expect(button.after).toContain('import { Slot } from "pocketjs-react/radix"');
});

test("C8: a comparison operand is data, not a class (position === \"popper\")", async () => {
  const dir = TMP + "/operands";
  const source = [
    'import { cn } from "pocketjs-react"',
    "export const a = cn(position === 'popper' && 'h-9 px-2')",
    "export const b = cn(mode === 'x' ? 'p-4' : 'h-9')",
    "",
  ].join("\n");
  await Bun.write(dir + "/operands.ts", source);
  const report = await codemod(dir);
  const after = report.files[0].after;
  expect(after).toContain("position === 'popper'");
  expect(after).toContain("mode === 'x'");
  expect(after).not.toContain('position === ""');
  expect(report.files[0].compilerDropped.popper).toBeUndefined();
  expect(after).toContain("'h-9'");
});

test("C3: rules R0-R3 in isolation (rounded-full derivation, aliases, opacity, empty)", async () => {
  const dir = TMP + "/rules";
  const source = [
    'import { cn } from "pocketjs-react"',
    "export const a = cn('h-9 rounded-full px-2')",
    "export const b = cn('rounded-full py-0.5 text-xs')",
    "export const c = cn('inline-flex size-9 hover:bg-primary/90 shadow-sm grid')",
    "export const d = cn('sr-only')",
    "export const f = cn('rounded-full size-8')",
    "export const e = cn(`p-${4} text-sm`)",
    "",
  ].join("\n");
  await Bun.write(dir + "/rules.ts", source);
  const report = await codemod(dir);
  const after = report.files[0].after;
  expect(after).toContain('cn("h-9 rounded-[18px] px-2")');
  expect(after).toContain('cn("rounded-[10px] py-0.5 text-xs")');
  expect(after).toContain(
    'cn("flex w-9 h-9 active:bg-slate-900 shadow flex flex-col")',
  );
  expect(after).toContain('cn("hidden")');
  // Batch A (B4): a size-N avatar is N * 2 px of radius, the same as its h-N twin.
  expect(after).toContain('cn("rounded-[16px] w-8 h-8")');
  // A template literal with expressions is reported, not guessed at.
  expect(report.files[0].skipped).toBe(1);
  expect(report.files[0].after).toContain("p-${4} text-sm");
  expect(report.files[0].residual).toEqual([]);
  expect(report.files[0].mapDropped["shadow-sm"]).toBeUndefined();
  expect(report.files[0].compilerDropped["shadow-sm"]).toBeUndefined();
  expect(report.files[0].after).toContain("shadow flex flex-col");
});

test("C3: --check is clean on ui/ and reports drift without writing", async () => {
  const root = import.meta.dir + "/..";
  const run = (out: string) =>
    Bun.spawnSync({
      cmd: ["bun", "tools/codemod/shadcn.ts", UPSTREAM, out, "--check"],
      cwd: root,
    });
  const clean = run(UI);
  expect({
    status: clean.exitCode,
    out: clean.stdout.toString().trim().split("\n").at(-1),
  }).toEqual({ status: 0, out: "check: clean" });
  // A stale generated file must be reported, and --check must not rewrite it.
  const drift = TMP + "/drift";
  for (const file of await codemod(UPSTREAM).then((r) => r.files))
    await Bun.write(drift + "/" + file.name, file.after + "\n");
  const drifted = run(drift);
  expect(drifted.exitCode).toBe(1);
  expect(drifted.stdout.toString()).toContain("DRIFT");
  expect(await Bun.file(drift + "/button.tsx").text()).toContain(
    "cn(buttonVariants({ variant, size, className }))",
  );
});

test("C5: R6/R7 move the radix-ui and lucide-react edges, and a second run changes nothing", async () => {
  const { totals, files } = await codemod(UPSTREAM);
  const dialog = files.find((f) => f.name === "dialog.tsx")!;
  expect(dialog.after).toContain('from "pocketjs-react/radix"');
  expect(dialog.after).toContain('from "pocketjs-react/glyph-icons"');
  expect(dialog.after).not.toContain('from "radix-ui"');
  expect(dialog.after).not.toContain('from "lucide-react"');
  // Every component that reaches radix-ui: button and badge (Slot), and the other eight.
  expect(totals.substituted["import:radix-ui"]).toBe(10);
  expect(totals.substituted["import:lucide-react"]).toBe(3);
  // Slot is a member of the radix-ui edge like the others: R6 rewrites its import too.
  const button = files.find((f) => f.name === "button.tsx")!;
  expect(button.after).toContain('from "pocketjs-react/radix"');
  const dir = TMP + "/c5-edges";
  for (const file of files) await Bun.write(dir + "/" + file.name, file.after);
  const twice = await codemod(dir);
  expect(twice.totals.changed).toBe(0);
  expect(twice.totals.substituted["import:radix-ui"]).toBeUndefined();
  expect(twice.totals.substituted["import:lucide-react"]).toBeUndefined();
});

test("C3: the NOTICE merge keeps earlier rows, replaces a re-fetched row in place, appends new files", async () => {
  const existing = await Bun.file(VENDOR + "/NOTICE.md").text();
  const before = [...existing.matchAll(/^\| `([^`]+)` \|/gm)].map((m) => m[1]);
  const base = { name: "badge", file: "badge.tsx", url: "https://example.test/badge.json", bytes: 1, remaps: ["r"], sha256: "a".repeat(64) };
  const next = mergeNotice(existing, {
    style: "new-york-v4",
    fetched: "2026-10-26",
    entries: [base, { ...base, name: "newone", file: "newone.tsx", sha256: "b".repeat(64) }],
  });
  const after = [...next.matchAll(/^\| `([^`]+)` \|/gm)].map((m) => m[1]);
  expect([...after].sort()).toEqual([...new Set([...before, "newone.tsx"])].sort());
  expect(next).toContain("| `badge.tsx` | 1 | `" + "a".repeat(64) + "` |");
});
