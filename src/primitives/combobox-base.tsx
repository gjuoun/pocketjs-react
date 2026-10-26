// @base-ui/react Combobox shim (batch 4, R9): the subset the vendored shadcn combobox uses, on the native primitives. Root
// holds the value and the query (controlled or not) and whether the popup is open. Input is a TextField bound to the query
// (typing opens the popup). Item is a focusable row shown when it matches the query; its press selects the value and closes
// the popup. Value shows the selected value, Clear empties it, and ItemIndicator shows for the selected item.
// Named boundaries (throw when rendered): Chips, Chip, ChipRemove (multi-select) and Collection (render-prop lists).
import {
  type ReactNode,
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Text, View } from "../elements.ts";
import { TextField } from "../input/TextField.tsx";
import { cn } from "../style/cn.ts";
import { Pressable } from "./press.tsx";
import { useControllableState } from "./state.ts";

interface Ctx {
  value: unknown;
  setValue(value: unknown): void;
  query: string;
  setQuery(query: string): void;
  open: boolean;
  setOpen(open: boolean): void;
  matches: Map<symbol, boolean>;
  visible: number;
}
const Ctx = createContext<Ctx | null>(null);
const ItemCtx = createContext<{ value: unknown } | null>(null);

function useCombo(part: string): Ctx {
  const c = useContext(Ctx);
  if (!c)
    throw new Error(
      "pocketjs-react: Combobox." + part + " must be used within a Combobox",
    );
  return c;
}

export interface RootProps {
  value?: unknown;
  defaultValue?: unknown;
  onValueChange?: (value: unknown) => void;
  inputValue?: string;
  defaultInputValue?: string;
  onInputValueChange?: (value: string) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
}

export function Root(props: RootProps) {
  const [value, setValue] = useControllableState<unknown>(
    props.value,
    props.defaultValue ?? null,
    props.onValueChange,
  );
  const [query, setQuery] = useControllableState(
    props.inputValue,
    props.defaultInputValue ?? "",
    props.onInputValueChange,
  );
  const [open, setOpen] = useControllableState(
    props.open,
    props.defaultOpen ?? false,
    props.onOpenChange,
  );
  const matches = useRef(new Map<symbol, boolean>()).current;
  const [visible, setVisible] = useState(-1);
  useLayoutEffect(() => {
    let n = 0;
    for (const ok of matches.values()) if (ok) n++;
    if (n !== visible) setVisible(n);
  });
  matches.clear();
  const ctx: Ctx = {
    value,
    setValue: (v) => setValue(v),
    query,
    setQuery: (q) => {
      setQuery(q);
      setOpen(true);
    },
    open,
    setOpen: (o) => setOpen(o),
    matches,
    visible,
  };
  return (
    <Ctx.Provider value={ctx}>
      <View className="flex-col">{props.children}</View>
    </Ctx.Provider>
  );
}

export interface ValueProps {
  placeholder?: string;
  className?: string;
  children?: ReactNode | ((value: unknown) => ReactNode);
}

export function Value(props: ValueProps) {
  const c = useCombo("Value");
  const shown =
    typeof props.children === "function"
      ? props.children(c.value)
      : props.children;
  if (shown !== undefined && shown !== null)
    return <View className={props.className}>{shown}</View>;
  const text =
    c.value === null || c.value === undefined
      ? (props.placeholder ?? "")
      : String(c.value);
  return <Text className={props.className}>{text}</Text>;
}

export interface InputProps {
  placeholder?: string;
  className?: string;
  [prop: string]: unknown;
}

export function Input(props: InputProps) {
  const c = useCombo("Input");
  return (
    <TextField
      value={c.query}
      placeholder={props.placeholder}
      className={props.className}
      onChange={(e) => c.setQuery(String(e.target.value ?? ""))}
    />
  );
}

export function Trigger(props: { className?: string; children?: ReactNode }) {
  const c = useCombo("Trigger");
  return (
    <Pressable className={props.className} onPress={() => c.setOpen(!c.open)}>
      {props.children}
    </Pressable>
  );
}

export function Portal(props: { children?: ReactNode }) {
  return <>{props.children}</>;
}

export function Positioner(props: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <View className={cn("flex-col", props.className)}>{props.children}</View>
  );
}

export function Popup(props: { className?: string; children?: ReactNode }) {
  const c = useCombo("Popup");
  if (!c.open) return null;
  return (
    <View className={cn("flex-col", props.className)}>{props.children}</View>
  );
}

export function List(props: { className?: string; children?: ReactNode }) {
  return (
    <View className={cn("flex-col", props.className)}>{props.children}</View>
  );
}

export function Item(props: {
  value: unknown;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const c = useCombo("Item");
  const label = String(props.value ?? "");
  const ok =
    c.query === "" || label.toLowerCase().includes(c.query.toLowerCase());
  const key = useRef(Symbol("item")).current;
  c.matches.set(key, ok);
  if (!ok) return null;
  return (
    <ItemCtx.Provider value={{ value: props.value }}>
      <Pressable
        className={cn("flex-row items-center px-2 py-1.5", props.className)}
        disabled={props.disabled}
        onPress={() => {
          c.setValue(props.value);
          c.setOpen(false);
        }}
      >
        {props.children}
      </Pressable>
    </ItemCtx.Provider>
  );
}

export function ItemIndicator(props: {
  className?: string;
  children?: ReactNode;
}) {
  const c = useCombo("ItemIndicator");
  const item = useContext(ItemCtx);
  if (!item || item.value !== c.value) return null;
  return <View className={props.className}>{props.children}</View>;
}

export function Group(props: { className?: string; children?: ReactNode }) {
  return (
    <View className={cn("flex-col", props.className)}>{props.children}</View>
  );
}

export function GroupLabel(props: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <View className={cn("px-2 py-1.5", props.className)}>{props.children}</View>
  );
}

export function Empty(props: { className?: string; children?: ReactNode }) {
  const c = useCombo("Empty");
  if (!c.open || c.query === "" || c.visible !== 0) return null;
  return (
    <View className={cn("py-6 text-center", props.className)}>
      {props.children}
    </View>
  );
}

export function Separator(props: { className?: string }) {
  return (
    <View className={cn("h-[1px] w-full bg-slate-200", props.className)} />
  );
}

export function Clear(props: { className?: string; children?: ReactNode }) {
  const c = useCombo("Clear");
  return (
    <Pressable
      className={props.className}
      onPress={() => {
        c.setValue(null);
        c.setQuery("");
      }}
    >
      {props.children}
    </Pressable>
  );
}

function unsupported(name: string): () => never {
  return () => {
    throw new Error(
      "pocketjs-react: @base-ui/react Combobox." +
        name +
        " is not supported (the combobox shim is single-select)",
    );
  };
}

export const Chips = unsupported("Chips");
export const Chip = unsupported("Chip");
export const ChipRemove = unsupported("ChipRemove");
export const Collection = unsupported("Collection");
