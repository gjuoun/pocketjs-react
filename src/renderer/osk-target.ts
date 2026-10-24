// Which overlay the live mount() registered. Osk.tsx reads this instead of importing
// mount.ts (no cycle): a React root from a disposed mount must not portal a keyboard.
import type { NodeMirror } from "../internal/pocket.ts";

let current: NodeMirror | null = null;

export function setOskTarget(node: NodeMirror | null): void {
  current = node;
}

export function oskTargetIs(node: NodeMirror): boolean {
  return current === node && current !== null;
}
