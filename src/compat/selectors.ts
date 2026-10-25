// C8 selector tokens. shadcn writes node state and child rules as variant prefixes
// (disabled:, aria-invalid:, data-[state=open]:, has-[>svg]:). The core has no per-node state,
// so the compat layer resolves each one per node from the node's DOM props, before the class
// reaches the token map: a holding selector keeps its body, a failing one drops it. The build
// compiles the body of a selector token as an ordinary token and never the selector itself.

/** A variant prefix the compat layer resolves per node. */
export type Selector =
  | { kind: "disabled" }
  | { kind: "invalid" }
  | { kind: "data"; name: string; value?: string }
  | { kind: "has-svg" }
  /** A descendant rule ([&_svg]:, [&>svg]:): it styles the icon children, never the node. */
  | { kind: "svg" };

export interface SplitToken {
  /** The first variant prefix as written (`disabled`, `data-[state=open]`). */
  prefix: string;
  selector: Selector;
  /** Everything after the selector prefix: a plain token, or another variant chain. */
  body: string;
}

const DATA_SELECTOR = /^data-\[([\w-]+)(?:=([^\]]+))?\]$/;

/** Split a token at its top-level colons: colons inside [...] or (...) belong to a selector. */
export function splitVariants(tok: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < tok.length; i++) {
    const ch = tok[i];
    if (ch === "[" || ch === "(") depth++;
    else if (ch === "]" || ch === ")") depth--;
    else if (ch === ":" && depth === 0) {
      parts.push(tok.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(tok.slice(start));
  return parts;
}

function selectorOf(prefix: string): Selector | null {
  if (prefix === "disabled") return { kind: "disabled" };
  if (prefix === "aria-invalid") return { kind: "invalid" };
  if (prefix === "has-[>svg]") return { kind: "has-svg" };
  if (prefix === "[&_svg]" || prefix === "[&>svg]" || prefix === "[&_svg:not([class*='text-'])]")
    return { kind: "svg" };
  const m = DATA_SELECTOR.exec(prefix);
  if (m) return { kind: "data", name: m[1], value: m[2] };
  return null;
}

/** A token whose first variant prefix is a selector this layer resolves, or null. */
export function splitSelector(tok: string): SplitToken | null {
  const parts = splitVariants(tok);
  if (parts.length < 2) return null;
  const selector = selectorOf(parts[0]);
  if (!selector) return null;
  return { prefix: parts[0], selector, body: parts.slice(1).join(":") };
}

/** The DOM props a node's selectors read, and its React children (for has-[>svg]). */
export interface SelectorNode {
  props: Record<string, unknown>;
  children?: unknown;
}

const truthy = (v: unknown): boolean => v === true || v === "" || v === "true";

/** A React child that draws an svg: a raw <svg>, or a lucide-style icon component (`*Icon`). */
function isSvgChild(child: unknown): boolean {
  if (!child || typeof child !== "object" || !("type" in child)) return false;
  const type = (child as { type: unknown }).type;
  if (type === "svg") return true;
  return typeof type === "function" && /Icon$/.test(type.name);
}

export function holds(sel: Selector, node: SelectorNode): boolean {
  switch (sel.kind) {
    case "disabled":
      return truthy(node.props.disabled);
    case "invalid":
      return truthy(node.props["aria-invalid"]);
    case "data": {
      const v = node.props["data-" + sel.name];
      if (sel.value === undefined) return v !== undefined && v !== null && v !== false;
      return v !== undefined && String(v) === sel.value;
    }
    case "svg":
      return false;
    case "has-svg": {
      const list = Array.isArray(node.children) ? node.children.flat(Infinity) : [node.children];
      return list.some(isSvgChild);
    }
  }
}

/** Resolve every selector token of a class string against one node; plain tokens pass through. */
export function resolveSelectors(className: string, node: SelectorNode): string {
  if (!className.includes(":")) return className;
  const out: string[] = [];
  const visit = (tok: string): void => {
    const split = splitSelector(tok);
    if (!split) {
      out.push(tok);
      return;
    }
    // A descendant rule is consumed here and applied to the icons by the icon colour pass.
    if (split.selector.kind === "svg") return;
    if (holds(split.selector, node)) visit(split.body);
  };
  for (const tok of className.trim().split(/\s+/)) if (tok !== "") visit(tok);
  return out.join(" ");
}

/** The text-colour utility a node's [&_svg]:text-* rule gives its icon descendants, or undefined. */
export function iconTextRule(className: unknown): string | undefined {
  if (typeof className !== "string") return undefined;
  for (const tok of className.split(/\s+/)) {
    const split = splitSelector(tok);
    if (split?.selector.kind === "svg" && split.body.startsWith("text-")) return split.body;
  }
  return undefined;
}

/** The DOM prop names a class string's selectors read (disabled, aria-invalid, data-*). */
export function selectorInputs(className: unknown): Set<string> {
  const names = new Set<string>();
  if (typeof className !== "string") return names;
  for (const tok of className.split(/\s+/)) {
    const split = splitSelector(tok);
    if (!split) continue;
    const s = split.selector;
    if (s.kind === "disabled") names.add("disabled");
    else if (s.kind === "invalid") names.add("aria-invalid");
    else if (s.kind === "data") names.add("data-" + s.name);
  }
  return names;
}

/** The build's view of a literal: every selector token replaced by its innermost body. */
export function bodiesOnly(literal: string): string {
  const innermost = (tok: string): string => {
    const split = splitSelector(tok);
    return split ? innermost(split.body) : tok;
  };
  return literal
    .trim()
    .split(/\s+/)
    .filter((tok) => tok !== "")
    .map(innermost)
    .join(" ");
}
