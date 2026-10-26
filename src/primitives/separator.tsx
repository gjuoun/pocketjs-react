// Native Separator (batch A), shaped like Radix's Separator namespace so the vendored shadcn separator
// imports it unchanged. A View that draws one line: 1px thick across the box for horizontal, 1px wide
// down it for vertical. `data-orientation` is set on the View so the caller's data-[orientation=…]:
// selector tokens resolve against it (C8). `decorative` and `role` are not forwarded: the core has no
// accessibility tree, so both are no-ops here.

import { View } from "../elements.ts";
import { cn } from "../style/cn.ts";

export interface SeparatorProps {
  orientation?: "horizontal" | "vertical";
  decorative?: boolean;
  className?: string;
}

export function Root(props: SeparatorProps) {
  const vertical = props.orientation === "vertical";
  return (
    <View
      data-orientation={vertical ? "vertical" : "horizontal"}
      className={cn(
        "shrink-0 bg-slate-200",
        vertical ? "w-[1px] h-full" : "h-[1px] w-full",
        props.className,
      )}
    />
  );
}
