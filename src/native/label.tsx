// Label: a text that names a control. It has no focus and no press of its own. States: rest (slate-900) and
// disabled (slate-500, 4.76:1 on white). Its input is judged on the control it names.
import { Text } from "../elements.ts";
import { useTokens } from "./theme.tsx";

export interface LabelProps {
  disabled?: boolean;
  children?: string;
}

export function Label(props: LabelProps) {
  const T = useTokens() as Record<string, string>;
  const look = [T["label.base"], props.disabled ? T["label.disabled"] : T["label.rest"]].join(" ");
  return <Text className={look}>{props.children}</Text>;
}
