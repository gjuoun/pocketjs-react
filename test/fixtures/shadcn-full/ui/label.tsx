"use client"

import * as React from "react"
import { cn } from "pocketjs-react"
import { Label as LabelPrimitive } from "pocketjs-react/radix"

function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm leading-[1] font-bold",
        className
      )}
      {...props}
    />
  )
}

export { Label }
