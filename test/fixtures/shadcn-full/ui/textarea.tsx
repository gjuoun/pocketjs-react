import * as React from "react"
import { cn } from "pocketjs-react"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-16 w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-base shadow transition-colors disabled:opacity-50 aria-invalid:border-red-600",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
