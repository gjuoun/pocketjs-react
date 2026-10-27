// Avatar: a circle holding initials, centred. Static: no focus and no press. Three sizes: sm (24 px), md (32 px),
// lg (40 px). Image sources are not built: they need build-time assets, so the fallback is the only state.
// The circle is rounded-[N px] at half its size, because rounded-full is not in the vocabulary (compat drops it).
import { Text, View } from "../elements.ts";
import { useTokens } from "./theme.tsx";

export type AvatarSize = "sm" | "md" | "lg";

export interface AvatarProps {
  size?: AvatarSize;
  /** The fallback initials, drawn centred in the circle. */
  children?: string;
}

export function Avatar(props: AvatarProps) {
  const T = useTokens() as Record<string, string>;
  const size = props.size ?? "md";
  return (
    <View className={T["avatar.size." + size]}>
      <Text className={T["avatar.text." + size]}>{props.children}</Text>
    </View>
  );
}
