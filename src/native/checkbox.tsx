// Checkbox: a focusable row of a box and an optional label. Controlled: checked is the source and onCheckedChange(next)
// reports every press. Three states: unchecked (empty box), checked (a tick drawn from two rotated bars inside the box) and
// indeterminate (a dash; a press makes it checked). CIRCLE on the row toggles it. disabled keeps the box and takes no
// focus and no press. The tick is two rotate-45 and rotate-135 bars: the core draws rotated rects (probe: 4x12 bar, 66 px).
import type { ReactNode } from "react";
import { Text, View } from "../elements.ts";
import { Focusable } from "./focusable.tsx";
import { useTokens } from "./theme.tsx";

export type CheckedState = boolean | "indeterminate";

export interface CheckboxProps {
  checked?: CheckedState;
  onCheckedChange?: (next: boolean) => void;
  disabled?: boolean;
  children?: string;
}

/** The value a press reports: an unchecked or indeterminate box becomes checked; a checked box becomes unchecked. */
export function nextChecked(checked: CheckedState | undefined): boolean {
  return checked !== true;
}

export function Checkbox(props: CheckboxProps) {
  const T = useTokens() as Record<string, string>;
  const state: CheckedState = props.checked ?? false;
  const on = state === true;
  const mixed = state === "indeterminate";
  const lit = on || mixed;
  const box = props.disabled
    ? [T["checkbox.box"], lit ? T["checkbox.box.disabled.on"] : T["checkbox.box.disabled"]].join(" ")
    : [T["checkbox.box"], lit ? T["checkbox.box.on"] : T["checkbox.box.off"]].join(" ");
  const row = props.disabled ? T["checkbox.row"] : [T["checkbox.row"], T["checkbox.focus"]].join(" ");
  const label = T[props.disabled ? "checkbox.label.disabled" : "checkbox.label.rest"];
  const marks: ReactNode = on
    ? [<View key="s" className={T["checkbox.mark.short"]} />, <View key="l" className={T["checkbox.mark.long"]} />]
    : mixed ? <View className={T["checkbox.dash"]} /> : null;
  return (
    <Focusable look={row} disabled={props.disabled} onPress={() => props.onCheckedChange?.(nextChecked(state))}>
      <View className={box}>{marks}</View>
      {props.children !== undefined ? <Text className={label}>{props.children}</Text> : null}
    </Focusable>
  );
}
