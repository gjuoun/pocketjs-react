// G4 web hover (compat only). The web reader sets globalThis.__pocketHover before the app mounts;
// native hosts never do, so with the gate off a Menu or Select row is exactly what it was before.
// A hoverable row carries one transparent overlay child (absolute, inset-0, active:bg-blue-600) that
// the core paints natively. The pump lights it on a pointer move with setActive, never by moving focus.
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
