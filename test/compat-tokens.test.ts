// The C2 token map's contract: every target is real PocketJS vocabulary (so a rewritten
// literal compiles), the audit's 7 core shadcn literals rewrite to 6 compilable strings plus
// the known Dialog gap, and rewriting is idempotent and whitespace-normalizing.
import { expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  type DropReason,
  dropReason,
  rewrite,
  rewriteLiteral,
  rewriteToken,
  TOKEN_MAP,
} from "../src/compat/tokens.ts";
import { bodiesOnly, splitSelector } from "../src/compat/selectors.ts";
import { parsePercent } from "../src/compat/tokens.ts";
import { parseClassLiteral, unknownUtilities } from "../src/internal/pocket.ts";

const COLOUR_PREFIX =
  /^(bg|text|border|ring|from|via|to|fill|stroke|shadow|outline|divide|decoration|accent|caret|placeholder)-/;

const BUTTON_BASE =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";
const BUTTON_DEFAULT = "bg-primary text-primary-foreground hover:bg-primary/90";
const BUTTON_SIZE = "h-9 px-4 py-2 has-[>svg]:px-3";
const BADGE_BASE =
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3";
const INPUT =
  "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors outline-none";
const DIALOG =
  "absolute top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-background p-6 shadow-lg duration-200 outline-none sm:max-w-lg";

const LITERALS: [string, string][] = [
  ["v4 button base", BUTTON_BASE],
  ["v4 button default", BUTTON_DEFAULT],
  ["v4 button size default", BUTTON_SIZE],
  ["v4 badge base", BADGE_BASE],
  [
    "v4 badge default",
    "bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
  ],
  ["v4 input", INPUT],
  ["v4 dialog content", DIALOG],
];

test("every map target is real PocketJS vocabulary", () => {
  for (const [from, to] of Object.entries(TOKEN_MAP)) {
    if (to === "") continue;
    for (const tok of to.split(" ")) {
      // A selector target is checked by its body: the selector itself is resolved per node.
      const body = splitSelector(tok)?.body ?? tok;
      expect({ from, tok, unknown: unknownUtilities(body) }).toEqual({
        from,
        tok,
        unknown: [],
      });
      expect({ from, tok, parsed: parseClassLiteral(body) !== null }).toEqual({
        from,
        tok,
        parsed: true,
      });
    }
  }
});

test("token cases: semantic colors, aliases, variants, opacity and drops", () => {
  const cases: [string, string][] = [
    ["bg-primary", "bg-slate-900"],
    ["text-primary-foreground", "text-white"],
    ["text-muted-foreground", "text-slate-500"],
    ["bg-secondary", "bg-slate-200"],
    ["text-secondary-foreground", "text-slate-900"],
    ["border-input", "border-slate-200"],
    ["inline-flex", "flex"],
    ["font-medium", "font-bold"],
    ["shadow-xs", "shadow"],
    ["size-4", "w-4 h-4"],
    ["size-9", "w-9 h-9"],
    ["hover:bg-primary/90", "active:bg-slate-900"],
    ["focus-visible:border-ring", ""],
    ["focus-visible:ring-ring/50", ""],
    ["dark:aria-invalid:ring-destructive/40", ""],
    ["disabled:opacity-50", "disabled:opacity-50"],
    ["disabled:bg-primary", "disabled:bg-slate-900"],
    ["[&_svg]:shrink-0", ""],
    ["has-[>svg]:px-3", "has-[>svg]:px-3"],
    ["ring-destructive/20", ""],
    ["rounded-full", ""],
    ["underline", ""],
    ["flex", "flex"],
    ["bg-slate-900", "bg-slate-900"],
  ];
  for (const [from, to] of cases)
    expect({ from, to: rewriteToken(from) }).toEqual({ from, to });
});

