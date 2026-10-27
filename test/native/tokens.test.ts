import { expect, test } from "bun:test";
import { rewrite } from "../../src/compat/tokens.ts";
import { unknownUtilities } from "../../src/internal/pocket.ts";
import { THEMES, TOKENS, type TokenKey } from "../../src/native/tokens.ts";

// rounded-full is rejected too: the compat rewrite drops it, so a circle is rounded-[Npx] at half the size.
const REJECT = ["ring-2", "underline", "shadow-sm", "text-3xl", "leading-tight", "bg-slate-950/60", "cursor-pointer", "hover:bg-slate-800", "disabled:opacity-50", "focus:outline-none", "border-b", "border-l", "select-none", "rounded-full"];
const values = [...Object.values(TOKENS), ...Object.values(THEMES.dark)] as string[];

test("every token literal compiles on the core (empty unknownUtilities)", () => {
  for (const literal of values) expect(unknownUtilities(literal)).toEqual([]);
});

test("the build rewrite is an identity on every token (no C2 mapping changes a look)", () => {
  for (const literal of values) expect(rewrite(literal).text).toBe(literal);
});

// Phase 0 held 80; Phase 1 adds seven families and the dark table (91 distinct utilities with both themes).
// Phase 2 tracks the measured count at each step: eight spinner arc-start steps and the skeleton pulse take it to 101,
// the checkbox to 121, the switch to 128 and the radio group to 130 the select (with the chevron) to 139 the slider (eleven fill and thumb stops) to 168 the accordion (with its chevron turns) to 170; the badge's opaque border per variant (border-red-600, dark border-white) to 171. The budget is the count at the last green step.
const BUDGET = 171;
test("the vocabulary holds at most " + BUDGET + " distinct utilities, light and dark together", () => {
  const distinct = new Set(values.flatMap((l) => l.split(/\s+/).filter(Boolean)));
  expect(distinct.size).toBeLessThanOrEqual(BUDGET);
});

test("the dark table has every key of the light table (a theme switch cannot miss a key)", () => {
  expect(Object.keys(THEMES.dark).sort()).toEqual(Object.keys(TOKENS).sort());
});

test("no rejected utility appears in the vocabulary", () => {
  const all = values.join(" ").split(/\s+/);
  for (const bad of REJECT) expect(all).not.toContain(bad);
});

test("placeholder text uses slate-500 (4.76:1); slate-400 is not in the vocabulary", () => {
  expect(values.join(" ")).not.toContain("text-slate-400");
  expect(TOKENS["field.placeholder"]).toContain("text-slate-500");
});

test("token keys are typed by name", () => { const k: TokenKey = "button.default.rest"; expect(typeof TOKENS[k]).toBe("string"); });
