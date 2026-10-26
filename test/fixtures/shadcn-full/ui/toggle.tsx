"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "pocketjs-react"
import { Toggle as TogglePrimitive } from "pocketjs-react/radix"

const toggleVariants = cva(
  "flex items-center justify-center gap-2 rounded-md text-sm font-bold transition-colors active:bg-slate-100 active:text-slate-500 disabled:opacity-50 aria-invalid:border-red-600 data-[state=on]:bg-slate-200 data-[state=on]:text-slate-900",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline:
          "border border-slate-200 bg-transparent shadow active:bg-slate-200 active:text-slate-900",
      },
      size: {
        default: "h-9 min-w-9 px-2",
        sm: "h-8 min-w-8 px-1.5",
        lg: "h-10 min-w-10 px-2.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Toggle({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> &
  VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Toggle, toggleVariants }
