// The C2 token map's contract: every target is real PocketJS vocabulary (so a rewritten
// literal compiles), the audit's 7 core shadcn literals rewrite to 6 compilable strings plus
// the known Dialog gap, and rewriting is idempotent and whitespace-normalizing.
import { expect, test } from "bun:test";
import {
  type DropReason,
  dropReason,
  rewrite,
  rewriteLiteral,
  rewriteToken,
  TOKEN_MAP,
} from "../src/compat/tokens.ts";
import { bodiesOnly, splitSelector } from "../src/compat/selectors.ts";
import { parseClassLiteral, unknownUtilities } from "../src/internal/pocket.ts";

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
