// <FocusScope>: while mounted, d-pad traversal and CIRCLE are confined to its subtree
// (the framework's pushFocusScope). It focuses its first focusable on mount and, on unmount,
// gives focus back to whatever was focused before. The scope is pushed in a layout effect,
// so it is popped before React removes the subtree.
import { useLayoutEffect, useRef } from "react";
import { pushFocusScope } from "@pocketjs/framework/input";
import { View, type PocketHostProps } from "../elements.ts";
import type { NodeMirror } from "../internal/pocket.ts";

export interface FocusScopeProps extends Omit<PocketHostProps, "ref" | "focusable" | "onPress"> {
  autoFocus?: boolean;
  restoreFocus?: boolean;
}

export function FocusScope(props: FocusScopeProps) {
  const { autoFocus, restoreFocus, ...rest } = props;
  const ref = useRef<NodeMirror>(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    return pushFocusScope(ref.current as never, { autoFocus, restoreFocus });
  }, []);
  return <View {...rest} ref={ref} />;
}
