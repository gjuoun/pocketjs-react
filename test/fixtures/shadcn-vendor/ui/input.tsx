import * as React from "react"
import { cn } from "pocketjs-react"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-md border border-slate-200 bg-transparent px-3 py-1 text-base shadow transition-colors disabled:opacity-50",
        "",
        "aria-invalid:border-red-600",
        className
      )}
      {...props}
    />
  )
}

export { Input }
