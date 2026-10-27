import { afterEach, expect, test } from "bun:test";
import { BTN, focusNode } from "@pocketjs/framework/input";
import { rootMirror } from "../../src/internal/pocket.ts";
import { View } from "../../src/index.ts";
import { ThemeProvider } from "../../src/native/theme.tsx";
import { triggerNode } from "../../tools/qa/acceptance/interaction.ts";
import { harness, inkAgainst, ROOT, settle, tick } from "./support.ts";

const h = harness();
afterEach(() => h.dispose());
const runOf = (text: string) => h.core.texts().find((t) => t.text === text)!;
const control = (label: string) => triggerNode(rootMirror, label);
async function press(key: number) { h.core.press(key); await tick(); await settle(h.core); }
/** WCAG contrast ratio of two #rrggbb colours. */
function ratio(a: string, b: string): number {
  const lum = (hex: string) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

import { getFocused } from "@pocketjs/framework/input";
import { activeField, insertText } from "../../src/input/text-field.ts";
import { Command, filterGroups, matches } from "../../src/native/command.tsx";
import type { CommandGroup } from "../../src/native/command.tsx";

const GROUPS: CommandGroup[] = [
  { heading: "Suggestions", items: [{ value: "calendar", label: "Calendar" }, { value: "mail", label: "Mail" }] },
  { heading: "Tools", items: [{ value: "calc", label: "Calculator" }, { value: "notes", label: "Notes" }] },
];

function App(props: { picks: string[] }) {
  return <View className={ROOT}><Command groups={GROUPS} onSelect={(v) => props.picks.push(v)} /></View>;
}

test("matches is a case-insensitive substring test; filterGroups drops a heading with no match", () => {
  expect(matches("Calendar", "CAL")).toBe(true);
  expect(matches("Calendar", "")).toBe(true);
  expect(matches("Mail", "cal")).toBe(false);
  expect(filterGroups(GROUPS, "cal").map((g) => g.heading)).toEqual(["Suggestions", "Tools"]);
  expect(filterGroups(GROUPS, "mail").map((g) => g.heading)).toEqual(["Suggestions"]);
  expect(filterGroups(GROUPS, "zzz")).toEqual([]);
});

test("the groups draw their headings and items; the input draws its placeholder", async () => {
  await h.boot(() => <App picks={[]} />);
  const drawn = h.core.texts().map((t) => t.text);
  for (const t of ["Search", "Suggestions", "Tools", "Calendar", "Notes"]) expect(drawn).toContain(t);
});

test("typing filters the list: a non-matching item leaves the screen and a group with no match goes with it", async () => {
  await h.boot(() => <App picks={[]} />);
  focusNode(triggerNode(rootMirror, "Search") as never);
  await press(BTN.CIRCLE);
  insertText(activeField()!, "cal");
  await settle(h.core);
  const drawn = h.core.texts().map((t) => t.text);
  expect(drawn).toContain("Calculator");
  expect(drawn).not.toContain("Mail");
  expect(drawn).not.toContain("Notes");
});

test("a query with no match draws the empty line", async () => {
  await h.boot(() => <App picks={[]} />);
  focusNode(triggerNode(rootMirror, "Search") as never);
  await press(BTN.CIRCLE);
  insertText(activeField()!, "zzz");
  await settle(h.core);
  expect(h.core.texts().map((t) => t.text)).toContain("No results.");
});

test("DOWN from the input enters the list; DOWN steps and wraps; UP from the first item wraps to the last", async () => {
  await h.boot(() => <App picks={[]} />);
  focusNode(triggerNode(rootMirror, "Search") as never);
  await press(BTN.DOWN);
  expect(getFocused()).toBe(triggerNode(rootMirror, "Calendar") as never);
  await press(BTN.DOWN); await press(BTN.DOWN); await press(BTN.DOWN);
  expect(getFocused()).toBe(triggerNode(rootMirror, "Notes") as never);
  await press(BTN.DOWN);
  expect(getFocused()).toBe(triggerNode(rootMirror, "Calendar") as never);
  await press(BTN.UP);
  expect(getFocused()).toBe(triggerNode(rootMirror, "Notes") as never);
});

test("CIRCLE on an item reports its value (Enter to select)", async () => {
  const picks: string[] = [];
  await h.boot(() => <App picks={picks} />);
  focusNode(triggerNode(rootMirror, "Mail") as never);
  await press(BTN.CIRCLE);
  expect(picks).toEqual(["mail"]);
});

test("group headings are drawn in slate-500 (4.76:1 on white)", async () => {
  await h.boot(() => <App picks={[]} />);
  expect(inkAgainst(h.core, h.core.texts().find((t) => t.text === "Tools")!)).toBe("#64748b");
});
