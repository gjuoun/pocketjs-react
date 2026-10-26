import { cn } from "pocketjs-react"

function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "flex h-5 min-w-5 items-center justify-center gap-1 rounded-sm bg-slate-100 px-1 text-xs font-bold text-slate-500",
        "",
        "",
        className
      )}
      {...props}
    />
  )
}

function KbdGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <kbd
      data-slot="kbd-group"
      className={cn("flex items-center gap-1", className)}
      {...props}
    />
  )
}

export { Kbd, KbdGroup }
