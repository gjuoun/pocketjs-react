// <FocusScope>: while mounted, d-pad traversal and CIRCLE are confined to its subtree
// (the framework's pushFocusScope). It focuses its first focusable on mount and, on unmount,
// gives focus back to whatever was focused before. The scope is pushed in a layout effect,
// so it is popped before React removes the subtree. nodeRef (C6) hands the node to the caller,
// so a popper can measure its own panel.

import { pushFocusScope } from "@pocketjs/framework/input";
import { type Ref, useLayoutEffect, useRef } from "react";
import { type PocketHostProps, View } from "../elements.ts";
import type { NodeMirror } from "../internal/pocket.ts";

export interface FocusScopeProps
  extends Omit<PocketHostProps, "ref" | "focusable" | "onPress"> {
  autoFocus?: boolean;
  restoreFocus?: boolean;
  nodeRef?: Ref<NodeMirror>;
}

export function FocusScope(props: FocusScopeProps) {
  const { autoFocus, restoreFocus, nodeRef, ...rest } = props;
  const ref = useRef<NodeMirror>(null);
  const setRef = (node: NodeMirror | null) => {
    ref.current = node;
    if (typeof nodeRef === "function") nodeRef(node);
    else if (nodeRef)
      (nodeRef as { current: NodeMirror | null }).current = node;
  };
  useLayoutEffect(() => {
    if (!ref.current) return;
    return pushFocusScope(ref.current as never, { autoFocus, restoreFocus });
  }, []);
  return <View {...rest} ref={setRef as never} />;
}
