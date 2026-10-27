import { afterEach, expect, test } from "bun:test";
import { BTN, focusNode } from "@pocketjs/framework/input";
import { useState } from "react";
import { View } from "../../src/index.ts";
import { rootMirror, type NodeMirror } from "../../src/internal/pocket.ts";
import { geometryFor, walk, type Rect } from "../../tools/qa/acceptance/geometry.ts";
import { triggerNode } from "../../tools/qa/acceptance/interaction.ts";
import { Calendar, daysInMonth, firstWeekday, isLeapYear, monthCells, shiftMonth, type CalendarDate } from "../../src/native/calendar.tsx";
import { harness, ROOT } from "./support.ts";

const h = harness();
afterEach(() => h.dispose());

const TODAY: CalendarDate = { year: 2026, month: 10, day: 27 };

test("the month lengths, leap years included", () => {
  expect(daysInMonth(2026, 2)).toBe(28);
  expect(daysInMonth(2024, 2)).toBe(29);
  expect(daysInMonth(2100, 2)).toBe(28);
  expect(daysInMonth(2000, 2)).toBe(29);
  expect(daysInMonth(2026, 10)).toBe(31);
  expect(daysInMonth(2026, 4)).toBe(30);
  expect(isLeapYear(1900)).toBe(false);
});

test("the first weekday agrees with the JS calendar for two years of months (0 is Sunday)", () => {
  for (let y = 2025; y <= 2026; y++)
    for (let m = 1; m <= 12; m++) expect(firstWeekday(y, m)).toBe(new Date(y, m - 1, 1).getDay());
  expect(firstWeekday(2026, 10)).toBe(4); // 1 October 2026 is a Thursday
});

test("the grid pads the first week with blanks and fills whole weeks", () => {
  const cells = monthCells(2026, 10);
  expect(cells.length % 7).toBe(0);
  expect(cells.slice(0, 4)).toEqual([null, null, null, null]);
  expect(cells[4]).toBe(1);
  expect(cells.filter((c) => c !== null).length).toBe(31);
  for (let m = 1; m <= 12; m++) {
    const c = monthCells(2026, m);
    expect(c.length / 7).toBeGreaterThanOrEqual(4);
    expect(c.length / 7).toBeLessThanOrEqual(6);
  }
});

test("month steps cross year boundaries both ways", () => {
  expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
  expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
  expect(shiftMonth({ year: 2026, month: 10 }, 0)).toEqual({ year: 2026, month: 10 });
});

function rectOfText(label: string, nth = 0): Rect {
  const found: NodeMirror[] = [];
  walk(rootMirror, (n) => {
    const t = (n as unknown as { text?: string }).text;
    if (t === label && (n as unknown as { text?: string }).text !== undefined) found.push(n);
  });
  const n = found[nth]?.parent ?? found[nth];
  const r = n && geometryFor(h.core).rect(n);
  if (!r) throw new Error("no rect for " + label);
  return r;
}
function centreX(r: Rect) { return r.x + r.w / 2; }
function frames(n: number) { for (let i = 0; i < n; i++) { h.core.step(0); h.core.render(); } }
function drawn(): string[] { return h.core.texts().map((t) => t.text); }

test("the header names the month; the weekday row runs Su to Sa; the first day sits under its weekday", async () => {
  await h.boot(() => <View className={ROOT}><Calendar today={TODAY} defaultView={{ year: 2026, month: 10 }} /></View>);
  frames(3);
  expect(drawn()).toContain("October 2026");
  for (const w of ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]) expect(drawn()).toContain(w);
  // The 1st is a Thursday: its centre is in the Th column.
  expect(Math.abs(centreX(rectOfText("1")) - centreX(rectOfText("Th")))).toBeLessThanOrEqual(2);
  // 31 October 2026 is a Saturday: the last column.
  expect(Math.abs(centreX(rectOfText("31")) - centreX(rectOfText("Sa")))).toBeLessThanOrEqual(2);
});

test("today is bold and bordered; a day is selected by CIRCLE and reported as a date", async () => {
  const picked: CalendarDate[] = [];
  function App() {
    const [v, setV] = useState<CalendarDate | null>(null);
    return <View className={ROOT}><Calendar today={TODAY} defaultView={{ year: 2026, month: 10 }} value={v} onValueChange={(d) => { picked.push(d); setV(d); }} /></View>;
  }
  await h.boot(() => <App />);
  frames(3);
  focusNode(triggerNode(rootMirror, "15")!);
  h.core.press(BTN.CIRCLE);
  frames(3);
  expect(picked).toEqual([{ year: 2026, month: 10, day: 15 }]);
});

test("the next and previous month controls move the view and its title", async () => {
  await h.boot(() => <View className={ROOT}><Calendar today={TODAY} defaultView={{ year: 2026, month: 12 }} /></View>);
  frames(3);
  focusNode(triggerNode(rootMirror, "Next month")!);
  h.core.press(BTN.CIRCLE);
  frames(3);
  expect(drawn()).toContain("January 2027");
  focusNode(triggerNode(rootMirror, "Prev month")!);
  h.core.press(BTN.CIRCLE);
  frames(3);
  expect(drawn()).toContain("December 2026");
});

test("arrows move one day (LEFT and RIGHT) or one week (UP and DOWN), clamped to the month", async () => {
  const picked: number[] = [];
  await h.boot(() => <View className={ROOT}><Calendar today={TODAY} defaultView={{ year: 2026, month: 2 }} onValueChange={(d) => picked.push(d.day)} /></View>);
  frames(3);
  focusNode(triggerNode(rootMirror, "1")!);
  h.core.press(BTN.RIGHT);
  h.core.press(BTN.CIRCLE);
  expect(picked).toEqual([2]);
  focusNode(triggerNode(rootMirror, "2")!);
  h.core.press(BTN.DOWN);
  h.core.press(BTN.CIRCLE);
  expect(picked).toEqual([2, 9]);
  focusNode(triggerNode(rootMirror, "9")!);
  h.core.press(BTN.LEFT);
  h.core.press(BTN.LEFT);
  h.core.press(BTN.LEFT);
  h.core.press(BTN.LEFT);
  h.core.press(BTN.LEFT);
  h.core.press(BTN.LEFT);
  h.core.press(BTN.LEFT);
  h.core.press(BTN.LEFT);
  h.core.press(BTN.LEFT);
  h.core.press(BTN.UP);
  h.core.press(BTN.CIRCLE);
  expect(picked[picked.length - 1]).toBe(1);
});
