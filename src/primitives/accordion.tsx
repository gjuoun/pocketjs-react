// Native Accordion (batch 3), shaped like Radix's Accordion namespace so the vendored shadcn accordion imports it
// unchanged. Root holds the open items (type single: one, closed by its own trigger only when collapsible; type
// multiple: any number) and the Up and Down arrows move focus between the triggers (roving, no press). Item carries
// its value; Trigger toggles it and carries data-state open|closed; Content mounts only while its item is open.
import { createContext, type ReactNode, useContext, useRef } from "react";
import { View } from "../elements.ts";
import type { NodeMirror } from "../internal/pocket.ts";
import { cn } from "../style/cn.ts";
import { Pressable, plainLabel } from "./press.tsx";
import { useRovingGroup, useRovingItem } from "./roving.ts";
import { useControllableState } from "./state.ts";

interface RootValue {
  values: string[];
  toggle: (value: string) => void;
  disabled: boolean;
}
const RootContext = createContext<RootValue>({ values: [], toggle: () => {}, disabled: false });

interface ItemValue {
  value: string;
  open: boolean;
  disabled: boolean;
}
const ItemContext = createContext<ItemValue>({ value: "", open: false, disabled: false });

function listOf(value: string | string[] | undefined): string[] {
  if (value === undefined || value === "") return [];
  return Array.isArray(value) ? value : [value];
}

export interface RootProps {
  type: "single" | "multiple";
  collapsible?: boolean;
  value?: string | string[];
  defaultValue?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
  [prop: `data-${string}`]: unknown;
}

export function Root(props: RootProps) {
  const multiple = props.type === "multiple";
  const [values, setValues] = useControllableState<string[]>(
    props.value === undefined ? undefined : listOf(props.value),
    listOf(props.defaultValue),
    (next) => props.onValueChange?.(multiple ? next : (next[0] ?? "")),
  );
  const ref = useRef<NodeMirror | null>(null);
  useRovingGroup(ref, { orientation: "vertical", loop: true, activate: false });
  const collapsible = multiple || props.collapsible === true;
  const toggle = (value: string) => {
    const open = values.includes(value);
    if (multiple) setValues(open ? values.filter((v) => v !== value) : [...values, value]);
    else if (!open) setValues([value]);
    else if (collapsible) setValues([]);
  };
  return (
    <RootContext.Provider value={{ values, toggle, disabled: !!props.disabled }}>
      <View ref={ref} className={cn("flex-col", props.className)}>
        {props.children}
      </View>
    </RootContext.Provider>
  );
}

export interface ItemProps {
  value: string;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
  [prop: `data-${string}`]: unknown;
}

export function Item(props: ItemProps) {
  const root = useContext(RootContext);
  const open = root.values.includes(props.value);
  return (
    <ItemContext.Provider value={{ value: props.value, open, disabled: root.disabled || !!props.disabled }}>
      <View className={cn("flex-col", props.className)}>{props.children}</View>
    </ItemContext.Provider>
  );
}

export interface HeaderProps {
  className?: string;
  children?: ReactNode;
  [prop: `data-${string}`]: unknown;
}

export function Header(props: HeaderProps) {
  return <View className={cn("flex-row", props.className)}>{props.children}</View>;
}

export interface TriggerProps {
  className?: string;
  disabled?: boolean;
  children?: ReactNode;
  [prop: `data-${string}`]: unknown;
}

/** Toggles its item; a focus arrow (Up or Down) moves to the neighbouring trigger. */
export function Trigger(props: TriggerProps) {
  const root = useContext(RootContext);
  const item = useContext(ItemContext);
  const ref = useRef<NodeMirror | null>(null);
  const disabled = item.disabled || !!props.disabled;
  useRovingItem(ref, { disabled });
  return (
    <Pressable
      nodeRef={ref}
      className={props.className}
      disabled={disabled}
      dataState={item.open ? "open" : "closed"}
      onPress={() => root.toggle(item.value)}
    >
      {plainLabel(props.children)}
    </Pressable>
  );
}

export interface ContentProps {
  className?: string;
  children?: ReactNode;
  [prop: `data-${string}`]: unknown;
}

/** The body of an open item; closed, it is not mounted. */
export function Content(props: ContentProps) {
  const item = useContext(ItemContext);
  if (!item.open) return null;
  return (
    <View className={cn("flex-col", props.className)} {...{ "data-state": "open" }}>
      {plainLabel(props.children)}
    </View>
  );
}
