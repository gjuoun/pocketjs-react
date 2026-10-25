// Native Select primitive (C5), shaped like Radix's Select namespace so the vendored shadcn select
// imports it unchanged. Root holds the value and the open state. Content is a ModalLayer, placed
// beside its trigger (C6); opening focuses the selected row (else the first). Item selects and closes.
// The trigger's label comes from the Items in the tree, read before they mount, so a closed Select
// can show its selected label. Scrolling is not implemented: the scroll buttons render nothing.

import { focusNode } from "@pocketjs/framework/input";
import {
  createContext,
  isValidElement,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
} from "react";
import { Text, View } from "../elements.ts";
import type { NodeMirror } from "../internal/pocket.ts";
import { cn } from "../style/cn.ts";
import { type Box, measureFocused } from "./anchor.ts";
import { ModalLayer } from "./modal-layer.tsx";
import { Pressable } from "./press.tsx";
import { useControllableState } from "./state.ts";
import { ownItem, ownSurface, ownText } from "./surface.ts";

interface SelectContextValue {
  value: string;
  setValue: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  labels: Map<string, string>;
  /** The trigger's box, measured as the list opens (C6). Cleared on close. */
  anchor: { current: Box | null };
}

const SelectContext = createContext<SelectContextValue | null>(null);

function useSelect(part: string): SelectContextValue {
  const ctx = useContext(SelectContext);
  if (!ctx)
    throw new Error(`pocketjs-react: ${part} must be used inside <Select>`);
  return ctx;
}

/** Text of a node tree, read from the element props (no rendering needed). */
function plainText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(plainText).join("");
  if (isValidElement(node))
    return plainText((node.props as { children?: ReactNode }).children);
  return "";
}

/**
 * The label of every Item in the tree, keyed by value. Walks the element tree before anything
 * mounts, so a closed Select can show the selected label. Items built by a component that hides
 * them behind props fall back to showing their value.
 */
function collectLabels(node: ReactNode, into: Map<string, string>): void {
  if (Array.isArray(node)) {
    for (const child of node) collectLabels(child, into);
    return;
  }
  if (!isValidElement(node)) return;
  const props = node.props as { value?: unknown; children?: ReactNode };
  // An Item is any component element with a string value: ours, or a vendored wrapper around it.
  if (typeof node.type === "function" && typeof props.value === "string")
    into.set(props.value, plainText(props.children));
  collectLabels(props.children, into);
}

export interface SelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  name?: string;
  disabled?: boolean;
  required?: boolean;
  children?: ReactNode;
}

export function Root(props: SelectProps) {
  const [value, setValue] = useControllableState(
    props.value,
    props.defaultValue ?? "",
    props.onValueChange,
  );
  const [open, setOpen] = useControllableState(
    props.open,
    props.defaultOpen ?? false,
    props.onOpenChange,
  );
  const labels = new Map<string, string>();
  collectLabels(props.children, labels);
  const anchor = useRef<Box | null>(null);
  const setOpenAnchored = (next: boolean) => {
    if (!next) anchor.current = null;
    setOpen(next);
  };
  return (
    <SelectContext.Provider
      value={{
        value,
        setValue,
        open,
        setOpen: setOpenAnchored,
        labels,
        anchor,
      }}
    >
      {props.children}
    </SelectContext.Provider>
  );
}

export function Group(props: { className?: string; children?: ReactNode }) {
  return (
    <View className={cn("flex-col", props.className)}>{props.children}</View>
  );
}

export interface ValueProps {
  placeholder?: string;
  className?: string;
  children?: ReactNode;
}

/** The selected Item's label, else the placeholder (or the caller's children, if given). */
export function Value(props: ValueProps) {
  const ctx = useSelect("Select.Value");
  if (props.children !== undefined && props.children !== null)
    return (
      <Text className={cn("text-sm text-white", ownText(props.className))}>
        {props.children}
      </Text>
    );
  const label =
    ctx.value === ""
      ? (props.placeholder ?? "")
      : (ctx.labels.get(ctx.value) ?? ctx.value);
  return (
    <Text className={cn("text-sm text-white", ownText(props.className))}>
      {label}
    </Text>
  );
}

export interface TriggerProps {
  asChild?: boolean;
  className?: string;
  disabled?: boolean;
  children?: ReactNode;
}

