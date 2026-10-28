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
// the checkbox to 121, the switch to 128 and the radio group to 130 the select (with the chevron) to 139 the slider (eleven fill and thumb stops) to 168 the accordion (with its chevron turns) to 170; the badge's opaque border per variant (border-red-600, dark border-white) to 171; the sheet (its docked panel and side keys) to 172; the popover (a 220 px panel, p-3) to 174; the tooltip, dropdown menu (its own keys, existing utilities) and toast (bottom-0, a 280 px item) to 176; the table (its cell clip and the text tints) to 177; the spinner's eighteen arc-start steps, 20 degrees apart (one revolution in 90 frames), to 187; the spinner's timeline (arc-start-[0] and animate-spin-arc in three sizes) replaces the steps, to 206. Phase 4 adds eight components (breadcrumb, alert with its four variant fills, empty, field with the invalid border, pagination, input-otp, navigation menu, command) and their light and dark keys, to 214. The budget is the count at the last green step.
// Phase 5: the sidebar adds none; the resizable adds two (its grip's slate-600 text and the dark divider's slate-600 border), to 216;
// the carousel adds three (its 168 px slide and viewport widths and the 96 px height, and its left-[-168px] entry), to 219;
// the calendar adds two (its 36 px day cells, w-9, and its 28 px rows, h-7), to 221;
// the combobox's wide popover panel adds one (w-[264px]), to 222.
const BUDGET = 206;
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
