// <Grid>: lays children out in rows of `columns` and gives the d-pad row/column movement
// (the framework's focus grid): LEFT/RIGHT move within a row, UP/DOWN between rows.
// Movement is structural, by child order: the core offers no node-rect query, so focus
// cannot be moved by on-screen geometry.

import { pushFocusGrid } from "@pocketjs/framework/input";
import { useLayoutEffect, useRef } from "react";
import { type PocketHostProps, View } from "../elements.ts";
import type { NodeMirror } from "../internal/pocket.ts";
import { cn } from "../style/cn.ts";

export interface GridProps
  extends Omit<PocketHostProps, "ref" | "focusable" | "onPress"> {
  columns: number;
  /** Moving past a row's end continues on the next row. */
  wrap?: boolean;
}

export function Grid(props: GridProps) {
  const { columns, wrap, className, ...rest } = props;
  const ref = useRef<NodeMirror>(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    return pushFocusGrid(ref.current as never, {
      columns,
      wrap: wrap ?? false,
    });
  }, [columns, wrap]);
  return (
    <View {...rest} ref={ref} className={cn("flex-row flex-wrap", className)} />
  );
}