export function Trigger(props: TriggerProps) {
  const ctx = useSelect("Select.Trigger");
  return (
    <Pressable
      asChild={props.asChild}
      disabled={props.disabled}
      className={cn(
        "flex items-center justify-between gap-2 rounded-md px-3 py-2 bg-slate-800",
        ownSurface(props.className),
      )}
      onPress={() => {
        if (!ctx.open) ctx.anchor.current = measureFocused();
        ctx.setOpen(!ctx.open);
      }}
    >
      {props.children}
    </Pressable>
  );
}

/** Pass-through: Content portals itself into the overlay layer (ModalLayer). */
export function Portal(props: { children?: ReactNode }) {
  return <>{props.children}</>;
}

export interface ContentProps {
  className?: string;
  children?: ReactNode;
  /** Positioning: side, align and sideOffset place the list beside its trigger (C6). */
  position?: "item-aligned" | "popper" | "";
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
  sideOffset?: number;
  avoidCollisions?: boolean;
  forceMount?: true;
}

export function Content(props: ContentProps) {
  const ctx = useSelect("Select.Content");
  return (
    <ModalLayer
      open={ctx.open}
      onClose={() => ctx.setOpen(false)}
      anchoring={{
        anchor: ctx.anchor.current,
        side: props.side,
        align: props.align,
        sideOffset: props.sideOffset,
      }}
      panelClassName={cn(
        "flex-col p-1 rounded-md bg-slate-800 w-[220px]",
        ownSurface(props.className),
      )}
    >
      {props.children}
    </ModalLayer>
  );
}

export function Viewport(props: { className?: string; children?: ReactNode }) {
  return (
    <View className={cn("flex-col", ownSurface(props.className))}>
      {props.children}
    </View>
  );
}

interface ItemStateValue {
  selected: boolean;
}

const ItemStateContext = createContext<ItemStateValue>({ selected: false });

export interface ItemProps {
  value: string;
  className?: string;
  disabled?: boolean;
  textValue?: string;
  children?: ReactNode;
}

/** A row: CIRCLE selects its value and closes the list. The selected row takes focus on open. */
export function Item(props: ItemProps) {
  if (props.value === "")
    throw new Error("pocketjs-react: a Select.Item must have a value");
  const ctx = useSelect("Select.Item");
  const ref = useRef<NodeMirror | null>(null);
  const selected = ctx.value === props.value;
  useEffect(() => {
    if (ctx.open && selected && ref.current) focusNode(ref.current);
  }, [ctx.open, selected]);
  return (
    <ItemStateContext.Provider value={{ selected }}>
      <Pressable
        nodeRef={ref}
        disabled={props.disabled}
        className={cn(
          "flex items-center gap-2 px-2 py-1.5 text-sm text-white focus:bg-blue-600",
          ownItem(props.className),
        )}
        onPress={() => {
          ctx.setValue(props.value);
          ctx.setOpen(false);
        }}
      >
        {props.children}
      </Pressable>
    </ItemStateContext.Provider>
  );
}

export function ItemText(props: { className?: string; children?: ReactNode }) {
  return (
    <Text className={cn("text-sm text-white", ownText(props.className))}>
      {props.children}
    </Text>
  );
}

/** Renders its children only while its Item is the selected value. */
export function ItemIndicator(props: {
  className?: string;
  children?: ReactNode;
}) {
  const { selected } = useContext(ItemStateContext);
  return selected ? props.children : null;
}

export function Label(props: { className?: string; children?: ReactNode }) {
  return (
    <Text className={cn("text-xs text-white", ownText(props.className))}>
      {props.children}
    </Text>
  );
}

export function Separator(props: { className?: string }) {
  return (
    <View className={cn("h-[1px] bg-slate-600", ownSurface(props.className))} />
  );
}

/** Glyph slot of the trigger; with asChild it is the child itself (the vendored chevron). */
export function Icon(props: { asChild?: boolean; children?: ReactNode }) {
  if (props.asChild) return <>{props.children}</>;
  return <View>{props.children}</View>;
}

/** No overflow in this primitive (C10): nothing to scroll to. */
export function ScrollUpButton(_props: {
  className?: string;
  children?: ReactNode;
}) {
  return null;
}

export function ScrollDownButton(_props: {
  className?: string;
  children?: ReactNode;
}) {
  return null;
}
