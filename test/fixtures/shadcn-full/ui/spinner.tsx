import { cn } from "pocketjs-react"
import { Loader2Icon } from "pocketjs-react/glyph-icons"

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <Loader2Icon
      role="status"
      aria-label="Loading"
      className={cn("w-4 h-4 animate-spin", className)}
      {...props}
    />
  )
}

export { Spinner }
