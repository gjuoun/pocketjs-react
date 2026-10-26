// Native NavigationMenu (batch 4), shaped like Radix's NavigationMenu namespace so the vendored shadcn navigation-menu
// imports it unchanged. Root holds the open item (controlled or not). Trigger presses toggle their item open. Content
// registers its children with the Root while its item is open; Viewport draws the open panel below the list, in flow.
// Not built: the popper placement under the trigger (the panel is in flow, not anchored), hover-to-open, and Escape.
import { type ReactNode, createContext, useContext, useRef } from "react";
import { View } from "../elements.ts";
import { cn } from "../style/cn.ts";
import { Pressable } from "./press.tsx";
import { useControllableState } from "./state.ts";

interface RootCtx {
  open: string;
  setOpen(value: string): void;
  panels: Map<string, ReactNode>;
}
const Ctx = createContext<RootCtx | null>(null);
const ItemCtx = createContext<string>("");

function useRoot(part: string): RootCtx {
  const c = useContext(Ctx);
  if (!c)
    throw new Error(
      "pocketjs-react: NavigationMenu." +
        part +
        " must be used within a NavigationMenu",
    );
  return c;
}

export interface RootProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children?: ReactNode;
  [prop: `data-${string}`]: unknown;
}

export function Root(props: RootProps) {
  const [open, setOpen] = useControllableState(
    props.value,
    props.defaultValue ?? "",
    props.onValueChange,
  );
  const panels = useRef(new Map<string, ReactNode>());
  // Content registers during this render; the Viewport after it in the tree reads the map.
  panels.current = new Map();
  return (
    <Ctx.Provider value={{ open, setOpen, panels: panels.current }}>
      <View className={cn("relative", props.className)}>{props.children}</View>
    </Ctx.Provider>
  );
}

export function List(props: { className?: string; children?: ReactNode }) {
  return (
    <View className={cn("flex-row", props.className)}>{props.children}</View>
  );
}

export function Item(props: {
  value?: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <ItemCtx.Provider value={props.value ?? ""}>
      <View className={cn("relative", props.className)}>{props.children}</View>
    </ItemCtx.Provider>
  );
}

export function Trigger(props: { className?: string; children?: ReactNode }) {
  const c = useRoot("Trigger");
  const value = useContext(ItemCtx);
  const isOpen = c.open === value && value !== "";
  return (
    <Pressable
      className={props.className}
      dataState={isOpen ? "open" : "closed"}
      onPress={() => c.setOpen(isOpen ? "" : value)}
    >
      {props.children}
    </Pressable>
  );
}

export function Content(props: { className?: string; children?: ReactNode }) {
  const c = useRoot("Content");
  const value = useContext(ItemCtx);
  c.panels.set(
    value,
    <View className={cn("w-full", props.className)}>{props.children}</View>,
  );
  return null;
}

export function Viewport(props: { className?: string }) {
  const c = useRoot("Viewport");
  if (c.open === "" || !c.panels.has(c.open)) return null;
  return (
    <View className={cn("overflow-hidden", props.className)}>
      {c.panels.get(c.open)}
    </View>
  );
}

export function Indicator(props: { className?: string }) {
  const c = useRoot("Indicator");
  if (c.open === "") return null;
  return (
    <View className={cn("h-[2px] w-full bg-slate-900", props.className)} />
  );
}

export function Link(props: {
  asChild?: boolean;
  className?: string;
  onSelect?: () => void;
  children?: ReactNode;
}) {
  const c = useRoot("Link");
  return (
    <Pressable
      asChild={props.asChild}
      className={props.className}
      onPress={() => {
        props.onSelect?.();
        c.setOpen("");
      }}
    >
      {props.children}
    </Pressable>
  );
}
