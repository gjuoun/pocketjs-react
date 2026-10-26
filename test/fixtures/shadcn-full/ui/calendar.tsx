"use client"

import * as React from "react"
import { cn } from "pocketjs-react"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "pocketjs-react/glyph-icons"
import {
  DayPicker,
  getDefaultClassNames,
  type DayButton,
} from "react-day-picker"

import { Button, buttonVariants } from "./button.tsx"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"]
}) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "bg-white p-3",
        String.raw``,
        String.raw``,
        className
      )}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString("default", { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("", defaultClassNames.root),
        months: cn(
          "relative flex flex-col gap-4 md:flex-row",
          defaultClassNames.months
        ),
        month: cn("flex w-full flex-col gap-4", defaultClassNames.month),
        nav: cn(
          "absolute top-0 flex w-full items-center justify-between gap-1",
          defaultClassNames.nav
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          "p-0",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          "p-0",
          defaultClassNames.button_next
        ),
        month_caption: cn(
          "flex h-(--cell-size) w-full items-center justify-center",
          defaultClassNames.month_caption
        ),
        dropdowns: cn(
          "flex h-(--cell-size) w-full items-center justify-center gap-1.5 text-sm font-bold",
          defaultClassNames.dropdowns
        ),
        dropdown_root: cn(
          "relative rounded-md border border-slate-200 shadow",
          defaultClassNames.dropdown_root
        ),
        dropdown: cn(
          "absolute inset-0 bg-white opacity-0",
          defaultClassNames.dropdown
        ),
        caption_label: cn(
          "font-bold",
          captionLayout === "label"
            ? "text-sm"
            : "flex h-8 items-center gap-1 rounded-md pr-1 pl-2 text-sm [&>svg]:text-slate-500",
          defaultClassNames.caption_label
        ),
        month_grid: cn("w-full", defaultClassNames.month_grid),
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "flex-1 rounded-md text-slate-500",
          defaultClassNames.weekday
        ),
        week: cn("mt-2 flex w-full", defaultClassNames.week),
        week_number_header: cn(
          "w-(--cell-size)",
          defaultClassNames.week_number_header
        ),
        week_number: cn(
          "text-slate-500",
          defaultClassNames.week_number
        ),
        day: cn(
          "relative h-full w-full p-0 text-center",
          props.showWeekNumber
            ? ""
            : "",
          defaultClassNames.day
        ),
        range_start: cn(
          "bg-slate-200",
          defaultClassNames.range_start
        ),
        range_middle: cn("", defaultClassNames.range_middle),
        range_end: cn("bg-slate-200", defaultClassNames.range_end),
        today: cn(
          "rounded-md bg-slate-200 text-slate-900",
          defaultClassNames.today
        ),
        outside: cn(
          "text-slate-500",
          defaultClassNames.outside
        ),
        disabled: cn(
          "text-slate-500 opacity-50",
          defaultClassNames.disabled
        ),
        hidden: cn("", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return (
            <div
              data-slot="calendar"
              ref={rootRef}
              className={cn(className)}
              {...props}
            />
          )
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return (
              <ChevronLeftIcon className={cn("w-4 h-4", className)} {...props} />
            )
          }

          if (orientation === "right") {
            return (
              <ChevronRightIcon
                className={cn("w-4 h-4", className)}
                {...props}
              />
            )
          }

          return (
            <ChevronDownIcon className={cn("w-4 h-4", className)} {...props} />
          )
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className="flex items-center justify-center text-center">
                {children}
              </div>
            </td>
          )
        },
        ...components,
      }}
      {...props}
    />
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames()

  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        "flex w-full min-w-(--cell-size) flex-col gap-1 leading-[1] data-[range-end=true]:rounded-md data-[range-end=true]:bg-slate-900 data-[range-end=true]:text-white data-[range-middle=true]:bg-slate-200 data-[range-middle=true]:text-slate-900 data-[range-start=true]:rounded-md data-[range-start=true]:bg-slate-900 data-[range-start=true]:text-white data-[selected-single=true]:bg-slate-900 data-[selected-single=true]:text-white",
        defaultClassNames.day,
        className
      )}
      {...props}
    />
  )
}

export { Calendar, CalendarDayButton }
