// The baked icon draw shared by every glyph export: an Image of the colour variant the compat colour
// pass picks for the icon (src/style/icon-colour.ts). A pak without the variant falls back to a
// one-character placeholder and counts an iconMiss. glyph-icons.tsx and the generated lucide exports
// (glyph-icons.gen.tsx) both build on it.

import { countIconMiss } from "../compat/stats.ts";
import { Image, Text, View } from "../elements.ts";
import { cn } from "../style/cn.ts";
import { iconVariantHandle } from "../style/icon-colour.ts";
import { iconName } from "../style/icon-names.ts";

export interface GlyphProps {
  className?: string;
}

// The glyph is a view that centres its character. A text run alone draws at the top-left of its box,
// and a stretched box stretched the character. The colour is inherited from the surface the icon sits
// on (trigger, item or panel), so a light surface gets a dark glyph.
function Glyph(props: GlyphProps & { char: string }) {
  return (
    <View className={cn("flex items-center justify-center", props.className)}>
      <Text className="text-sm pb-[3px]">{props.char}</Text>
    </View>
  );
}

export interface GlyphIconProps extends GlyphProps {
  /** The lucide icon name, as baked (tools/icon-bake.ts). */
  name: string;
  /** Design size in px: 16 (size-4) or 8 (size-2). */
  px: 8 | 16;
  /** The placeholder character drawn when the pak does not carry the icon. */
  char: string;
}

/** A baked icon. The Image draws the colour variant the compat colour pass picks for it. */
export function GlyphIcon({ name, px, char, className }: GlyphIconProps) {
  const src = iconName(name, px, "slate-900");
  if (iconVariantHandle(src) === undefined) {
    countIconMiss();
    return <Glyph char={char} className={className} />;
  }
  return (
    <View className={cn("flex items-center justify-center", className)}>
      <Image src={src} className={px === 16 ? "size-4" : "size-2"} />
    </View>
  );
}
