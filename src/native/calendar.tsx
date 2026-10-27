// Calendar: a month grid built in the library, with no date library. A date is { year, month, day } (month 1 to 12).
// daysInMonth, firstWeekday (0 is Sunday, by the Sakamoto rule) and monthCells are plain arithmetic: leading blank cells
// pad the first week, and the grid has as many weeks as the month needs (4 to 6). Controlled, or uncontrolled with defaults:
// view ({ year, month }, with onViewChange) and value (a date or null, with onValueChange). today is drawn bold with a border
// (default: the local date); the selected day is filled. Prev month and Next month move the view; CIRCLE on a day selects it.
// Keyboard: LEFT and RIGHT move one day, UP and DOWN move one week, clamped to the month (no wrap) and never leaving the grid.
import { useLayoutEffect, useRef } from "react";
import { focusNode, getFocused, pushFocusController, type FocusDirection } from "@pocketjs/framework/input";
import { Text, View } from "../elements.ts";
import type { NodeMirror } from "../internal/pocket.ts";
import { useControllableState } from "../primitives/state.ts";
import { Focusable } from "./focusable.tsx";
import { useTokens } from "./theme.tsx";

export interface CalendarDate {
  year: number;
  /** 1 to 12. */
  month: number;
  day: number;
}

export interface CalendarMonth {
  year: number;
  month: number;
}

export const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  return [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

/** The weekday of the 1st of the month, 0 for Sunday through 6 for Saturday (Sakamoto's rule). */
export function firstWeekday(year: number, month: number): number {
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  const y = month < 3 ? year - 1 : year;
  return (y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) + t[month - 1] + 1) % 7;
}

/** The month's cells in order: leading blanks (null), the day numbers, and trailing blanks to a whole week. */
export function monthCells(year: number, month: number): Array<number | null> {
  const cells: Array<number | null> = Array.from({ length: firstWeekday(year, month) }, () => null);
  for (let d = 1; d <= daysInMonth(year, month); d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/** The month one step away (negative steps go back), across year boundaries. */
export function shiftMonth(view: CalendarMonth, step: number): CalendarMonth {
  const index = view.year * 12 + (view.month - 1) + step;
  return { year: Math.floor(index / 12), month: (((index % 12) + 12) % 12) + 1 };
}

function localToday(): CalendarDate {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

export interface CalendarProps {
  view?: CalendarMonth;
  defaultView?: CalendarMonth;
  onViewChange?: (view: CalendarMonth) => void;
  value?: CalendarDate | null;
  defaultValue?: CalendarDate | null;
  onValueChange?: (value: CalendarDate) => void;
  /** The day drawn as today (default: the local date). */
  today?: CalendarDate;
}

const sameMonth = (a: CalendarMonth, b: CalendarMonth) => a.year === b.year && a.month === b.month;

export function Calendar(props: CalendarProps) {
  const T = useTokens() as Record<string, string>;
  const today = props.today ?? localToday();
  const [view, setView] = useControllableState<CalendarMonth>(props.view, props.defaultView ?? { year: today.year, month: today.month }, props.onViewChange);
  // A day is only ever chosen, never cleared, so the change always carries a date.
  const [value, select] = useControllableState<CalendarDate | null>(props.value, props.defaultValue ?? null, (next) => {
    if (next !== null) props.onValueChange?.(next);
  });
  const root = useRef<NodeMirror | null>(null);
  const days = useRef(new Map<number, NodeMirror>());
  const count = daysInMonth(view.year, view.month);
  const latest = useRef({ count, view, select });
  latest.current = { count, view, select };

  useLayoutEffect(() => {
    if (!root.current) return;
    return pushFocusController(root.current as never, (direction: FocusDirection) => {
      const step = direction === "left" ? -1 : direction === "right" ? 1 : direction === "up" ? -7 : direction === "down" ? 7 : 0;
      if (step === 0) return false;
      const focused = getFocused() as unknown as NodeMirror;
      let at = -1;
      for (const [d, node] of days.current) if (node === focused) at = d;
      if (at < 0) return false;
      const next = Math.min(latest.current.count, Math.max(1, at + step));
      if (next !== at) focusNode(days.current.get(next) as never);
      return true;
    });
  }, []);

  const weeks: Array<Array<number | null>> = [];
  const cells = monthCells(view.year, view.month);
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  const nav = [T["calendar.nav"], T["calendar.nav.idle"], T["calendar.focus"], T["calendar.press"]].join(" ");

  return (
    <View className={T["calendar.root"]} ref={root as never} debugName="calendar">
      <View className={T["calendar.header"]}>
        <Focusable look={nav} onPress={() => setView(shiftMonth(view, -1))}>
          <Text className={T["calendar.nav.text"]}>Prev month</Text>
        </Focusable>
        <Text className={T["calendar.title"]}>{MONTH_NAMES[view.month - 1] + " " + view.year}</Text>
        <Focusable look={nav} onPress={() => setView(shiftMonth(view, 1))}>
          <Text className={T["calendar.nav.text"]}>Next month</Text>
        </Focusable>
      </View>
      <View className={T["calendar.row"]}>
        {WEEKDAYS.map((w) => (
          <View key={w} className={T["calendar.cell"]}>
            <Text className={T["calendar.weekday"]}>{w}</Text>
          </View>
        ))}
      </View>
      {weeks.map((week, r) => (
        <View key={r} className={T["calendar.row"]}>
          {week.map((d, c) => {
            if (d === null) return <View key={c} className={T["calendar.cell"]} />;
            const picked = value !== null && value.year === view.year && value.month === view.month && value.day === d;
            const isToday = sameMonth(today, view) && today.day === d;
            const look = [T["calendar.day"], T["calendar.focus"], T["calendar.press"], T[picked ? "calendar.selected" : isToday ? "calendar.today" : "calendar.idle"]].join(" ");
            const text = T[picked ? "calendar.selected.text" : isToday ? "calendar.today.text" : "calendar.day.text"];
            return (
              <Focusable
                key={c}
                look={look}
                nodeRef={(n: NodeMirror | null) => { if (n) days.current.set(d, n); else days.current.delete(d); }}
                onPress={() => latest.current.select({ year: view.year, month: view.month, day: d })}
              >
                <Text className={text}>{String(d)}</Text>
              </Focusable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
