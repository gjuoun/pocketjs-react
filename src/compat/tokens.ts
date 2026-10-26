import { BREAKPOINTS, splitSelector, splitVariants } from "./selectors.ts";

// C2: the fixed shadcn vocabulary -> PocketJS vocabulary map (Jun ruling: fixed values from
// the existing 19-color Tailwind v3 palette; no build-time theme table, no dark theme).
//
// One table, two consumers, so both ends agree on the exact same string:
//   - tools/build.ts rewrites every scanned class literal before compiling the style table
//     (the mapped tokens then live in styles.bin and in STYLE_TOKENS);
//   - class-runtime rewrites an incoming className before resolving it (compat only).
// A rewrite is idempotent: no mapped target is itself a map key.
//
// Variants follow the earlier prototype: hover: -> active: (PocketJS has no pointer, so a
// press is the hover cue), focus-visible: -> focus:. Every other prefix (dark:, disabled:,
// aria-*, data-*, sm:/md:, file:, placeholder:, has-[...], [&...], [a&]) maps to nothing and
// (C4) placeholder: stays dropped at class level: the placeholder color is fixed by the field,
// not expressible as a class; the placeholder TEXT is mapped through the value prop instead.
// is counted: the fixed palette is a single light theme and the core has no such state.

/** Semantic colors and the utility aliases shadcn sources use, -> PocketJS tokens. */
export const TOKEN_MAP: Readonly<Record<string, string>> = {
  // --- semantic colors: shadcn light theme -> the 19-family palette ---------------------
  "bg-background": "bg-white",
  "bg-primary": "bg-slate-900",
  "text-primary": "text-slate-900",
  "text-primary-foreground": "text-white",
  "bg-secondary": "bg-slate-200",
  "text-secondary-foreground": "text-slate-900",
  "bg-destructive": "bg-red-600",
  "text-destructive-foreground": "text-white",
  "bg-muted": "bg-slate-100",
  "text-muted-foreground": "text-slate-500",
  "bg-accent": "bg-slate-200",
  "text-accent-foreground": "text-slate-900",
  "bg-popover": "bg-white",
  "text-popover-foreground": "text-slate-900",
  "bg-card": "bg-white",
  "text-card-foreground": "text-slate-900",
  "text-foreground": "text-slate-900",
  "border-border": "border-slate-200",
  "border-input": "border-slate-200",
  "bg-border": "bg-slate-200",
  "text-destructive": "text-red-600",
  "border-destructive": "border-red-600",
  // C8 Step 8 (Q3=A): a header with a CardAction child lays out as a row, space between (the
  // grid's [1fr_auto] columns, approximated). Both halves are selectors on the same child check.
  "has-data-[slot=card-action]:grid-cols-[1fr_auto]":
    "has-data-[slot=card-action]:flex-row has-data-[slot=card-action]:justify-between",
  // C8 Step 6: a shadow-sm is the core's one soft shadow; rem lengths are px on a 16px root.
  "shadow-sm": "shadow",
  "border-ring": "border-slate-900",
  // --- utility aliases ---------------------------------------------------------------
  "inline-flex": "flex",
  "font-medium": "font-bold",
  "font-semibold": "font-bold",
  "shadow-xs": "shadow",
  "rounded-xs": "rounded-sm",
  "transition-[color,box-shadow]": "transition-colors",
  "leading-none": "leading-[1]",
  "h-px": "h-[1px]",
  "w-px": "w-[1px]",
  // Batch A (B2, B3): size-full is both axes; shadcn's bg-primary/20 track is slate-300 (the 20%
  // tint of slate-900 on white), not the alpha-stripped slate-900 the /NN branch would give.
  "size-full": "w-full h-full",
  "bg-primary/20": "bg-slate-300",
  "-mx-1": "mx-[-4px]",
  "overflow-x-hidden": "overflow-hidden",
  "tracking-tight": "tracking-wide",
  "tracking-widest": "tracking-wide",
  // --- no PocketJS equivalent: mapped to nothing, counted (never silently kept) -------
  "w-fit": "",
  "whitespace-nowrap": "",
  "outline-none": "",
  "ml-auto": "",
  "cursor-default": "",
  "fill-current": "",
  underline: "",
  "underline-offset-4": "",
  // D5: a fixed layer leaves the flow; the sidebar container reserves its width in the gap.
  fixed: "absolute",
};

/** rounded-full compiles only with a pinned w/h in the same literal (the [R] rule throws
 *  otherwise). Spelled as a pattern, not a map key: the build scan collects every source
 *  string literal, and a bare "rounded-full" would throw during pass 1. */
const NEEDS_SIZE = /^rounded-full$/;

