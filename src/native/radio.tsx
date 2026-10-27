// RadioGroup: a controlled group of RadioItem rows. value is the source; onValueChange(next) reports every change.
// Arrows move focus to the next or previous enabled item and select it: UP and LEFT go back, DOWN and RIGHT go forward,
// both wrap at the ends (the item controllers return true, so the arrows stay in the group). CIRCLE selects the focused
// item. Items register in tree order, as the tabs do. vertical (default) stacks the rows; horizontal lays them in a row.
// Each item's dot is a 8 px square centred in its 20 px ring (flex centring; measured in the tests).
import { createContext, type ReactNode, useContext, useLayoutEffect, useRef } from "react";
import { focusNode, pushFocusController, type FocusDirection } from "@pocketjs/framework/input";
import { Text, View } from "../elements.ts";
import type { NodeMirror } from "../internal/pocket.ts";
import { useControllableState } from "../primitives/state.ts";
import { Focusable } from "./focusable.tsx";
import { useTokens } from "./theme.tsx";

interface Item {
  value: string;
  node: NodeMirror;
}
interface GroupValue {
  value: string;
  select: (value: string) => void;
  items: { current: Item[] };
}
const Ctx = createContext<GroupValue | null>(null);

/** The next (+1) or previous (-1) enabled item after the focused one, wrapping. */
export function stepIndex(count: number, from: number, step: 1 | -1): number {
  return (from + step + count) % count;
}

export interface RadioGroupProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  orientation?: "vertical" | "horizontal";
  children?: ReactNode;
}

export function RadioGroup(props: RadioGroupProps) {
  const T = useTokens() as Record<string, string>;
  const [value, select] = useControllableState(props.value, props.defaultValue ?? "", props.onValueChange);
  const items = useRef<Item[]>([]);
  const row = props.orientation === "horizontal";
  return (
    <Ctx.Provider value={{ value, select, items }}>
      <View className={row ? T["radio.group.row"] : T["radio.group"]}>{props.children}</View>
    </Ctx.Provider>
  );
}

export interface RadioItemProps {
  value: string;
  disabled?: boolean;
  children?: string;
}

export function RadioItem(props: RadioItemProps) {
  const T = useTokens() as Record<string, string>;
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("pocketjs-react native: RadioItem must be used inside <RadioGroup>");
  const node = useRef<NodeMirror | null>(null);
  // The controller calls the latest group context, not the one of the render that registered it.
  const latest = useRef(ctx);
  latest.current = ctx;
  const on = ctx.value === props.value;
  const enabled = !props.disabled;
  // The controller reads the group's list at the press, so it always sees the current order and wrap.
  useLayoutEffect(() => {
    if (!node.current || !enabled) return;
    const item: Item = { value: props.value, node: node.current };
    ctx.items.current.push(item);
    const release = pushFocusController(node.current as never, (direction: FocusDirection) => {
      const list = ctx.items.current;
      const i = list.indexOf(item);
      if (i < 0) return false;
      const step = direction === "down" || direction === "right" ? 1 : direction === "up" || direction === "left" ? -1 : 0;
      if (step === 0) return false;
      const next = list[stepIndex(list.length, i, step as 1 | -1)];
      focusNode(next.node as never);
      latest.current.select(next.value);
      return true;
    });
    return () => {
      release();
      ctx.items.current = ctx.items.current.filter((x) => x !== item);
    };
  }, [props.value, enabled]);
  const ring = props.disabled ? T["radio.ring.disabled"] : on ? T["radio.ring.on"] : T["radio.ring.off"];
  const dot = props.disabled ? T["radio.dot.disabled"] : T["radio.dot"];
  const look = props.disabled ? T["radio.row"] : [T["radio.row"], T["radio.focus"]].join(" ");
  const label = T[props.disabled ? "radio.label.disabled" : "radio.label.rest"];
  return (
    <Focusable look={look} disabled={props.disabled} nodeRef={node} onPress={() => latest.current.select(props.value)}>
      <View className={ring} debugName="radio-ring">
        {on ? <View className={dot} debugName="radio-dot" /> : null}
      </View>
      {props.children !== undefined ? <Text className={label}>{props.children}</Text> : null}
    </Focusable>
  );
}
