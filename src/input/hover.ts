// Web hover (compat only). The web reader sets globalThis.__pocketHover before the app mounts;
// native hosts never do, so with the gate off a Menu or Select row is exactly what it was before.
// A hoverable row carries one transparent overlay child (absolute, inset-0, active:bg-blue-600) that
// the core paints natively. The pump lights it on a pointer move with setActive, never by moving focus.
import { getOps } from "@pocketjs/framework/host";
import { getFocused } from "@pocketjs/framework/input";
import type { NodeMirror } from "../internal/pocket.ts";

const overlays = new WeakSet<NodeMirror>();

/** True only on the web reader, which sets the gate before mount. */
export function isHoverEnabled(): boolean {
  return (globalThis as { __pocketHover?: boolean }).__pocketHover === true;
}

/** Ref target of a row's overlay child: remember it so the pump can find it. */
export function markHoverOverlay(node: NodeMirror | null): void {
  if (node) overlays.add(node);
}

/** The overlay child of a row, or null when the row has none. */
export function hoverOverlayOf(row: NodeMirror): NodeMirror | null {
  const kids = row.children;
  if (!Array.isArray(kids)) return null;
  for (const kid of kids) if (overlays.has(kid)) return kid;
  return null;
}

/** The overlay currently lit by the pointer (at most one). */
let lit: NodeMirror | null = null;

/** The overlay of the nearest row at or above `target`: a row is any node carrying one. */
function overlayAbove(target: NodeMirror | null): NodeMirror | null {
  for (let n = target; n; n = n.parent) {
    const overlay = hoverOverlayOf(n);
    // The focused row already shows the focus blue, and its CIRCLE press blue-500: no overlay over it.
    if (overlay) return n === getFocused() ? null : overlay;
  }
  return null;
}

/** Light `next` and clear the previous overlay. A detached overlay has no live id: it is dropped, not cleared. */
function light(next: NodeMirror | null): void {
  if (next === lit) return;
  const ops = getOps();
  if (lit && lit.parent) ops.setActive?.(lit.id, 0);
  lit = next;
  if (next) ops.setActive?.(next.id, 1);
}

/** A pointer move: light the row under the point, or nothing while a press is armed (a press shows its own colour). */
export function hoverMove(target: NodeMirror | null, pressing: boolean): void {
  light(pressing ? null : overlayAbove(target));
}

/** Clear the lit overlay: the pointer left, a press began, or focus moved. */
export function hoverClear(): void {
  light(null);
}
