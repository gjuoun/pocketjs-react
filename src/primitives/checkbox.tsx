// Native Checkbox (batch 3), shaped like Radix's Checkbox namespace so the vendored shadcn checkbox imports it
// unchanged. Root is a Pressable that holds the checked state (controlled by `checked`, else its own through
// `defaultChecked`); a press flips it and reports onCheckedChange. Indicator draws its children only while
// checked. The Root centres the Indicator: the tick is the caller's icon.
import { createContext, type ReactNode, useContext } from "react";
import { View } from "../elements.ts";
import { cn } from "../style/cn.ts";
import { controlSurface, Pressable } from "./press.tsx";
import { useControllableState } from "./state.ts";

type CheckedState = boolean | "indeterminate";
const CheckedContext = createContext<boolean>(false);

export interface RootProps {
  checked?: CheckedState;
  defaultChecked?: CheckedState;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
  [prop: `data-${string}`]: unknown;
  [prop: `aria-${string}`]: unknown;
}

export function Root(props: RootProps) {
  const [checked, setChecked] = useControllableState<CheckedState>(
    props.checked,
    props.defaultChecked ?? false,
    (next) => props.onCheckedChange?.(next === true),
  );
  const state = checked === true ? "checked" : checked === "indeterminate" ? "indeterminate" : "unchecked";
  return (
    <CheckedContext.Provider value={checked === true}>
      <Pressable
        className={cn("flex items-center justify-center", controlSurface(checked === true, props.className))}
        disabled={props.disabled}
        dataState={state}
        onPress={() => setChecked(checked !== true)}
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

/** Its children only while the checkbox is checked. */
export function Indicator(props: IndicatorProps) {
  const checked = useContext(CheckedContext);
  if (!checked) return null;
  return <View className={cn("flex-col", props.className)}>{props.children}</View>;
}
