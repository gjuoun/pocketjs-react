// Focus ring spec (compat only). A ring utility on a DOM-mapped focusable is not a layout class: the
// focus ring is an absolute overlay node drawn just outside the box (src/focus/ring.ts), so the ring
// tokens are lifted out of the className here and never reach the style table. A ring token this
// file does not understand stays in the className, and the token map drops and counts it as before.
import type { NodeMirror } from "../internal/pocket.ts";

export interface RingSpec {
  /** Ring width in px. */
  width: number;
  /** Ring colour, #rrggbb. */
  colour: string;
}

/** The default focus ring: 2px, blue-600 (the pinned focus colour). */
export const DEFAULT_RING: RingSpec = { width: 2, colour: "#2563eb" };

/** The colours a ring utility may name. ring-ring is the theme ring, blue-600 here (F2 A). */
const PALETTE: Record<string, string> = {
  ring: "#2563eb",
  "blue-600": "#2563eb",
  "blue-500": "#3b82f6",
  "red-600": "#dc2626",
  "slate-900": "#0f172a",
  white: "#ffffff",
  black: "#000000",
};

/** A focus or focus-visible variant prefix on a ring utility (a bare ring utility is also a focus ring). */
const FOCUS_PREFIX = /^(?:focus-visible|focus):/;

export interface ParsedRing {
  /** The className without the ring tokens this file understood. */
  rest: string;
  /** The ring the tokens name, or null when the className names no ring. */
  ring: RingSpec | null;
}

/** Lift the ring tokens this file understands out of a className. Unknown ring tokens stay in `rest`. */
export function parseRing(className: string | undefined): ParsedRing {
  const kept: string[] = [];
  let ring = null as RingSpec | null;
  for (const tok of (className ?? "").trim().split(/\s+/).filter(Boolean)) {
    const base = tok.replace(FOCUS_PREFIX, "");
    const spec = base.startsWith("ring") ? ringToken(base) : undefined;
    if (spec === undefined) {
      kept.push(tok);
      continue;
    }
    ring = { width: spec.width ?? ring?.width ?? DEFAULT_RING.width, colour: spec.colour ?? ring?.colour ?? DEFAULT_RING.colour };
  }
  return { rest: kept.join(" "), ring };
}

/** The width and/or colour one ring token names; undefined when the token is not one this file understands. */
function ringToken(base: string): { width?: number; colour?: string } | undefined {
  if (base === "ring") return { width: 3 };
  const width = /^ring-(0|1|2|4|8)$/.exec(base) ?? /^ring-\[(\d+)px\]$/.exec(base);
  if (width) return { width: Number(width[1]) };
  const hex = /^ring-\[#([0-9a-fA-F]{6})\]$/.exec(base);
  if (hex) return { colour: "#" + hex[1].toLowerCase() };
  const named = /^ring-(.+?)(?:\/\d+)?$/.exec(base);
  if (named && named[1] !== "offset" && !named[1].startsWith("offset-")) {
    const colour = PALETTE[named[1]];
    if (colour !== undefined) return { colour };
  }
  return undefined;
}

/** The ring a focusable DOM-mapped node draws, by node. Set by the compat layer at create and update. */
const targets = new WeakMap<NodeMirror, RingSpec>();

/** Register a DOM-mapped focusable's ring (its own tokens, or the default). */
export function setRingTarget(node: NodeMirror, ring: RingSpec | null): void {
  if (ring === null) targets.delete(node);
  else targets.set(node, ring);
}

/** The ring a node draws when focused, or undefined when it is not a DOM-mapped focusable. */
export function ringTargetOf(node: NodeMirror): RingSpec | undefined {
  return targets.get(node);
}
