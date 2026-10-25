// Icon glyphs for lucide-react (codemod R7, fork F1=A). The vendored shadcn sources import their
// icons from here instead of lucide, whose <svg> the DOM compat layer does not map. Each icon draws
// its baked texture variant (tools/icon-bake.ts, pak key ui:img.icon.*); a pak without the variant
// falls back to the old one-character placeholder and counts an iconMiss.

import { countIconMiss } from "../compat/stats.ts";
import { Image, Text, View } from "../elements.ts";
import { cn } from "../style/cn.ts";
import { iconVariantHandle } from "../style/icon-colour.ts";
import { iconName } from "../style/icon-names.ts";

export interface GlyphProps {
  className?: string;
}

// JG-156: the glyph is a view that centres its character. A text run alone draws at the top-left of
// its box, and a stretched box stretched the character. The colour is inherited from the surface
// the icon sits on (trigger, item or panel), so a light surface gets a dark glyph. The pb-[3px] lifts the
// character's ink 1.5px to the box centre (JG-156 R3b, placeholder polish; C7 replaces it).
function Glyph(props: GlyphProps & { char: string }) {
  return (
    <View className={cn("flex items-center justify-center", props.className)}>
      <Text className="text-sm pb-[3px]">{props.char}</Text>
    </View>
  );
}

export interface GlyphIconProps extends GlyphProps {
  /** The lucide icon name, as baked (tools/icon-bake.ts ICONS). */
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

export function XIcon(props: GlyphProps) {
  return <GlyphIcon {...props} name="x" px={16} char="x" />;
}
export function CheckIcon(props: GlyphProps) {
  return <GlyphIcon {...props} name="check" px={16} char="+" />;
}
export function CircleIcon(props: GlyphProps) {
  return <GlyphIcon {...props} name="circle" px={8} char="o" />;
}
export function ChevronDownIcon(props: GlyphProps) {
  return <GlyphIcon {...props} name="chevron-down" px={16} char="v" />;
}
export function ChevronUpIcon(props: GlyphProps) {
  return <GlyphIcon {...props} name="chevron-up" px={16} char="^" />;
}
export function ChevronRightIcon(props: GlyphProps) {
  return <GlyphIcon {...props} name="chevron-right" px={16} char=">" />;
}
