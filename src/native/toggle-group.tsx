// ToggleGroup: a row (or column) of Toggle buttons that share one value. type "single" holds at most one value, and a press
// on the active item is a no-op (the same list comes back, so no change is reported); "multiple" holds a string[] and a
// press adds or removes its value. Arrows walk the enabled items (roving focus, wrapping at the ends) without toggling:
// CIRCLE is the toggle. Controlled: value (string for single, string[] for multiple) and onValueChange(next); or
// defaultValue. Each item carries debugName "toggle-item:<value>", so a test reads its box and samples the pressed fill.
import { createContext, type ReactNode, useContext, useRef } from "react";
import { Text, View } from "../elements.ts";
import type { NodeMirror } from "../internal/pocket.ts";
import { useRovingGroup, useRovingItem } from "../primitives/roving.ts";
import { useControllableState } from "../primitives/state.ts";
import { Focusable } from "./focusable.tsx";
import { toggleLook } from "./toggle.tsx";
import { useTokens } from "./theme.tsx";

export type ToggleGroupType = "single" | "multiple";

/** The values after a press: single keeps the active value (a no-op press returns the same list), multiple toggles it. */
export function toggleGroupValues(type: ToggleGroupType, current: string[], value: string): string[] {
  if (type === "single") return current.includes(value) ? current : [value];
  return current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
}

const toArray = (v: string | string[] | undefined): string[] | undefined =>
  v === undefined ? undefined : Array.isArray(v) ? v : v === "" ? [] : [v];

interface GroupValue {
  type: ToggleGroupType;
  values: string[];
  toggle: (value: string) => void;
}
const Ctx = createContext<GroupValue | null>(null);

function useGroup(part: string): GroupValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("pocketjs-react native: " + part + " must be used inside <ToggleGroup>");
  return ctx;
}

export interface ToggleGroupProps {
  type?: ToggleGroupType;
  value?: string | string[];
  defaultValue?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  orientation?: "horizontal" | "vertical";
  children?: ReactNode;
}

export function ToggleGroup(props: ToggleGroupProps) {
  const T = useTokens() as Record<string, string>;
  const type = props.type ?? "single";
  const root = useRef<NodeMirror | null>(null);
  const [values, setValues] = useControllableState<string[]>(
    toArray(props.value),
    toArray(props.defaultValue) ?? [],
    (next) => props.onValueChange?.(type === "multiple" ? next : (next[0] ?? "")),
  );
  const orientation = props.orientation ?? "horizontal";
  // Arrows move focus only; the press is the toggle, as shadcn's group does.
  useRovingGroup(root, { orientation, loop: true, activate: false });
  const group: GroupValue = { type, values, toggle: (value) => setValues(toggleGroupValues(type, values, value)) };
  return (
    <Ctx.Provider value={group}>
      <View ref={root} className={orientation === "vertical" ? T["toggle.group.col"] : T["toggle.group"]}>
        {props.children}
      </View>
    </Ctx.Provider>
  );
}

export interface ToggleGroupItemProps {
  value: string;
  disabled?: boolean;
  children?: ReactNode;
}

export function ToggleGroupItem(props: ToggleGroupItemProps) {
  const T = useTokens() as Record<string, string>;
  const group = useGroup("ToggleGroupItem");
  const node = useRef<NodeMirror | null>(null);
  const disabled = props.disabled === true;
  useRovingItem(node, { disabled });
  const on = group.values.includes(props.value);
  const { look, label } = toggleLook(T, on, disabled);
  return (
    <Focusable
      look={look}
      disabled={disabled}
      nodeRef={node}
      debugName={"toggle-item:" + props.value}
      onPress={() => group.toggle(props.value)}
    >
      {props.children !== undefined ? <Text className={label}>{props.children}</Text> : null}
    </Focusable>
  );
}