test("the button base decomposes: 5 mapped + 14 dropped = 19 (focus ring border dropped)", () => {
  // The cva literal the fixture renders: base 22 + default 3 + size-default 4 tokens.
  const full = [BUTTON_BASE, BUTTON_DEFAULT, BUTTON_SIZE].join(" ");
  const whole = rewrite(full);
  expect({
    text: whole.text,
    mapped: whole.mapped,
    dropped: whole.dropped,
  }).toEqual({
    text: "flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-bold transition-all disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-red-600 bg-slate-900 text-white active:bg-slate-900 h-9 px-4 py-2 has-[>svg]:px-3",
    mapped: 6,
    dropped: 10,
  });
});

test("the button default variant rewrites to slate-900 / white / active slate-900", () => {
  expect(rewriteLiteral(BUTTON_DEFAULT)).toBe(
    "bg-slate-900 text-white active:bg-slate-900",
  );
});

test("the audit's 7 literals: selectors resolve to bodies that compile, except the named gaps", () => {
  // C8: a selector token is resolved per node, so what the build compiles is its body. The
  // bodies the core cannot draw are named here; the codemod drops exactly these at generation.
  const unsupported: Record<string, string[]> = {
    "v4 button base": ["pointer-events-none", "border-destructive"],
    "v4 badge base": ["pointer-events-none", "border-destructive"],
    "v4 dialog content": [
      "grid",
      "top-[50%]",
      "left-[50%]",
      "max-w-[calc(100%-2rem)]",
      "translate-x-[-50%]",
      "translate-y-[-50%]",
    ],
  };
  for (const [label, lit] of LITERALS) {
    const out = rewriteLiteral(bodiesOnly(lit));
    const bad = out
      .split(" ")
      .filter((tok) => unknownUtilities(tok).length > 0);
    expect({
      label,
      bad: bad.filter((t) => !unsupported[label]?.includes(t)),
    }).toEqual({ label, bad: [] });
    expect({ label, compiled: parseClassLiteral(out) !== null }).toEqual({
      label,
      compiled: (unsupported[label]?.length ?? 0) === 0,
    });
  }
  // The Dialog residue names exactly what only a core change can fix (L3-d, C10).
  expect(rewriteLiteral(DIALOG)).toBe(
    "absolute top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-white p-6 shadow-lg duration-200",
  );
});

test("rewriting is idempotent and normalizes whitespace", () => {
  const corpus = [
    ...LITERALS.map(([, lit]) => lit),
    ...Object.keys(TOKEN_MAP),
    ...Object.values(TOKEN_MAP),
  ];
  for (const lit of corpus) {
    const once = rewriteLiteral(lit);
    expect({ lit, twice: rewriteLiteral(once) }).toEqual({ lit, twice: once });
  }
  expect(rewriteLiteral("  bg-primary   text-white  ")).toBe(
    "bg-slate-900 text-white",
  );
  expect(rewriteLiteral("")).toBe("");
});

// C8 Step 5/6: the reason every dropped token carries, and the low-cost mappings that replaced some drops.
test("C8: each dropped family names its policy reason", () => {
  const cases: [string, DropReason][] = [
    ["dark:bg-input/30", "dark"],
    ["sm:flex-row", "responsive"],
    ["placeholder:text-muted-foreground", "pseudo"],
    ["focus-visible:ring-[3px]", "focus-indicator"],
    ["focus-visible:border-ring", "focus-indicator"],
    ["data-[state=open]:animate-in", "animation"],
    ["data-[state=closed]:zoom-out-95", "animation"],
    ["cursor-default", "noop"],
    ["[&_svg]:pointer-events-none", "noop"],
    ["[&_svg]:size-4", "noop"],
    ["outline-hidden", "noop"],
    ["grid-cols-[1fr_auto]", "grid"],
    ["col-start-2", "grid"],
    ["overflow-y-auto", "scroll"],
    ["max-h-(--radix-select-content-available-height)", "scroll"],
    ["fixed", "owned-by-primitive"],
    ["min-w-[var(--radix-select-trigger-width)]", "owned-by-primitive"],
    ["max-w-[calc(100%-2rem)]", "no-core-feature"],
    ["underline", "no-core-feature"],
    ["-translate-x-1", "no-core-feature"],
    ["*:[span]:last:flex", "no-core-feature"],
    ["bg-bogus", "unmapped"],
  ];
  for (const [tok, reason] of cases)
    expect({ tok, reason: dropReason(tok) }).toEqual({ tok, reason });
});

