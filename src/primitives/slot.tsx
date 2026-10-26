// Native Slot (batch A), shaped like Radix's Slot namespace so the vendored shadcn Button and Badge keep
// their `asChild ? Slot.Root : "tag"` expression (the codemod no longer flattens it, R4 retired). Root
// merges its own props onto its single child with Radix's mergeProps order and renders no node of its
// own: className is the slot's then the child's, style is merged, a chained `on*` handler runs the
// child's and then the slot's, every other child prop wins, and the two refs are composed.
// Pressable (press.tsx) keeps its own merge order (the child's class first) for the press contract.

import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";

type Bag = Record<string, unknown>;

export interface SlotProps {
  children?: ReactNode;
  className?: string;
  [prop: string]: unknown;
}

function composeRefs(...refs: unknown[]): Ref<unknown> | undefined {
  const present = refs.filter((r) => r !== undefined && r !== null);
  if (present.length === 0) return undefined;
  return (node: unknown) => {
    for (const ref of present) {
      if (typeof ref === "function") (ref as (n: unknown) => void)(node);
      else (ref as { current: unknown }).current = node;
    }
  };
}

/** Radix's mergeProps, for the props a Slot can meet: handlers chain, style and className join. */
export function mergeProps(slot: Bag, child: Bag): Bag {
  const out: Bag = { ...slot, ...child };
  for (const key of Object.keys(child)) {
    const s = slot[key];
    const c = child[key];
    if (/^on[A-Z]/.test(key)) {
      if (typeof s === "function" && typeof c === "function")
        out[key] = (...args: unknown[]) => {
          const result = (c as (...a: unknown[]) => unknown)(...args);
          (s as (...a: unknown[]) => unknown)(...args);
          return result;
        };
      else if (typeof s === "function") out[key] = s;
    } else if (key === "style")
      out[key] = { ...(s as object | undefined), ...(c as object | undefined) };
    else if (key === "className")
      out[key] = [s, c].filter((v) => typeof v === "string" && v !== "").join(" ");
  }
  if (slot.ref !== undefined || child.ref !== undefined)
    out.ref = composeRefs(slot.ref, child.ref);
  return out;
}

/** The one element a Slot merges onto. Zero children renders nothing; several are an error. */
export function Root(props: SlotProps) {
  const { children, ...slotProps } = props;
  const elements = Children.toArray(children);
  if (elements.length === 0) return null;
  const only = elements[0];
  if (elements.length > 1 || !isValidElement(only))
    throw new Error(
      "pocketjs-react: a Slot (asChild) needs exactly one element child",
    );
  const child = only as ReactElement<Bag>;
  return cloneElement(child, mergeProps(slotProps, child.props));
}
