// Avatar: a circle holding initials, centred. Static: no focus and no press. Three sizes: sm (24 px), md (32 px),
// lg (40 px). The circle is rounded-[N px] at half its size, because rounded-full is not in the vocabulary (compat drops it).
// IMAGE PATH: src names an image. The native library has no built image table (an image needs a build-time asset), so every
// src is a miss. A miss is never silent: the initials are drawn, onImageMissing(src) is called once, and the fallback View
// carries debugName "avatar-fallback:missing" in the mirror (no src: "avatar-fallback"). The gallery page shows the miss.
import { useLayoutEffect, useRef } from "react";
import { Text, View } from "../elements.ts";
import { useTokens } from "./theme.tsx";

export type AvatarSize = "sm" | "md" | "lg";

/** The images the library can draw. Empty: no image asset is built into the native library yet. */
const BUILT_IMAGES: ReadonlySet<string> = new Set<string>();

/** True when src names an image this library can draw. Every src is a miss while the table is empty. */
export function avatarImageBuilt(src: string): boolean {
  return BUILT_IMAGES.has(src);
}

export interface AvatarProps {
  size?: AvatarSize;
  /** An image source. Not built yet: a src is reported through onImageMissing and the initials are drawn. */
  src?: string;
  onImageMissing?: (src: string) => void;
  /** The fallback initials, drawn centred in the circle. */
  children?: string;
}

export function Avatar(props: AvatarProps) {
  const T = useTokens() as Record<string, string>;
  const size = props.size ?? "md";
  const src = props.src;
  const missing = src !== undefined && !avatarImageBuilt(src);
  const report = useRef(props.onImageMissing);
  report.current = props.onImageMissing;
  useLayoutEffect(() => {
    if (missing && src !== undefined) report.current?.(src);
  }, [missing, src]);
  return (
    <View className={T["avatar.size." + size]} debugName={missing ? "avatar-fallback:missing" : "avatar-fallback"}>
      <Text className={T["avatar.text." + size]}>{props.children}</Text>
    </View>
  );
}
