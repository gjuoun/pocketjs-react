import { getOps, hostViewport } from "@pocketjs/framework/host";
// C8 selector tokens. shadcn writes node state and child rules as variant prefixes
// (disabled:, aria-invalid:, data-[state=open]:, has-[>svg]:). The core has no per-node state,
// so the compat layer resolves each one per node from the node's DOM props, before the class
// reaches the token map: a holding selector keeps its body, a failing one drops it. The build
// compiles the body of a selector token as an ordinary token and never the selector itself.

/** A variant prefix the compat layer resolves per node. */
export type Selector =
  | { kind: "disabled" }
  /** md:, lg:, xl:, 2xl: hold at or above the mount viewport width (D4). */
  | { kind: "breakpoint"; min: number }
  | { kind: "invalid" }
  | { kind: "data"; name: string; value?: string }
  | { kind: "has-svg" }
  /** has-data-[slot=v]: a direct child whose data-slot (or component name, kebab-cased) is v. */
  | { kind: "has-data"; value: string }
  /** A descendant rule ([&_svg]:, [&>svg]:): it styles the icon children, never the node. */
  | { kind: "svg" }
  /** [&[data-NAME=VALUE]>svg]:BODY: BODY styles the icon children while the node's own data-NAME is VALUE. */
  | { kind: "icon-state"; name: string; value: string }
  /** *:data-[slot=NAME]:BODY: BODY styles the direct child whose data-slot is NAME (the child takes it, never the node). */
  | { kind: "child-slot"; slot: string };

export interface SplitToken {
  /** The first variant prefix as written (`disabled`, `data-[state=open]`). */
  prefix: string;
  selector: Selector;
  /** Everything after the selector prefix: a plain token, or another variant chain. */
  body: string;
}

const DATA_SELECTOR = /^data-\[([\w-]+)(?:=([^\]]+))?\]$/;
const ICON_STATE_SELECTOR = /^\[&\[data-([\w-]+)=([^\]]+)\]>svg\]$/;

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

/** Tailwind's breakpoints in px (sm: is not kept: it would need a second layout pass). */
export const BREAKPOINTS: Readonly<Record<string, number>> = {
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
};

/** The mount viewport width: the host reports it (hostViewport); 0 when no host is installed. */
export function viewportWidth(): number {
  try {
    return hostViewport(getOps())?.w ?? 0;
  } catch {
    return 0;
  }
}

function selectorOf(prefix: string): Selector | null {
  if (prefix === "disabled") return { kind: "disabled" };
  if (prefix in BREAKPOINTS)
    return { kind: "breakpoint", min: BREAKPOINTS[prefix] };
  if (prefix === "aria-invalid") return { kind: "invalid" };
  if (prefix === "has-[>svg]") return { kind: "has-svg" };
  const slot = /^has-data-\[slot=([\w-]+)\]$/.exec(prefix);
  if (slot) return { kind: "has-data", value: slot[1] };
  if (
    prefix === "[&_svg]" ||
    prefix === "[&>svg]" ||
    prefix === "[&_svg:not([class*='text-'])]"
  )
    return { kind: "svg" };
  const icon = ICON_STATE_SELECTOR.exec(prefix);
  if (icon) return { kind: "icon-state", name: icon[1], value: icon[2] };
  const m = DATA_SELECTOR.exec(prefix);
  if (m) return { kind: "data", name: m[1], value: m[2] };
  return null;
}

/** A token whose first variant prefix is a selector this layer resolves, or null. */
export function splitSelector(tok: string): SplitToken | null {
  const parts = splitVariants(tok);
  if (parts.length < 2) return null;
  const child = /^data-\[slot=([\w-]+)\]$/.exec(parts[1]);
  if (parts[0] === "*" && child && parts.length > 2)
    return {
      prefix: "*:" + parts[1],
      selector: { kind: "child-slot", slot: child[1] },
      body: parts.slice(2).join(":"),
    };
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

/** The direct React children of a node, flattened. */
function children(value: unknown): unknown[] {
  return Array.isArray(value) ? value.flat(Infinity) : [value];
}

/** A child's slot: its data-slot prop, else its component name in kebab-case (CardAction -> card-action). */
function slotOf(child: unknown): string | undefined {
  if (!child || typeof child !== "object" || !("type" in child))
    return undefined;
  const { type, props } = child as {
    type: unknown;
    props?: Record<string, unknown>;
  };
  const slot = props?.["data-slot"];
  if (typeof slot === "string") return slot;
  if (typeof type === "function" && type.name !== "")
    return type.name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
  return undefined;
}

export function holds(sel: Selector, node: SelectorNode): boolean {
  switch (sel.kind) {
    case "disabled":
      return truthy(node.props.disabled);
    case "breakpoint":
      return viewportWidth() >= sel.min;
    case "invalid":
      return truthy(node.props["aria-invalid"]);
    case "data": {
      const v = node.props["data-" + sel.name];
      if (sel.value === undefined)
        return v !== undefined && v !== null && v !== false;
      return v !== undefined && String(v) === sel.value;
    }
    case "svg":
      return false;
    case "icon-state":
      return String(node.props["data-" + sel.name]) === sel.value;
    case "child-slot":
      return false;
    case "has-data":
      return children(node.children).some((c) => slotOf(c) === sel.value);
    case "has-svg": {
      return children(node.children).some(isSvgChild);
    }
  }
}

/** Resolve every selector token of a class string against one node; plain tokens pass through. */
export function resolveSelectors(
  className: string,
  node: SelectorNode,
): string {
  if (!className.includes(":")) return className;
  const out: string[] = [];
  const visit = (tok: string): void => {
    const split = splitSelector(tok);
    if (!split) {
      out.push(tok);
      return;
    }
    // A descendant rule is consumed here and applied to the icons by the icon colour and turn passes.
    if (
      split.selector.kind === "svg" ||
      split.selector.kind === "icon-state" ||
      split.selector.kind === "child-slot"
    )
      return;
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
    if (split?.selector.kind === "svg" && split.body.startsWith("text-"))
      return split.body;
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
    else if (s.kind === "data" || s.kind === "icon-state") names.add("data-" + s.name);
  }
  return names;
}

/** The child-slot rules of a class string: each BODY and the data-slot NAME of the child it styles. */
export function childSlotRules(className: unknown): { slot: string; body: string }[] {
  if (typeof className !== "string") return [];
  const out: { slot: string; body: string }[] = [];
  for (const tok of className.split(/\s+/)) {
    const split = splitSelector(tok);
    if (split?.selector.kind === "child-slot")
      out.push({ slot: split.selector.slot, body: split.body });
  }
  return out;
}

/**
 * The degrees a node's [&[data-…]>svg]:rotate-N rule turns its icon children: N while the rule holds, 0 while it does
 * not, undefined when the node has no such rule.
 */
export function iconTurnRule(props: Record<string, unknown>): number | undefined {
  if (typeof props.className !== "string") return undefined;
  let turn: number | undefined;
  for (const tok of props.className.split(/\s+/)) {
    const split = splitSelector(tok);
    if (split?.selector.kind !== "icon-state") continue;
    const deg = /^rotate-(\d+)$/.exec(split.body);
    if (deg) turn = holds(split.selector, { props }) ? Number(deg[1]) : 0;
  }
  return turn;
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
