// Toggle: a button with a persistent pressed state. The state is the source (controlled: pressed and
// onPressedChange; uncontrolled: defaultPressed) and CIRCLE on the button flips it. The look is a rest/on token pair, so a
// pressed button fills with slate-900 and its label turns white (dark: the inverse). disabled keeps the box and takes
// neither focus nor press. The node carries debugName "toggle", so a test reads the box and samples the fill.
import { type ReactNode } from "react";
import { Text } from "../elements.ts";
import { useControllableState } from "../primitives/state.ts";
import { Focusable } from "./focusable.tsx";
import { useTokens } from "./theme.tsx";

export interface ToggleProps {
  pressed?: boolean;
  defaultPressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
  disabled?: boolean;
  children?: ReactNode;
}

/** The look of a toggle: the base and focus ring, then the state's fill and press, or the disabled pair. */
export function toggleLook(
  T: Record<string, string>,
  on: boolean,
  disabled: boolean,
): { look: string; label: string } {
  if (disabled)
    return { look: [T["toggle.base"], T["toggle.disabled"]].join(" "), label: T["toggle.text.disabled"] };
  return {
    look: [
      T["toggle.base"],
      T["toggle.focus"],
      on ? T["toggle.on"] : T["toggle.off"],
      on ? T["toggle.on.press"] : T["toggle.off.press"],
    ].join(" "),
    label: T[on ? "toggle.text.on" : "toggle.text.off"],
  };
}

export function Toggle(props: ToggleProps) {
  const T = useTokens() as Record<string, string>;
  const [pressed, setPressed] = useControllableState(props.pressed, props.defaultPressed ?? false, props.onPressedChange);
  const disabled = props.disabled === true;
  const { look, label } = toggleLook(T, pressed, disabled);
  return (
    <Focusable look={look} disabled={disabled} onPress={() => setPressed(!pressed)} debugName="toggle">
      {props.children !== undefined ? <Text className={label}>{props.children}</Text> : null}
    </Focusable>
  );
}
