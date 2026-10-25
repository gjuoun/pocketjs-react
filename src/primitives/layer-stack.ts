// C6 layer stack: every open ModalLayer registers its panel and its close. The pointer pump reads the
// top entry, so a tap outside the top panel closes that layer (innermost first) and never reaches the
// app behind it. A layer opened inside another is pushed after it, so it is the top.

import type { NodeMirror } from "../internal/pocket.ts";

export interface Layer {
  /** The focus-trapped panel, or null before it has mounted. */
  panel: () => NodeMirror | null;
  close: () => void;
}

const stack: Layer[] = [];

/** Register an open layer. Returns the teardown that removes it. */
export function pushLayer(layer: Layer): () => void {
  stack.push(layer);
  return () => {
    const index = stack.indexOf(layer);
    if (index >= 0) stack.splice(index, 1);
  };
}

/** The innermost open layer, or undefined when none is open. */
export function topLayer(): Layer | undefined {
  return stack[stack.length - 1];
}
