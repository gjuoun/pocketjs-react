// Batch A (R-L): the label map. A Label is not focusable; a tap on its box focuses the control whose
// DOM id it names (Radix's <label htmlFor> click). Labels register from their own node, controls from
// the compat bind hook, which sees each element's id. Controls are held weakly, and a control counts
// only while it is still in the tree.

import { focusNode } from "@pocketjs/framework/input";
import { type NodeMirror, rootMirror } from "../internal/pocket.ts";
import { hitsWithin } from "../primitives/anchor.ts";

const labels = new Map<NodeMirror, string>();
const controls = new Map<string, WeakRef<NodeMirror>>();

/** A DOM element with an id: the control a label with that htmlFor focuses. */
export function registerControl(id: string, node: NodeMirror): void {
  controls.set(id, new WeakRef(node));
}

/** A Label's node and its htmlFor; forgetLabel on unmount or when htmlFor changes. */
export function setLabel(node: NodeMirror, htmlFor: string): void {
  labels.set(node, htmlFor);
}

export function forgetLabel(node: NodeMirror): void {
  labels.delete(node);
}

function attached(node: NodeMirror): boolean {
  let top = node;
  while (top.parent) top = top.parent;
  return top === rootMirror;
}

function controlOf(htmlFor: string): NodeMirror | undefined {
  const node = controls.get(htmlFor)?.deref();
  if (node === undefined) return undefined;
  if (!attached(node)) {
    controls.delete(htmlFor);
    return undefined;
  }
  return node;
}

/** The control of the label under (x, y), or null: the tap's fallback when no focusable is hit. */
export function labelControlAt(x: number, y: number): NodeMirror | null {
  for (const [node, htmlFor] of labels) {
    if (!attached(node) || !hitsWithin(node, x, y)) continue;
    const control = controlOf(htmlFor);
    if (control !== undefined) return control;
  }
  return null;
}

/** Focus the control a tap on a label names. Returns true when a control took the focus. */
export function focusLabelControlAt(x: number, y: number): boolean {
  const control = labelControlAt(x, y);
  if (control === null) return false;
  focusNode(control);
  return true;
}
