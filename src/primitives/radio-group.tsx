// Native RadioGroup (batch 3), shaped like Radix's RadioGroup namespace so the vendored shadcn radio group imports it
// unchanged. Root holds the value (controlled, or defaultValue) and roving focus: all four arrows move focus to the
// neighbour item (wrapping) and check it, as Radix does. Item is a Pressable; its Indicator draws only while checked.
import { createContext, type ReactNode, useContext, useRef } from "react";
import { View } from "../elements.ts";
import type { NodeMirror } from "../internal/pocket.ts";
import { cn } from "../style/cn.ts";
import { controlSurface, Pressable } from "./press.tsx";
import { useRovingGroup, useRovingItem } from "./roving.ts";
import { useControllableState } from "./state.ts";

interface GroupValue {
  value: string | undefined;
  select: (value: string) => void;
}
const GroupContext = createContext<GroupValue>({ value: undefined, select: () => {} });
const CheckedContext = createContext<boolean>(false);

export interface RootProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  loop?: boolean;
  className?: string;
  children?: ReactNode;
  [prop: `data-${string}`]: unknown;
}

export function Root(props: RootProps) {
  const [value, setValue] = useControllableState<string | undefined>(props.value, props.defaultValue, (next) => {
    if (next !== undefined) props.onValueChange?.(next);
  });
  const ref = useRef<NodeMirror | null>(null);
  useRovingGroup(ref, { orientation: "both", loop: props.loop ?? true, activate: true });
  return (
    <GroupContext.Provider value={{ value, select: setValue }}>
      <View ref={ref} className={cn("flex-col", props.className)}>
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
  const checked = group.value === props.value;
  useRovingItem(ref, { activate: () => group.select(props.value), disabled: props.disabled });
  return (
    <CheckedContext.Provider value={checked}>
      <Pressable
        nodeRef={ref}
        className={cn(controlSurface(checked, props.className))}
        disabled={props.disabled}
        dataState={checked ? "checked" : "unchecked"}
        onPress={() => group.select(props.value)}
      >
        {props.children}
      </Pressable>
    </CheckedContext.Provider>
  );
}

export interface IndicatorProps {
  className?: string;
  children?: ReactNode;
  [prop: `data-${string}`]: unknown;
}

/** Its children only while the item is the group's value. */
export function Indicator(props: IndicatorProps) {
  const checked = useContext(CheckedContext);
  if (!checked) return null;
  return <View className={cn("relative w-4 h-4", props.className)}>{props.children}</View>;
}
