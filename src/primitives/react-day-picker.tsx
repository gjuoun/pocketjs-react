// react-day-picker shim (batch 4, R9): DayPicker as one month grid on the native View, with no date-fns and no npm package.
// Seven columns of equal width (flex-grow 1), Sunday first, one row per week, outside days shown when showOutsideDays is on.
// components.Root, Chevron, DayButton and WeekNumber are used when the caller gives them (the vendored calendar does).
// Named boundaries (throw): multiple and range modes, numberOfMonths above 1, and the dropdown caption layout. Month
// navigation moves one month per chevron press.
import { type ComponentType, type ReactNode, useState } from "react";
import { View } from "../elements.ts";
import { cn } from "../style/cn.ts";
import { Pressable } from "./press.tsx";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function getDefaultClassNames(): Record<string, string> {
  return {};
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** The 5 or 6 weeks that show a month, Sunday first; days outside the month are kept when asked. */
export function monthWeeks(month: Date, showOutsideDays: boolean): Date[][] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  const weeks: Date[][] = [];
  const cursor = new Date(start);
  for (let w = 0; w < 6; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    if (w >= 4 && week[0].getMonth() !== month.getMonth()) break;
    weeks.push(week);
  }
  return showOutsideDays
    ? weeks
    : weeks.map(
        (week) =>
          week.map((d) =>
            d.getMonth() === month.getMonth() ? d : null,
          ) as Date[],
      );
}

type Components = Partial<
  Record<"Root" | "Chevron" | "DayButton" | "WeekNumber", ComponentType<any>>
>;

export interface DayPickerProps {
  mode?: "single" | "multiple" | "range";
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  month?: Date;
  defaultMonth?: Date;
  numberOfMonths?: number;
  showOutsideDays?: boolean;
  captionLayout?: string;
  className?: string;
  classNames?: Record<string, string>;
  components?: Components;
  formatters?: Record<string, unknown>;
  [prop: string]: unknown;
}

export function DayPicker(props: DayPickerProps) {
  if (props.mode !== undefined && props.mode !== "single")
    throw new Error(
      'pocketjs-react: react-day-picker mode "' +
        props.mode +
        '" is not supported (single only)',
    );
  if ((props.numberOfMonths ?? 1) !== 1)
    throw new Error(
      "pocketjs-react: react-day-picker numberOfMonths above 1 is not supported",
    );
  if (props.captionLayout !== undefined && props.captionLayout !== "label")
    throw new Error(
      'pocketjs-react: react-day-picker captionLayout "' +
        props.captionLayout +
        '" is not supported (label only)',
    );
  const [shown, setShown] = useState<Date>(
    props.month ?? props.defaultMonth ?? props.selected ?? new Date(),
  );
  const month = props.month ?? shown;
  const components = props.components ?? {};
  const showOutside = props.showOutsideDays ?? true;
  const weeks = monthWeeks(month, showOutside);
  const shift = (delta: number) =>
    setShown(new Date(month.getFullYear(), month.getMonth() + delta, 1));
  const Chevron = components.Chevron;
  const DayButton = components.DayButton;
  const Root = components.Root;
  const body = (
    <>
      <View className="flex-row items-center justify-between">
        <Pressable onPress={() => shift(-1)}>
          {Chevron ? <Chevron orientation="left" /> : "<"}
        </Pressable>
        <View className="text-center">
          {month.toLocaleString("en-US", { month: "long" }) +
            " " +
            month.getFullYear()}
        </View>
        <Pressable onPress={() => shift(1)}>
          {Chevron ? <Chevron orientation="right" /> : ">"}
        </Pressable>
      </View>
      <View className="flex-row">
        {WEEKDAYS.map((d) => (
          <View
            key={d}
            className="flex-1 items-center"
            style={{ flexGrow: 1, flexBasis: 0 } as never}
          >
            {d}
          </View>
        ))}
      </View>
      {weeks.map((week, w) => (
        <View key={w} className="flex-row">
          {week.map((date, i) => {
            if (date === null)
              return (
                <View
                  key={i}
                  className="flex-1"
                  style={{ flexGrow: 1, flexBasis: 0 } as never}
                />
              );
            const outside = date.getMonth() !== month.getMonth();
            const selected =
              props.selected !== undefined && sameDay(date, props.selected);
            const modifiers = {
              selected,
              outside,
              today: sameDay(date, new Date()),
              disabled: false,
              focused: false,
              hidden: false,
            };
            const onClick = () => props.onSelect?.(new Date(date));
            const cell = DayButton ? (
              <DayButton
                day={{ date }}
                modifiers={modifiers}
                onClick={onClick}
                className=""
              >
                {date.getDate()}
              </DayButton>
            ) : (
              <Pressable className="items-center" onPress={onClick}>
                {String(date.getDate())}
              </Pressable>
            );
            return (
              <View
                key={i}
                className="flex-1 items-center"
                style={{ flexGrow: 1, flexBasis: 0 } as never}
              >
                {cell}
              </View>
            );
          })}
        </View>
      ))}
    </>
  );
  if (Root) return <Root className={props.className}>{body}</Root>;
  return <View className={cn("flex-col w-full", props.className)}>{body}</View>;
}
