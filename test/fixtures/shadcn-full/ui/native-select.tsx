import * as React from "react"
import { cn } from "pocketjs-react"
import { ChevronDownIcon } from "pocketjs-react/glyph-icons"

function NativeSelect({
  className,
  size = "default",
  ...props
}: Omit<React.ComponentProps<"select">, "size"> & { size?: "sm" | "default" }) {
  return (
    <div
      className="relative"
      data-slot="native-select-wrapper"
    >
      <select
        data-slot="native-select"
        data-size={size}
        className={cn(
          "h-9 w-full min-w-0 rounded-md border border-slate-200 bg-transparent px-3 py-2 pr-9 text-sm shadow transition-colors data-[size=sm]:h-8 data-[size=sm]:py-1",
          "",
          "aria-invalid:border-red-600",
          className
        )}
        {...props}
      />
      <ChevronDownIcon
        className="absolute top-1 right-3.5 w-4 h-4 text-slate-500 opacity-50"
        aria-hidden="true"
        data-slot="native-select-icon"
      />
    </div>
  )
}

function NativeSelectOption({
  className,
  ...props
}: React.ComponentProps<"option">) {
  return (
    <option
      data-slot="native-select-option"
      className={cn("", className)}
      {...props}
    />
  )
}

function NativeSelectOptGroup({
  className,
  ...props
}: React.ComponentProps<"optgroup">) {
  return (
    <optgroup
      data-slot="native-select-optgroup"
      className={cn("", className)}
      {...props}
    />
  )
}

export { NativeSelect, NativeSelectOptGroup, NativeSelectOption }
