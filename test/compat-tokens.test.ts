// The C2 token map's contract: every target is real PocketJS vocabulary (so a rewritten
// literal compiles), the audit's 7 core shadcn literals rewrite to 6 compilable strings plus
// the known Dialog gap, and rewriting is idempotent and whitespace-normalizing.
import { expect, test } from "bun:test";
import { parseClassLiteral, unknownUtilities } from "../src/internal/pocket.ts";
import { rewrite, rewriteLiteral, rewriteToken, TOKEN_MAP } from "../src/compat/tokens.ts";

const BUTTON_BASE = "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";
const BUTTON_DEFAULT = "bg-primary text-primary-foreground hover:bg-primary/90";
const BUTTON_SIZE = "h-9 px-4 py-2 has-[>svg]:px-3";
const BADGE_BASE = "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3";
const INPUT = "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors outline-none";
const DIALOG = "fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-background p-6 shadow-lg duration-200 outline-none sm:max-w-lg";

const LITERALS: [string, string][] = [
  ["v4 button base", BUTTON_BASE],
  ["v4 button default", BUTTON_DEFAULT],
  ["v4 button size default", BUTTON_SIZE],
  ["v4 badge base", BADGE_BASE],
  ["v4 badge default", "bg-primary text-primary-foreground [a&]:hover:bg-primary/90"],
  ["v4 input", INPUT],
  ["v4 dialog content", DIALOG],
];

test("every map target is real PocketJS vocabulary", () => {
  for (const [from, to] of Object.entries(TOKEN_MAP)) {
    if (to === "") continue;
    for (const tok of to.split(" ")) {
      expect({ from, tok, unknown: unknownUtilities(tok) }).toEqual({ from, tok, unknown: [] });
      expect({ from, tok, parsed: parseClassLiteral(tok) !== null }).toEqual({ from, tok, parsed: true });
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
    ["focus-visible:border-ring", "focus:border-slate-900"],
    ["focus-visible:ring-ring/50", ""],
    ["dark:aria-invalid:ring-destructive/40", ""],
    ["disabled:opacity-50", ""],
    ["[&_svg]:shrink-0", ""],
    ["has-[>svg]:px-3", ""],
    ["ring-destructive/20", ""],
    ["rounded-full", ""],
    ["underline", ""],
    ["flex", "flex"],
    ["bg-slate-900", "bg-slate-900"],
  ];
  for (const [from, to] of cases) expect({ from, to: rewriteToken(from) }).toEqual({ from, to });
});

test("the button base decomposes the C1 baseline: 6 mapped + 13 dropped = 19", () => {
  // The cva literal the fixture renders: base 22 + default 3 + size-default 4 tokens.
  const full = [BUTTON_BASE, BUTTON_DEFAULT, BUTTON_SIZE].join(" ");
  expect(rewrite(full)).toEqual({
    text: "flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-bold transition-all focus:border-slate-900 bg-slate-900 text-white active:bg-slate-900 h-9 px-4 py-2",
    mapped: 6,
    dropped: 13,
  });
});

test("the button default variant rewrites to slate-900 / white / active slate-900", () => {
  expect(rewriteLiteral(BUTTON_DEFAULT)).toBe("bg-slate-900 text-white active:bg-slate-900");
});

test("the audit's 7 literals: 6 compile after the map, the Dialog core gap stays", () => {
  for (const [label, lit] of LITERALS) {
    const out = rewriteLiteral(lit);
    const compiled = parseClassLiteral(out) !== null;
    const expected = label !== "v4 dialog content";
    expect({ label, compiled, text: out }).toEqual({ label, compiled, text: out });
    expect({ label, compiled }).toEqual({ label, compiled: expected });
  }
  // The Dialog residue names exactly what only a core change can fix (L3-d, C10).
  expect(rewriteLiteral(DIALOG)).toBe(
    "fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-white p-6 shadow-lg duration-200",
  );
});

test("rewriting is idempotent and normalizes whitespace", () => {
  const corpus = [...LITERALS.map(([, lit]) => lit), ...Object.keys(TOKEN_MAP), ...Object.values(TOKEN_MAP)];
  for (const lit of corpus) {
    const once = rewriteLiteral(lit);
    expect({ lit, twice: rewriteLiteral(once) }).toEqual({ lit, twice: once });
  }
  expect(rewriteLiteral("  bg-primary   text-white  ")).toBe("bg-slate-900 text-white");
  expect(rewriteLiteral("")).toBe("");
});
