// Pressable: the one press contract every native primitive uses. By default it is a focusable
// view that runs onPress on CIRCLE (or a tap). With asChild it is the caller's own element:
// the class and the press merge onto the child (Radix's Slot contract, without Slot), so
// <Close asChild><Button/></Close> presses the Button.

import {
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";
import { Text, View } from "../elements.ts";
import type { NodeMirror } from "../internal/pocket.ts";
import { isHoverEnabled, markHoverOverlay, markSuppressOverlay } from "../input/hover.ts";
import { cn } from "../style/cn.ts";

interface PressableProps {
  asChild?: boolean;
  className?: string;
  disabled?: boolean;
  /** data-state for the node's own selectors (data-[state=open]:, D5). Forwarded to the View only. */
  dataState?: "open" | "closed";
  /** The node, for primitives that move focus to a specific row (Select's selected item). */
  nodeRef?: Ref<NodeMirror>;
  onPress: () => void;
  /** A Menu or Select item row: on the web host it carries a hover overlay child. */
  hoverable?: boolean;
  children?: ReactNode;
}

/** Hands one node to every ref it is given: the child's own ref and the primitive's. */
function mergeRefs(...refs: (Ref<NodeMirror> | undefined)[]): (node: NodeMirror | null) => void {
  return (node) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as { current: NodeMirror | null }).current = node;
    }
  };
}

interface ChildProps {
  className?: string;
  onClick?: () => void;
}

export function Pressable(props: PressableProps) {
  if (props.asChild && isValidElement(props.children)) {
    const child = props.children as ReactElement<ChildProps & { ref?: Ref<NodeMirror> }>;
    return cloneElement(child, {
      // The node reaches the caller through nodeRef too (a Popover or Tooltip Trigger reads its box).
      ...(props.nodeRef ? { ref: mergeRefs(child.props.ref, props.nodeRef) } : {}),
      className: cn(child.props.className, props.className),
      onClick: () => {
        child.props.onClick?.();
        props.onPress();
      },
    });
  }
  const body =
    typeof props.children === "string" || typeof props.children === "number" ? (
      <Text className="text-sm text-white">{props.children}</Text>
    ) : (
      props.children
    );
  if (props.disabled) return <View className={props.className}>{body}</View>;
  return (
    <View
      ref={props.nodeRef}
      className={props.className}
      focusable
      onPress={props.onPress}
      {...(props.dataState !== undefined ? { "data-state": props.dataState } : {})}
    >
      {props.hoverable && isHoverEnabled() ? (
        <>
          <View ref={markSuppressOverlay} className="absolute inset-0 active:bg-slate-800" />
          <View ref={markHoverOverlay} className="absolute inset-0 active:bg-blue-600" />
        </>
      ) : null}
      {body}
    </View>
  );
}
