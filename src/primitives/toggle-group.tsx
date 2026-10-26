// Native ToggleGroup (batch 3), shaped like Radix's ToggleGroup namespace so the vendored shadcn toggle group imports
// it unchanged. Root holds the value as a list (type single: at most one, a press on the active item clears it; type
// multiple: any number). Items are Pressables on roving focus: all four arrows move focus to the neighbour (wrapping)
// and do not press. The group's style (--gap) is not a layout the core has: it is ignored.
import { createContext, type ReactNode, useContext, useRef } from "react";
import { View } from "../elements.ts";
import type { NodeMirror } from "../internal/pocket.ts";
import { cn } from "../style/cn.ts";
import { controlSurface, Pressable } from "./press.tsx";
import { useRovingGroup, useRovingItem } from "./roving.ts";
import { useControllableState } from "./state.ts";

interface GroupValue {
  values: string[];
  toggle: (value: string) => void;
}
const GroupContext = createContext<GroupValue>({ values: [], toggle: () => {} });

/** The value as a list: undefined and "" are none. */
function listOf(value: string | string[] | undefined): string[] {
  if (value === undefined || value === "") return [];
  return Array.isArray(value) ? value : [value];
}

export interface RootProps {
  type: "single" | "multiple";
  value?: string | string[];
  defaultValue?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
  [prop: `data-${string}`]: unknown;
  style?: unknown;
}

export function Root(props: RootProps) {
  const multiple = props.type === "multiple";
  const [values, setValues] = useControllableState<string[]>(
    props.value === undefined ? undefined : listOf(props.value),
    listOf(props.defaultValue),
    (next) => props.onValueChange?.(multiple ? next : (next[0] ?? "")),
  );
  const ref = useRef<NodeMirror | null>(null);
  useRovingGroup(ref, { orientation: "both", loop: true, activate: false });
  const toggle = (value: string) => {
    const on = values.includes(value);
    if (multiple) setValues(on ? values.filter((v) => v !== value) : [...values, value]);
    else setValues(on ? [] : [value]);
  };
  return (
    <GroupContext.Provider value={{ values, toggle }}>
      <View ref={ref} className={cn("flex-row", props.className)}>
        {props.children}
      </View>
    </GroupContext.Provider>
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
  const group = useContext(GroupContext);
  const ref = useRef<NodeMirror | null>(null);
  const pressed = group.values.includes(props.value);
  useRovingItem(ref, { disabled: props.disabled });
  return (
    <Pressable
      nodeRef={ref}
      className={controlSurface(pressed, props.className, "bg-transparent")}
      disabled={props.disabled}
      dataState={pressed ? "on" : "off"}
      onPress={() => group.toggle(props.value)}
    >
      {props.children}
    </Pressable>
  );
}
