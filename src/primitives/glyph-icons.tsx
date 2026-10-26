// Icon glyphs for lucide-react (codemod R7). The vendored shadcn sources import their icons from here
// instead of lucide, whose <svg> the DOM compat layer does not map. The six named here are written out;
// every other lucide export is generated into glyph-icons.gen.tsx (tools/gen-glyph-icons.ts) and
// re-exported below. Each draws its baked texture variant (tools/icon-bake.ts, pak key ui:img.icon.*).

import { GlyphIcon, type GlyphProps } from "./glyph-icon.tsx";
import { MoreHorizontalIcon } from "./glyph-icons.gen.tsx";

export { GlyphIcon, type GlyphIconProps, type GlyphProps } from "./glyph-icon.tsx";

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

// lucide's bare names (codemod R7): the vendored breadcrumb imports these, not the *Icon forms.
export function ChevronRight(props: GlyphProps) {
  return <ChevronRightIcon {...props} />;
}
export function MoreHorizontal(props: GlyphProps) {
  return <MoreHorizontalIcon {...props} />;
}

export * from "./glyph-icons.gen.tsx";
