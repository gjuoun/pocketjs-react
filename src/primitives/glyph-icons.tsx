// Text glyph stand-ins for lucide-react (codemod R7, fork F1=A). The vendored shadcn sources import
// their icons from here instead of lucide, whose <svg> the DOM compat layer does not map. Each icon
// is one ASCII character in the build's font, so it draws today; C7 replaces them with real icons.

import { Text } from "../elements.ts";
import { cn } from "../style/cn.ts";

export interface GlyphProps {
  className?: string;
}

function glyph(char: string) {
  return function Glyph(props: GlyphProps) {
    return <Text className={cn("text-sm text-white", props.className)}>{char}</Text>;
  };
}

export const XIcon = glyph("x");
export const CheckIcon = glyph("+");
export const CircleIcon = glyph("o");
export const ChevronDownIcon = glyph("v");
export const ChevronUpIcon = glyph("^");
export const ChevronRightIcon = glyph(">");
