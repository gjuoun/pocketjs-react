// Native Tabs (batch 3), shaped like Radix's Tabs namespace so the vendored shadcn tabs imports it unchanged. Root
// holds the active value (controlled, or defaultValue). List is a row on roving focus: LEFT and RIGHT move focus to
// the neighbour trigger and activate it (automatic activation), wrapping. Trigger is a Pressable with data-state
// active|inactive. Content mounts only while its value is active. This is not src/components/Tabs.tsx, the app-level
// tabs array.
import { createContext, type ReactNode, useContext, useRef } from "react";
import { View } from "../elements.ts";
import type { NodeMirror } from "../internal/pocket.ts";
import { cn } from "../style/cn.ts";
import { Pressable, plainLabel } from "./press.tsx";
import { useRovingGroup, useRovingItem } from "./roving.ts";
import { useControllableState } from "./state.ts";

interface RootValue {
  value: string;
  select: (value: string) => void;
}
const RootContext = createContext<RootValue>({ value: "", select: () => {} });

export interface RootProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  orientation?: "horizontal" | "vertical";
  className?: string;
  children?: ReactNode;
  [prop: `data-${string}`]: unknown;
}

export function Root(props: RootProps) {
  const [value, setValue] = useControllableState(props.value, props.defaultValue ?? "", props.onValueChange);
  return (
    <RootContext.Provider value={{ value, select: setValue }}>
      <View className={cn("flex-col", props.className)} {...{ "data-orientation": props.orientation ?? "horizontal" }}>
        {props.children}
      </View>
    </RootContext.Provider>
  );
}

export interface ListProps {
  className?: string;
  children?: ReactNode;
  [prop: `data-${string}`]: unknown;
}

/** The row of triggers, on roving focus with automatic activation. */
export function List(props: ListProps) {
  const ref = useRef<NodeMirror | null>(null);
  useRovingGroup(ref, { orientation: "horizontal", loop: true, activate: true });
  return (
    <View ref={ref} className={cn("flex-row", props.className)}>
      {props.children}
    </View>
  );
}

export interface TriggerProps {
  value: string;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
  [prop: `data-${string}`]: unknown;
}

export function Trigger(props: TriggerProps) {
  const root = useContext(RootContext);
  const ref = useRef<NodeMirror | null>(null);
  const active = root.value === props.value;
  useRovingItem(ref, { activate: () => root.select(props.value), disabled: props.disabled });
  return (
    <Pressable
      nodeRef={ref}
      className={props.className}
      disabled={props.disabled}
      dataState={active ? "active" : "inactive"}
      onPress={() => root.select(props.value)}
    >
      {plainLabel(props.children)}
    </Pressable>
  );
}

export interface ContentProps {
  value: string;
  className?: string;
  children?: ReactNode;
  [prop: `data-${string}`]: unknown;
}

/** Mounted only while its value is the active one. */
export function Content(props: ContentProps) {
  const root = useContext(RootContext);
  if (root.value !== props.value) return null;
  return <View className={cn("flex-col", props.className)}>{plainLabel(props.children)}</View>;
}
