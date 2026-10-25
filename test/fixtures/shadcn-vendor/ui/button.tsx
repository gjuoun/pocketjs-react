import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "pocketjs-react"

const buttonVariants = cva(
  "flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-bold transition-all disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-slate-900 text-white active:bg-slate-900",
        destructive:
          "bg-red-600 text-white active:bg-red-600",
        outline:
          "border bg-white shadow active:bg-slate-200 active:text-slate-900",
        secondary:
          "bg-slate-200 text-slate-900 active:bg-slate-200",
        ghost:
          "active:bg-slate-200 active:text-slate-900",
        link: "text-slate-900",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5",
        sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "w-9 h-9",
        "icon-xs": "w-6 h-6 rounded-md",
        "icon-sm": "w-8 h-8",
        "icon-lg": "w-10 h-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants>) {
  const Comp = "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
