// Focus indicator ownership (compat only). A DOM-mapped focusable's default focus indicator is the
// focus ring overlay (src/focus/ring.ts): an absolute node drawn outside the box, so it takes no layout
// space. An author focus border (a focus:border* class, or an inline borderColor/borderWidth) owns the
// focus look instead, and no ring is drawn for that node.
import { rewrite } from "./tokens.ts";

/** True when the node already owns its focus border. */
export function ownsFocusBorder(className: string | undefined, style: unknown): boolean {
  if (style !== null && typeof style === "object" && ("borderColor" in style || "borderWidth" in style))
    return true;
  return rewrite(className ?? "").text.split(" ").some((tok) => tok.startsWith("focus:border"));
}
