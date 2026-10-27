import { expect, test } from "bun:test";
import { rewrite } from "../../src/compat/tokens.ts";
import { unknownUtilities } from "../../src/internal/pocket.ts";
import { TOKENS, type TokenKey } from "../../src/native/tokens.ts";

const REJECT = ["ring-2", "underline", "shadow-sm", "text-3xl", "leading-tight", "bg-slate-950/60", "cursor-pointer", "hover:bg-slate-800", "disabled:opacity-50", "focus:outline-none", "border-b", "border-l", "select-none"];
const values = Object.values(TOKENS) as string[];

test("every token literal compiles on the core (empty unknownUtilities)", () => {
  for (const literal of values) expect(unknownUtilities(literal)).toEqual([]);
});

test("the build rewrite is an identity on every token (no C2 mapping changes a look)", () => {
  for (const literal of values) expect(rewrite(literal).text).toBe(literal);
});

test("the vocabulary holds at most 80 distinct utilities", () => {
  const distinct = new Set(values.flatMap((l) => l.split(/\s+/).filter(Boolean)));
  expect(distinct.size).toBeLessThanOrEqual(80);
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
