// Pressable: the one press contract every native primitive uses. By default it is a focusable
// view that runs onPress on CIRCLE (or a tap). With asChild it is the caller's own element:
// the class and the press merge onto the child (Radix's Slot contract, without Slot), so
// <Close asChild><Button/></Close> presses the Button. A disabled Pressable keeps its node (its
// class selectors still resolve from `disabled`) but takes no focus and runs no press.

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
  dataState?: string;
  /** Other data-* attributes the node's selectors read (data-size, data-orientation). Forwarded to the View only. */
  dataProps?: Record<string, string | undefined>;
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

/** The data-* props a View carries for its selectors: the state, the extra data props, and disabled. */
function selectorProps(props: PressableProps): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (props.dataState !== undefined) out["data-state"] = props.dataState;
  for (const [key, value] of Object.entries(props.dataProps ?? {})) if (value !== undefined) out[key] = value;
  if (props.disabled) out.disabled = true;
  return out;
}

/**
 * The fill of a control whose state is a selector (data-[state=on]:bg-*): the vendored base carries a bg-* of its own
 * (bg-transparent, bg-white) that would win over the selector, so the base's bg-* tokens go and the off fill is given
 * here instead. A selector token (it has a colon) stays.
 */
export function controlSurface(on: boolean, className: string | undefined, offFill = "bg-white"): string {
  const kept = (className ?? "").split(/\s+/).filter((t) => t !== "" && (t.includes(":") || !t.startsWith("bg-")));
  return [on ? "" : offFill, kept.join(" ")].filter((t) => t !== "").join(" ");
}

/** A label child as its own text run with no colour of its own, so it takes its surface's colour (Pressable's
 *  default Text is white). Non-text children pass through. */
export function plainLabel(children: ReactNode): ReactNode {
  return typeof children === "string" || typeof children === "number" ? <Text>{children}</Text> : children;
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
        if (!props.disabled) props.onPress();
      },
    });
  }
  // A string label takes its surface's colour, as plainLabel does: a white default made it invisible on a light surface.
  const body =
    typeof props.children === "string" || typeof props.children === "number" ? (
      <Text className="text-sm">{props.children}</Text>
    ) : (
      props.children
    );
  const extra = selectorProps(props);
  if (props.disabled)
    return (
      <View ref={props.nodeRef} className={props.className} {...extra}>
        {body}
      </View>
    );
  return (
    <View
      ref={props.nodeRef}
      className={props.className}
      focusable
      onPress={props.onPress}
      {...extra}
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
