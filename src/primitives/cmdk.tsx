// cmdk shim (batch 4, R9): the command-palette names on the native primitives, so the vendored shadcn command imports
// `Command` from pocketjs-react/cmdk unchanged. Root holds the query (controlled `value`, or its own). Input is a TextField
// bound to it. An Item is a focusable Pressable shown only when its value or keywords contain the query (case-insensitive);
// its press runs onSelect. Empty shows when the query matches nothing: items count their matches each commit, so Empty
// settles one commit after the filter changes. Not built: fuzzy scoring and cmdk's sorting (matches keep source order).
import {
  type ReactNode,
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { View } from "../elements.ts";
import { TextField } from "../input/TextField.tsx";
import { cn } from "../style/cn.ts";
import { Pressable } from "./press.tsx";
import { useControllableState } from "./state.ts";

interface Ctx {
  query: string;
  setQuery(value: string): void;
  matches: Map<symbol, boolean>;
}
const Ctx = createContext<Ctx | null>(null);

function useCmd(part: string): Ctx {
  const c = useContext(Ctx);
  if (!c)
    throw new Error(
      "pocketjs-react: Command." + part + " must be used within a Command",
    );
  return c;
}

export interface RootProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children?: ReactNode;
}

function Root(props: RootProps) {
  const [query, setQuery] = useControllableState(
    props.value,
    props.defaultValue ?? "",
    props.onValueChange,
  );
  const matches = useRef(new Map<symbol, boolean>()).current;
  const [visible, setVisible] = useState(-1);
  // Items record their match during the render; the count is read after the commit and kept in state.
  useLayoutEffect(() => {
    let n = 0;
    for (const ok of matches.values()) if (ok) n++;
    if (n !== visible) setVisible(n);
  });
  matches.clear();
  return (
    <Ctx.Provider
      value={{ query, setQuery, matches, visible } as Ctx & { visible: number }}
    >
      <View className={cn("flex-col", props.className)}>{props.children}</View>
    </Ctx.Provider>
  );
}

function Input(props: {
  placeholder?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}) {
  const c = useCmd("Input");
  return (
    <TextField
      value={c.query}
      placeholder={props.placeholder}
      className={props.className}
      onChange={(e) => {
        c.setQuery(e.target.value);
        props.onValueChange?.(e.target.value);
      }}
    />
  );
}

function List(props: { className?: string; children?: ReactNode }) {
  return (
    <View className={cn("flex-col", props.className)}>{props.children}</View>
  );
}

function Empty(props: { className?: string; children?: ReactNode }) {
  const c = useCmd("Empty") as Ctx & { visible: number };
  if (c.query === "" || c.visible !== 0) return null;
  return (
    <View className={cn("py-6 text-center", props.className)}>
      {props.children}
    </View>
  );
}

function Group(props: {
  heading?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <View className={cn("flex-col", props.className)}>
      {props.heading ? (
        <View className="px-2 py-1.5">{props.heading}</View>
      ) : null}
      {props.children}
    </View>
  );
}

function Item(props: {
  value?: string;
  keywords?: string[];
  disabled?: boolean;
  onSelect?: (value: string) => void;
  className?: string;
  children?: ReactNode;
}) {
  const c = useCmd("Item");
  const value = props.value ?? "";
  const hay = [value, ...(props.keywords ?? [])].join(" ").toLowerCase();
  const ok = c.query === "" || hay.includes(c.query.toLowerCase());
  const key = useRef(Symbol("item")).current;
  c.matches.set(key, ok);
  if (!ok) return null;
  return (
    <Pressable
      className={cn("flex-row items-center px-2 py-1.5", props.className)}
      disabled={props.disabled}
      onPress={() => props.onSelect?.(value)}
    >
      {props.children}
    </Pressable>
  );
}

function Separator(props: { className?: string }) {
  return (
    <View className={cn("h-[1px] w-full bg-slate-200", props.className)} />
  );
}

export const Command = Object.assign(Root, {
  Input,
  List,
  Empty,
  Group,
  Item,
  Separator,
});
