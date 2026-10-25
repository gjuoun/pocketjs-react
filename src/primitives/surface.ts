// The primitives own their surface (F4): shadcn's bg-* tokens and the full-width class the
// vendored content carries are dropped from the caller's classes, then the primitive's own panel
// classes are merged in. A caller's explicit width still wins (cn keeps the last conflict).

/**
 * The scrim behind every native overlay: slate-950 at 60% (`#0f172a` with alpha `0x99`). The
 * compiler has no alpha modifier (`bg-slate-950/60`) and no `rgba()`; an 8-digit hex is the one
 * spelling it compiles, and the core blends it (probe: #00000099 over white draws #666666).
 */
export const SCRIM_CLASS = "absolute inset-0 bg-[#0f172a99]";

export function ownSurface(className: string | undefined): string {
  return (className ?? "")
    .split(/\s+/)
    .filter(
      (token) => token !== "" && !token.startsWith("bg-") && token !== "w-full",
    )
    .join(" ");
}

const TEXT_SIZE = /^text-(2xs|xs|sm|base|lg|xl|2xl|3xl|4xl|5xl)$/;

/**
 * Text classes the core cannot honour, dropped from a title or description: `leading-*` (a
 * line-height of none draws a 1px line), and the size tokens, because a large bold run has no
 * baked font slot and draws nothing. The primitive's own size wins. C10 owns the real gaps.
 */
export function ownText(className: string | undefined): string {
  return (className ?? "")
    .split(/\s+/)
    .filter(
      (token) =>
        token !== "" && !token.startsWith("leading-") && !TEXT_SIZE.test(token),
    )
    .join(" ");
}

/**
 * Item classes the primitive owns: the focus colors are the primitive's (text does not inherit in
 * the core, so a focused row's label color has to come from its own Text), and shadcn's bg-* and
 * text-color tokens are dropped. Sizes, padding and layout stay the caller's.
 */
export function ownItem(className: string | undefined): string {
  return (className ?? "")
    .split(/\s+/)
    .filter(
      (token) =>
        token !== "" &&
        !token.startsWith("bg-") &&
        !token.startsWith("focus:") &&
        !/^text-(slate|white|black|muted|popover|primary|destructive|accent)/.test(
          token,
        ),
    )
    .join(" ");
}
