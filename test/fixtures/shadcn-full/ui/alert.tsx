import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "pocketjs-react"

const alertVariants = cva(
  "relative flex flex-col w-full items-start rounded-lg border px-4 py-3 text-sm",
  {
    variants: {
      variant: {
        default: "bg-white text-slate-900",
        destructive:
          "bg-white text-red-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "min-h-4 font-bold tracking-wide",
        className
      )}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "flex flex-col gap-1 text-sm text-slate-500",
        className
      )}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription }
