// Native Label (batch A, R-L), shaped like Radix's Label namespace so the vendored shadcn label imports it
// unchanged. The Label is a View, never focusable: a tap on it focuses the control its htmlFor names
// (the label map, src/input/label-map.ts). String children are drawn as a Text with the primitive's own
// size and ink; the caller's text sizes and leading are dropped, as the other primitives do.

import { type ReactNode, useLayoutEffect, useRef } from "react";
import { Text, View } from "../elements.ts";
import type { NodeMirror } from "../internal/pocket.ts";
import { forgetLabel, setLabel } from "../input/label-map.ts";
import { cn } from "../style/cn.ts";
import { ownText } from "./surface.ts";

export interface LabelProps {
  htmlFor?: string;
  className?: string;
  children?: ReactNode;
}

export function Root(props: LabelProps) {
  const node = useRef<NodeMirror | null>(null);
  const { htmlFor } = props;
  useLayoutEffect(() => {
    const self = node.current;
    if (!self || htmlFor === undefined) return;
    setLabel(self, htmlFor);
    return () => forgetLabel(self);
  }, [htmlFor]);
  const children = props.children;
  const body =
    typeof children === "string" || typeof children === "number" ? (
      <Text
        className={cn("text-sm text-slate-900 font-bold", ownText(props.className))}
      >
        {children}
      </Text>
    ) : (
      children
    );
  return (
    <View ref={node} className={cn("flex items-center gap-2", props.className)}>
      {body}
    </View>
  );
}