test("C8: the Step 6 mappings (shadow-sm, rem lengths, destructive colours)", () => {
  expect(rewriteToken("shadow-sm")).toBe("shadow");
  expect(rewriteToken("min-w-[8rem]")).toBe("min-w-[128px]");
  expect(rewriteToken("text-destructive")).toBe("text-red-600");
  expect(rewriteToken("border-destructive")).toBe("border-red-600");
});

// Batch A (B1 to B5): the defects that pinned the avatar to 24px, dropped its size-full, and
// painted the progress track the same colour as its fill.
test("batch A: every token an expanded size-N keeps the variant prefix (B1)", () => {
  expect(rewriteLiteral("data-[size=lg]:size-10")).toBe(
    "data-[size=lg]:w-10 data-[size=lg]:h-10",
  );
  expect(rewriteLiteral("hover:size-4")).toBe("active:w-4 active:h-4");
  expect(rewriteLiteral("size-8")).toBe("w-8 h-8");
});

test("batch A: size-full, the primary/20 track and w-px map to PocketJS vocabulary (B2, B3)", () => {
  expect(rewriteLiteral("size-full")).toBe("w-full h-full");
  expect(rewriteLiteral("bg-primary/20")).toBe("bg-slate-300");
  expect(rewriteLiteral("data-[orientation=vertical]:w-px")).toBe(
    "data-[orientation=vertical]:w-[1px]",
  );
  for (const target of ["w-full h-full", "bg-slate-300", "w-[1px]"])
    expect(unknownUtilities(target)).toEqual([]);
});

test("batch A: aspect-square is owned by the primitive, not an unmapped utility (B5)", () => {
  expect(dropReason("aspect-square")).toBe("owned-by-primitive");
});

// Fractions (w-1/2, top-1/2, -translate-y-3/4) are sizes and insets, not opacity. The bug this pins: the
// /NN rule stripped every slash, so top-1/2 became top-1 (4px, not 50%) and w-3/4 became w-3 (12px, a sheet).
test("fraction family: a size, inset or translate keeps its slash; the colour alpha still drops", () => {
  const fractions = [
    "top-1/2", "left-1/2", "right-1/2", "bottom-1/2", "inset-1/2", "w-1/2", "h-1/2",
    "w-3/4", "max-w-3/4", "min-w-1/3", "basis-1/2", "-top-1/2", "-translate-x-1/2",
    "-translate-y-1/2", "translate-x-1/2", "translate-y-3/4", "data-[state=open]:w-1/3",
  ];
  for (const tok of fractions) expect({ tok, out: rewriteToken(tok) }).toEqual({ tok, out: tok });
  // The percents leave the literal and resolve per node (style/percent.ts); the token rule above is unchanged.
  const pct = rewrite("absolute top-1/2 left-1/2 -translate-y-1/2 w-3/4");
  expect(pct.text).toBe("absolute");
  expect(pct.percents.map((p) => [p.prop, p.fraction, p.of])).toEqual([
    ["insetT", 0.5, "parent"],
    ["insetL", 0.5, "parent"],
    ["translateY", -0.5, "self"],
    ["width", 0.75, "parent"],
  ]);
  const alpha: [string, string][] = [
    ["bg-primary/90", "bg-slate-900"],
    ["hover:bg-primary/90", "active:bg-slate-900"],
    ["text-muted-foreground/70", "text-slate-500"],
    ["bg-slate-900/50", "bg-slate-900"],
    ["text-sm/6", "text-sm/6"],
  ];
  for (const [from, to] of alpha) expect({ from, to: rewriteToken(from) }).toEqual({ from, to });
});

