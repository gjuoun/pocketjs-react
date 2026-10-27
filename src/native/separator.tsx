// Separator: a 1 px rule. Static: no focus and no press. Two states: horizontal (full width of its parent) and
// vertical (full height of its parent row, so it centres with the row's items).
import { View } from "../elements.ts";
import { useTokens } from "./theme.tsx";

export interface SeparatorProps {
  orientation?: "horizontal" | "vertical";
}

export function Separator(props: SeparatorProps) {
  const T = useTokens() as Record<string, string>;
  return <View className={T["separator." + (props.orientation ?? "horizontal")]} />;
}
