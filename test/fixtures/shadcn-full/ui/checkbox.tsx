"use client"

import * as React from "react"
import { cn } from "pocketjs-react"
import { CheckIcon } from "pocketjs-react/glyph-icons"
import { Checkbox as CheckboxPrimitive } from "pocketjs-react/radix"

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "w-4 h-4 shrink-0 rounded-[4px] border border-slate-200 shadow disabled:opacity-50 aria-invalid:border-red-600 data-[state=checked]:bg-slate-900 data-[state=checked]:text-white",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex flex-col"
      >
        <CheckIcon className="w-3.5 h-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
