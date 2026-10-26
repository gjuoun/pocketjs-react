// Default focus indicator (compat only). A DOM-mapped focusable draws a 2px blue border
// while it has focus: the core applies and removes the focus: variant itself, so no JS focus hook
// is involved. An author focus border (a focus:border* class after the token map, or an inline
// borderColor/borderWidth) keeps its own. The order matters: a colour class also pushes
// borderWidth=1 (tailwind.ts), so the width token comes last.
import { rewrite } from "./tokens.ts";

/** The default focus ring: colour first, then the width that the colour class would overwrite. */
export const DEFAULT_FOCUS = "focus:border-blue-600 focus:border-2";

/** True when the node already owns its focus border. */
export function ownsFocusBorder(className: string | undefined, style: unknown): boolean {
  if (style !== null && typeof style === "object" && ("borderColor" in style || "borderWidth" in style))
    return true;
  return rewrite(className ?? "").text.split(" ").some((tok) => tok.startsWith("focus:border"));
}

/** The className a focusable compat node carries: the author classes plus the default focus border. */
export function withDefaultFocus(className: string | undefined, style: unknown): string {
  if (ownsFocusBorder(className, style)) return className ?? "";
  const own = (className ?? "").trim();
  return own === "" ? DEFAULT_FOCUS : own + " " + DEFAULT_FOCUS;
}
