// Text glyph stand-ins for lucide-react (codemod R7, fork F1=A). The vendored shadcn sources import
// their icons from here instead of lucide, whose <svg> the DOM compat layer does not map. Each icon
// is one ASCII character in the build's font, so it draws today; C7 replaces them with real icons.

import { Text } from "../elements.ts";
import { cn } from "../style/cn.ts";

export interface GlyphProps {
  className?: string;
}

function Glyph(props: GlyphProps & { char: string }) {
  return (
    <Text className={cn("text-sm text-white", props.className)}>
      {props.char}
    </Text>
  );
}

export function XIcon(props: GlyphProps) {
  return <Glyph {...props} char="x" />;
}
export function CheckIcon(props: GlyphProps) {
  return <Glyph {...props} char="+" />;
}
export function CircleIcon(props: GlyphProps) {
  return <Glyph {...props} char="o" />;
}
export function ChevronDownIcon(props: GlyphProps) {
  return <Glyph {...props} char="v" />;
}
export function ChevronUpIcon(props: GlyphProps) {
  return <Glyph {...props} char="^" />;
}
export function ChevronRightIcon(props: GlyphProps) {
  return <Glyph {...props} char=">" />;
}
