// Button: a Focusable with a variant and size look, and a label Text. Every class is a token from TOKENS.
// States: rest, focused (focus border), pressed (active background), disabled (no focus, no press).
import type { Ref } from "react";
import { Text } from "../elements.ts";
import type { NodeMirror } from "../internal/pocket.ts";
import { Focusable } from "./focusable.tsx";
import { TOKENS } from "./tokens.ts";

export type ButtonVariant = "default" | "secondary" | "destructive" | "outline" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  onPress?: () => void;
  nodeRef?: Ref<NodeMirror>;
  children?: string;
}

const T = TOKENS as Record<string, string>;

export function Button(props: ButtonProps) {
  const variant = props.variant ?? "default";
  const size = props.size ?? "md";
  const look = props.disabled
    ? [T["button.base"], T["button.size." + size], T["button.disabled"]].join(" ")
    : [T["button.base"], T["button.size." + size], T["button." + variant + ".rest"], T["button." + variant + ".press"], T["button.focus"]].join(" ");
  const text = props.disabled ? T["button.disabled.text"] : T["button." + variant + ".text"];
  const label = [T[size === "lg" ? "button.label.lg" : "button.label.sm"], text].join(" ");
  return (
    <Focusable look={look} disabled={props.disabled} onPress={props.onPress} nodeRef={props.nodeRef}>
      <Text className={label}>{props.children}</Text>
    </Focusable>
  );
}
