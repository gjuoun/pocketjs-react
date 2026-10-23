// C2: the fixed shadcn vocabulary -> PocketJS vocabulary map (Jun ruling: fixed values from
// the existing 19-color Tailwind v3 palette; no build-time theme table, no dark theme).
//
// One table, two consumers, so both ends agree on the exact same string:
//   - tools/build.ts rewrites every scanned class literal before compiling the style table
//     (the mapped tokens then live in styles.bin and in STYLE_TOKENS);
//   - class-runtime rewrites an incoming className before resolving it (compat only).
// A rewrite is idempotent: no mapped target is itself a map key.
//
// Variants follow the JG-145 L3 prototype: hover: -> active: (PocketJS has no pointer, so a
// press is the hover cue), focus-visible: -> focus:. Every other prefix (dark:, disabled:,
// aria-*, data-*, sm:/md:, file:, placeholder:, has-[...], [&...], [a&]) maps to nothing and
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
  "underline": "",
  "underline-offset-4": "",
  // rounded-full needs a build-time known w/h in the same literal ([R] rule would throw).
  "rounded-full": "",
};

/** Prefixes that map onto a PocketJS variant. Anything else is dropped by the rewriter. */
const VARIANTS: Readonly<Record<string, string>> = {
  hover: "active",
  "focus-visible": "focus",
  focus: "focus",
  active: "active",
};

export interface RewriteResult {
  /** The rewritten literal (whitespace-normalized). */
  text: string;
  /** Tokens that gained a PocketJS equivalent. */
  mapped: number;
  /** Tokens with no equivalent (no-op utilities, unsupported state/variants, ring-*). */
  dropped: number;
}

/** One token -> its PocketJS form, or "" when the map drops it. Pass-through otherwise. */
export function rewriteToken(tok: string): string {
  const colon = tok.indexOf(":");
  if (colon > 0) {
    const variant = tok.slice(0, colon);
    const mapped = VARIANTS[variant];
    if (mapped === undefined) return ""; // dark:, disabled:, aria-*, data-*, [&...], has-[...], ...
    const body = rewriteToken(tok.slice(colon + 1));
    return body === "" ? "" : mapped + ":" + body;
  }
  const hit = TOKEN_MAP[tok];
  if (hit !== undefined) return hit;
  // /NN opacity modifier: PocketJS colors carry no alpha channel.
  const opacity = /^(.*)\/\d+$/.exec(tok);
  if (opacity) return rewriteToken(opacity[1]);
  // size-N is w-N h-N on a flexbox core.
  const size = /^size-(\d+(?:\.\d+)?)$/.exec(tok);
  if (size) return "w-" + size[1] + " h-" + size[1];
  // ring-* draws an outline the core does not have (C10); ring-offset-* likewise.
  if (tok === "ring" || tok.startsWith("ring-")) return "";
  return tok;
}

/** Rewrite a whole class literal; also reports how many tokens the map moved or dropped. */
export function rewrite(cls: string): RewriteResult {
  const tokens = cls.trim().split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let mapped = 0;
  let dropped = 0;
  for (const tok of tokens) {
    const next = rewriteToken(tok);
    if (next === "") {
      dropped++;
    } else {
      if (next !== tok) mapped++;
      out.push(next);
    }
  }
  return { text: out.join(" "), mapped, dropped };
}

export function rewriteLiteral(cls: string): string {
  return rewrite(cls).text;
}
