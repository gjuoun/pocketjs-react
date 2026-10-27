// Badge: a short inline label in a fixed 20 px box. Static: no focus and no press. States: one rest look per
// variant (default, secondary, destructive, outline), each with its own text ink. One size.
import { Text, View } from "../elements.ts";
import { useTokens } from "./theme.tsx";

export type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

export interface BadgeProps {
  variant?: BadgeVariant;
  children?: string;
}

export function Badge(props: BadgeProps) {
  const T = useTokens() as Record<string, string>;
  const v = props.variant ?? "default";
  const look = [T["badge.base"], T["badge." + v + ".rest"]].join(" ");
  const label = [T["badge.label"], T["badge." + v + ".text"]].join(" ");
  return (
    <View className={look}>
      <Text className={label}>{props.children}</Text>
    </View>
  );
}
