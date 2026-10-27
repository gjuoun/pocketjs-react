// Focusable: the one press-and-focus seam the native components share. It is a View with the core focusable
// flag and onPress, styled by a look built from the theme tokens. Focus is the core focus: variant (no ring); a disabled
// node keeps its box but takes neither focus nor press. No className prop: callers pass a look string.
import type { ReactNode, Ref } from "react";
import { View } from "../elements.ts";
import type { NodeMirror } from "../internal/pocket.ts";

export interface FocusableProps {
  look: string;
  disabled?: boolean;
  onPress?: () => void;
  nodeRef?: Ref<NodeMirror>;
  children?: ReactNode;
}

export function Focusable(props: FocusableProps) {
  if (props.disabled) {
    return <View ref={props.nodeRef} className={props.look}>{props.children}</View>;
  }
  return (
    <View ref={props.nodeRef} className={props.look} focusable onPress={props.onPress}>
      {props.children}
    </View>
  );
}