/** Prefixes that map onto a PocketJS variant. Anything else is dropped by the rewriter. */
const VARIANTS: Readonly<Record<string, string>> = {
  hover: "active",
  "focus-visible": "focus",
  focus: "focus",
  active: "active",
};

// C8 Step 5: every dropped token names why. The reasons are the policy, not the gap: a token in
// "animation" is a deliberate omission (no transitions in scope), "dark" is the light-only
// policy, "owned-by-primitive" is a layout the native primitive already performs, and the
// `no-core-feature` / `scroll` / `grid` reasons are the core gaps C10 tracks.
export const DROP_REASONS = [
  "not-in-build",
  "animation",
  "noop",
  "dark",
  "responsive",
  "pseudo",
  "focus-indicator",
  "owned-by-primitive",
  "grid",
  "scroll",
  "no-core-feature",
  "unmapped",
] as const;
export type DropReason = (typeof DROP_REASONS)[number];

const VARIANT_STRUCTURE = /^(\*|\[|has-|last|first|nth-|group|peer)/;

/** Why a token the map or the compiler could not keep was dropped (every drop has one). */
export function dropReason(tok: string): DropReason {
  const parts = splitVariants(tok);
  const base = parts[parts.length - 1];
  const variants = parts.slice(0, -1);
  if (variants.some((v) => v === "dark")) return "dark";
  if (
    variants.some(
      (v) => v === "[&_svg]" || v === "[&>svg]" || v.startsWith("[&_svg:"),
    )
  )
    return "noop";
  if (variants.some((v) => /^(sm|md|lg|xl|2xl)$/.test(v))) return "responsive";
  if (variants.some((v) => /^(placeholder|file|selection)$/.test(v)))
    return "pseudo";
  if (/^ring(-|$)/.test(base) || base === "border-ring")
    return "focus-indicator";
  if (variants.some((v) => VARIANT_STRUCTURE.test(v))) return "no-core-feature";
  if (
    /^(outline|select-none|pointer-events|cursor-|fill-current|whitespace-nowrap|w-fit|@container|shrink)/.test(
      base,
    )
  )
    return "noop";
  if (/^(animate-|fade-|zoom-|slide-|origin-\(|duration-)/.test(base))
    return "animation";
  if (
    /^(grid$|grid-(cols|rows)-|auto-rows-|col-(start|span)-|row-(start|span)-|self-|justify-self-)/.test(
      base,
    )
  )
    return "grid";
  if (/^(overflow-y-|overflow-x-|max-h-\(|max-h-\[var|scroll-)/.test(base))
    return "scroll";
  if (base === "aspect-square") return "owned-by-primitive";
  // A named group or peer marker (group/avatar) carries no style of its own: its variants do the work.
  if (/^(group|peer)\/[\w-]+$/.test(base)) return "noop";
  if (
    /^(fixed$|top-\[50%\]|left-\[50%\]|translate-[xy]-\[-50%\]|h-\[var\(--radix|min-w-\[var\(--radix)/.test(
      base,
    )
  )
    return "owned-by-primitive";
  // rounded-full draws only with a pinned size in the same literal (the core's [R] rule).
  if (base === "rounded-full") return "no-core-feature";
  // Negative utilities (-translate-x-1) are arbitrary-form only in the core's subset.
  if (/calc\(|^(underline|ml-auto)|^-/.test(base)) return "no-core-feature";
  return "unmapped";
}

export interface RewriteResult {
  /** The rewritten literal (whitespace-normalized). */
  text: string;
  /** Tokens that gained a PocketJS equivalent. */
  mapped: number;
  /** Tokens with no equivalent (no-op utilities, unsupported state/variants, ring-*). */
  dropped: number;
  /** The dropped tokens themselves, so the caller can count each by its reason (C8 Step 11). */
  droppedTokens: string[];
  /** Var-bound lengths (w-(--x)): kept out of the text, applied per node from the custom properties. */
  bindings: Binding[];
}

export type BindingProp =
  | "width"
  | "height"
  | "minW"
  | "minH"
  | "maxW"
  | "maxH";
export interface Binding {
  prop: BindingProp;
  /** The custom property name, with its leading dashes (--sidebar-width). */
  name: string;
}

const BINDING =
  /^(w|h|min-w|min-h|max-w|max-h)-(?:\(--([\w-]+)\)|\[--([\w-]+)\]|\[var\(--([\w-]+)\)\])$/;
const BINDING_PROP: Record<string, BindingProp> = {
  w: "width",
  h: "height",
  "min-w": "minW",
  "min-h": "minH",
  "max-w": "maxW",
  "max-h": "maxH",
};

/** A bare length utility whose value is a custom property, or null. Radix's own --radix-* positions are owned by
 *  the primitive (dropped, as before), not bound. */
export function parseBinding(tok: string): Binding | null {
  const m = BINDING.exec(tok);
  if (!m) return null;
  const name = "--" + (m[2] ?? m[3] ?? m[4]);
  if (name.startsWith("--radix-")) return null;
  return { prop: BINDING_PROP[m[1]], name };
}

/** shadcn's focus ring border: dropped, because the compat default focus border is the
 *  focus indicator. Mapped to focus:border-slate-900 it would be the button's own colour. */
const FOCUS_RING_BORDER = "focus-visible:border-ring";

/**
 * A variant prefix on every utility of a body. One source token can expand to several (size-N is
 * w-N h-N), and each of them must keep the variant: data-[size=lg]:size-10 is two prefixed tokens.
 */
function prefixEach(prefix: string, body: string): string {
  return body
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => prefix + ":" + part)
    .join(" ");
}

/** One token -> its PocketJS form, or "" when the map drops it. Pass-through otherwise. */
export function rewriteToken(tok: string): string {
  if (tok === FOCUS_RING_BORDER) return "";
  // C8: a selector the compat layer resolves per node survives the map; its body is rewritten.
  // A whole-token substitution that needs two utilities (see the has-data card header below).
  if (TOKEN_MAP[tok] !== undefined) return TOKEN_MAP[tok];
  const selector = splitSelector(tok);
  if (selector) {
    // Descendant rules keep only their icon colour: size and shrink are the icon default here,
    // and pointer-events has no pointer (no-op), so they drop.
    if (selector.selector.kind === "svg" && !selector.body.startsWith("text-"))
      return "";
    // At a breakpoint, block is a flex row (the core has no block display): the desktop sidebar root.
    const inner =
      selector.selector.kind === "breakpoint" && selector.body === "block"
        ? "flex"
        : selector.body;
    const body = rewriteToken(inner);
    return body === "" ? "" : prefixEach(selector.prefix, body);
  }
  const colon = tok.indexOf(":");
  if (colon > 0) {
    const variant = tok.slice(0, colon);
    // D4: a breakpoint variant is a selector the compat layer resolves per node (selectors.ts): kept as written.
    if (variant in BREAKPOINTS) {
      // The core has no block display: at a breakpoint, block is a flex row (the desktop sidebar root: gap and container side by side).
      const inner = tok.slice(colon + 1);
      const body = rewriteToken(inner === "block" ? "flex" : inner);
      return body === "" ? "" : prefixEach(variant, body);
    }
    const mapped = VARIANTS[variant];
    if (mapped === undefined) return ""; // dark:, disabled:, aria-*, data-*, [&...], has-[...], ...
    const body = rewriteToken(tok.slice(colon + 1));
    return body === "" ? "" : prefixEach(mapped, body);
  }
  const hit = TOKEN_MAP[tok];
  if (hit !== undefined) return hit;
  // /NN opacity modifier: PocketJS colors carry no alpha channel.
  const opacity = /^(.*)\/\d+$/.exec(tok);
  if (opacity) return rewriteToken(opacity[1]);
  // size-N is w-N h-N on a flexbox core.
  const size = /^size-(\d+(?:\.\d+)?)$/.exec(tok);
  if (size) return "w-" + size[1] + " h-" + size[1];
  // C8 Step 6: rem arbitrary lengths are px (1rem = 16px, the core's root size).
  const rem = /^(-?)([a-z-]+)-\[(\d+(?:\.\d+)?)rem\]$/.exec(tok);
  if (rem)
    return rem[1] + rem[2] + "-[" + Math.round(Number(rem[3]) * 16) + "px]";
  // ring-* draws an outline the core does not have (C10); ring-offset-* likewise.
  if (tok === "ring" || tok.startsWith("ring-")) return "";
  if (NEEDS_SIZE.test(tok)) return "";
  return tok;
}

/** Rewrite a whole class literal; also reports how many tokens the map moved or dropped. */
export function rewrite(cls: string): RewriteResult {
  const tokens = cls.trim().split(/\s+/).filter(Boolean);
  const out: string[] = [];
  const droppedTokens: string[] = [];
  const bindings: Binding[] = [];
  let mapped = 0;
  for (const tok of tokens) {
    const bind = parseBinding(tok);
    if (bind) {
      bindings.push(bind);
      continue;
    }
    const next = rewriteToken(tok);
    if (next === "") {
      droppedTokens.push(tok);
    } else {
      if (next !== tok) mapped++;
      out.push(next);
    }
  }
  return {
    text: out.join(" "),
    mapped,
    dropped: droppedTokens.length,
    droppedTokens,
    bindings,
  };
}

export function rewriteLiteral(cls: string): string {
  return rewrite(cls).text;
}
