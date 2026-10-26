import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "pocketjs-react"

import { Separator } from "./separator.tsx"

const buttonGroupVariants = cva(
  "flex items-stretch",
  {
    variants: {
      orientation: {
        horizontal:
          "",
        vertical:
          "flex-col",
      },
    },
    defaultVariants: {
      orientation: "horizontal",
    },
  }
)

function ButtonGroup({
  className,
  orientation,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof buttonGroupVariants>) {
  return (
    <div
      role="group"
      data-slot="button-group"
      data-orientation={orientation}
      className={cn(buttonGroupVariants({ orientation }), className)}
      {...props}
    />
  )
}

function ButtonGroupText({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const Comp = "div"

  return (
    <Comp
      className={cn(
        "flex items-center gap-2 rounded-md border bg-slate-100 px-4 text-sm font-bold shadow",
        className
      )}
      {...props}
    />
  )
}

function ButtonGroupSeparator({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="button-group-separator"
      orientation={orientation}
      className={cn(
        "relative",
        className
      )}
      {...props}
    />
  )
}

export {
  ButtonGroup,
  ButtonGroupSeparator,
  ButtonGroupText,
  buttonGroupVariants,
}
