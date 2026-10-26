import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "pocketjs-react"

function BubbleGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="bubble-group"
      className={cn("flex min-w-0 flex-col gap-2", className)}
      {...props}
    />
  )
}

const bubbleVariants = cva(
  "relative flex min-w-0 flex-col gap-1",
  {
    variants: {
      variant: {
        default:
          "",
        secondary:
          "",
        muted:
          "",
        tinted:
          "",
        outline:
          "",
        ghost:
          "",
        destructive:
          "",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Bubble({
  variant = "default",
  align = "start",
  className,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof bubbleVariants> & {
    align?: "start" | "end"
  }) {
  return (
    <div
      data-slot="bubble"
      data-variant={variant}
      data-align={align}
      className={cn(bubbleVariants({ variant }), className)}
      {...props}
    />
  )
}

function BubbleContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const Comp = "div"

  return (
    <Comp
      data-slot="bubble-content"
      className={cn(
        "min-w-0 overflow-hidden rounded-xl border border-transparent px-3 py-2 text-sm",
        className
      )}
      {...props}
    />
  )
}

const bubbleReactionsVariants = cva(
  "absolute z-10 flex shrink-0 items-center justify-center gap-1 rounded-[11px] bg-slate-100 px-1.5 py-0.5 text-sm",
  {
    variants: {
      side: {
        top: "top-0",
        bottom: "bottom-0 translate-y-3",
      },
      align: {
        start: "left-3",
        end: "right-3",
      },
    },
    defaultVariants: {
      side: "bottom",
      align: "end",
    },
  }
)

function BubbleReactions({
  side = "bottom",
  align = "end",
  className,
  ...props
}: React.ComponentProps<"div"> & {
  align?: "start" | "end"
  side?: "top" | "bottom"
}) {
  return (
    <div
      data-slot="bubble-reactions"
      data-align={align}
      data-side={side}
      className={cn(bubbleReactionsVariants({ side, align }), className)}
      {...props}
    />
  )
}

export { BubbleGroup, Bubble, BubbleContent, BubbleReactions }
