import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "pocketjs-react"

const badgeVariants = cva(
  "flex shrink-0 items-center justify-center gap-1 overflow-hidden rounded-[10px] border border-transparent px-2 py-0.5 text-xs font-bold transition-colors aria-invalid:border-red-600",
  {
    variants: {
      variant: {
        default: "bg-slate-900 text-white",
        secondary:
          "bg-slate-200 text-slate-900",
        destructive:
          "bg-red-600 text-white",
        outline:
          "border-slate-200 text-slate-900",
        ghost: "",
        link: "text-slate-900",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants>) {
  const Comp = "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
