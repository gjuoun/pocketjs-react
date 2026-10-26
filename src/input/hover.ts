// Web hover (compat only). The web reader sets globalThis.__pocketHover before the app mounts;
// native hosts never do, so with the gate off a Menu or Select row is exactly what it was before.
// A hoverable row carries two transparent overlay children (absolute, inset-0), which the core paints natively:
//   - a hover overlay (active:bg-blue-600), lit while the pointer is over that row;
//   - a suppress overlay (active:bg-slate-800, the panel colour), lit on the focused row while another row
//     is hovered, so only one row is blue at a time (one highlight).
// The pump lights them on a pointer move with setActive. Focus never moves.
import { getOps } from "@pocketjs/framework/host";
import { getFocused } from "@pocketjs/framework/input";
import type { NodeMirror } from "../internal/pocket.ts";

type Kind = "hover" | "suppress";
const kinds = new WeakMap<NodeMirror, Kind>();

/** True only on the web reader, which sets the gate before mount. */
export function isHoverEnabled(): boolean {
  return (globalThis as { __pocketHover?: boolean }).__pocketHover === true;
}

/** Ref targets of a row's two overlay children. */
export function markHoverOverlay(node: NodeMirror | null): void {
  if (node) kinds.set(node, "hover");
}
export function markSuppressOverlay(node: NodeMirror | null): void {
  if (node) kinds.set(node, "suppress");
}

/** The overlay child of a row with the given kind, or null. */
function overlayOf(row: NodeMirror, kind: Kind): NodeMirror | null {
  const kids = row.children;
  if (!Array.isArray(kids)) return null;
  for (const kid of kids) if (kinds.get(kid) === kind) return kid;
  return null;
}

/** The nearest row at or above `node` that carries an overlay of this kind. */
function rowWith(node: NodeMirror | null, kind: Kind): NodeMirror | null {
  for (let n = node; n; n = n.parent) if (overlayOf(n, kind)) return n;
  return null;
}

let litHover: NodeMirror | null = null;
let litSuppress: NodeMirror | null = null;

/** Set the two lit overlays, clearing the previous ones. A detached overlay has no live row: it is dropped. */
function light(hover: NodeMirror | null, suppress: NodeMirror | null): void {
  const ops = getOps();
  if (litHover !== hover) {
    if (litHover?.parent) ops.setActive?.(litHover.id, 0);
    if (hover) ops.setActive?.(hover.id, 1);
    litHover = hover;
  }
  if (litSuppress !== suppress) {
    if (litSuppress?.parent) ops.setActive?.(litSuppress.id, 0);
    if (suppress) ops.setActive?.(suppress.id, 1);
    litSuppress = suppress;
  }
}

/**
 * A pointer move over `target`. Hover claims the highlight: the hovered row lights, and the focused row
 * (if it is a different row) is suppressed to the panel colour. Hovering the focused row lights nothing
 * (its own focus blue stands). A press in progress shows its own colour, so nothing lights.
 */
export function hoverMove(target: NodeMirror | null, pressing: boolean): void {
  if (pressing) return light(null, null);
  const focusRow = rowWith(getFocused(), "suppress");
  for (let n = target; n; n = n.parent) {
    const hover = overlayOf(n, "hover");
    if (!hover) continue;
    if (n === focusRow) return light(null, null);
    return light(hover, focusRow ? overlayOf(focusRow, "suppress") : null);
  }
  light(null, null);
}

/**
 * True while a hover row is lit. A lit row is the one highlight on screen, so the focus ring yields to
 * it: a ring on a compat control and a blue row must never show together.
 */
export function hoverClaimsHighlight(): boolean {
  return litHover !== null;
}

/** Clear both: the pointer left, a press began, or focus moved. */
export function hoverClear(): void {
  light(null, null);
}