test("fraction family: a fraction is named by the drop table, never rewritten into another utility", () => {
  for (const tok of ["w-3/4", "top-1/2", "-translate-y-1/2"])
    expect(dropReason(tok)).toBe("no-core-feature");
});

// Class-level pin over the vendored corpus: every fraction a shadcn source uses comes out as itself
// (it is then named and dropped by the codemod, or kept), and no fraction is ever turned into a
// different non-empty token. Red on the old /NN rule: w-3/4 -> w-3 in the sheet and drawer sources.
test("fraction family: every fraction in the shadcn-full corpus survives the rewrite unchanged", () => {
  const dir = join(import.meta.dir, "fixtures/shadcn-full/upstream");
  const seen = new Set<string>();
  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".tsx")) continue;
    for (const tok of readFileSync(join(dir, file), "utf8").split(/[\s"'`{}]+/))
      if (/^[-a-z0-9:\[\]&>()=.]*-\d+\/\d+$/.test(tok) && !COLOUR_PREFIX.test(tok)) seen.add(tok);
  }
  expect(seen.size).toBeGreaterThanOrEqual(8);
  const changed = [...seen].filter((tok) => {
    const out = rewriteToken(tok);
    return out !== "" && out !== tok;
  });
  expect(changed).toEqual([]);
});

// Percent lengths (style/percent.ts resolves them): the core props and the signed share of the reference box.
test("percent lengths: each form names its core props, fraction and reference", () => {
  const p = (tok: string) => parsePercent(tok)?.map((x) => [x.prop, x.fraction, x.of, x.axis]);
  expect(p("w-1/2")).toEqual([["width", 0.5, "parent", "w"]]);
  expect(p("h-3/4")).toEqual([["height", 0.75, "parent", "h"]]);
  expect(p("min-w-1/3")).toEqual([["minW", 1 / 3, "parent", "w"]]);
  expect(p("max-h-2/3")).toEqual([["maxH", 2 / 3, "parent", "h"]]);
  expect(p("-top-1/4")).toEqual([["insetT", -0.25, "parent", "h"]]);
  expect(p("right-1/2")).toEqual([["insetR", 0.5, "parent", "w"]]);
  expect(p("inset-x-1/4")).toEqual([
    ["insetL", 0.25, "parent", "w"],
    ["insetR", 0.25, "parent", "w"],
  ]);
  expect(p("inset-1/2")?.map((x) => x[0])).toEqual(["insetT", "insetB", "insetL", "insetR"]);
  expect(p("-translate-y-1/2")).toEqual([["translateY", -0.5, "self", "h"]]);
  expect(p("translate-x-3/4")).toEqual([["translateX", 0.75, "self", "w"]]);
  // Not a percent: a px or scale utility, a colour alpha, a variant (named as dropped below), a zero denominator.
  for (const tok of ["w-3", "w-full", "translate-x-[10px]", "bg-slate-900/50", "hover:w-1/2", "w-1/0"])
    expect({ tok, out: p(tok) }).toEqual({ tok, out: undefined });
});

// The forms the compat layer cannot place are dropped by name, never sent to the compiler (and never throw).
test("percent lengths: an unsupported fraction is dropped and named, not compiled", () => {
  const r = rewrite("hover:w-1/2 basis-1/2 data-[state=open]:w-1/3 w-1/2");
  expect(r.text).toBe("");
  expect(r.droppedTokens).toEqual(["hover:w-1/2", "basis-1/2", "data-[state=open]:w-1/3"]);
  expect(r.percents.map((x) => x.prop)).toEqual(["width"]);
  for (const tok of r.droppedTokens) expect(dropReason(tok)).toBe("no-core-feature");
});
