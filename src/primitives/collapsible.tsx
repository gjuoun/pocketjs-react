// Native Collapsible (batch 3), shaped like Radix's Collapsible namespace so the vendored shadcn collapsible imports it
// unchanged. Root holds `open` (controlled, or defaultOpen). The Trigger toggles it; the Content mounts only while
// open (Radix unmounts closed content without forceMount). Both carry data-state open|closed.
import { createContext, type ReactNode, useContext } from "react";
import { View } from "../elements.ts";
import { cn } from "../style/cn.ts";
import { Pressable, plainLabel } from "./press.tsx";
import { useControllableState } from "./state.ts";

interface OpenValue {
  open: boolean;
  toggle: () => void;
  disabled: boolean;
}
const OpenContext = createContext<OpenValue>({ open: false, toggle: () => {}, disabled: false });

export interface RootProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
  [prop: `data-${string}`]: unknown;
}

export function Root(props: RootProps) {
  const [open, setOpen] = useControllableState(props.open, props.defaultOpen ?? false, props.onOpenChange);
  return (
    <OpenContext.Provider value={{ open, toggle: () => setOpen(!open), disabled: !!props.disabled }}>
      <View className={cn("flex-col", props.className)}>{props.children}</View>
    </OpenContext.Provider>
  );
}

export interface TriggerProps {
  className?: string;
  children?: ReactNode;
  [prop: `data-${string}`]: unknown;
}

/** Toggles the content. */
export function Trigger(props: TriggerProps) {
  const state = useContext(OpenContext);
  return (
    <Pressable
      className={props.className}
      disabled={state.disabled}
      dataState={state.open ? "open" : "closed"}
      onPress={state.toggle}
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

/** Mounted only while open. */
export function Content(props: ContentProps) {
  const state = useContext(OpenContext);
  if (!state.open) return null;
  return (
    <View className={cn("flex-col", props.className)} {...{ "data-state": "open" }}>
      {plainLabel(props.children)}
    </View>
  );
}

export { Trigger as CollapsibleTrigger, Content as CollapsibleContent };

