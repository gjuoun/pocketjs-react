// JG-156 textual views. A DOM text tag (span, p, label, ...) that carries flex is mapped to a view
// (its layout is the point: the badge's label centres in it). A view draws no text, and a text size or
// weight on a view does not reach a run under it (a text-2xl view's run keeps the default size). So a
// run under such a view is placed in a text element that carries the view's size and weight.
//
// The holder carries the view's size and weight (one font slot per combination, baked by the build
// from the source's size and weight tokens). Its colour is inherited from the view by the colour pass.
import {
  createElement,
  insertNode,
  type NodeMirror,
} from "../internal/pocket.ts";
import { applyClassName } from "../style/class-runtime.ts";

const SIZE = /^text-(2xs|xs|sm|base|lg|xl|2xl|3xl|4xl|5xl)$/;
const BOLD = /^font-(bold|semibold|medium)$/;
/** The holder class for a textual view's className: its size and weight, nothing else. */
export function holderClass(className: string): string {
  const tokens = className.split(/\s+/);
  const size = tokens.find((t) => SIZE.test(t));
  const bold = tokens.some((t) => BOLD.test(t));
  return [size, bold ? "font-bold" : undefined]
    .filter((t) => t !== undefined)
    .join(" ");
}

/** The text classes of each textual view, by node. */
const holderClasses = new WeakMap<NodeMirror, string>();
/** The text element that holds a raw run, by run. */
const holders = new WeakMap<NodeMirror, NodeMirror>();

/** Record a textual view's holder class (called from the compat bind hook). */
export function markTextual(view: NodeMirror, className: unknown): void {
  const cls = typeof className === "string" ? holderClass(className) : "";
  if (cls !== "") holderClasses.set(view, cls);
}

/** The node that stands in the tree for a React child: a raw run under a textual view is held by a text element. */
export function holdRun(parent: NodeMirror, child: NodeMirror): NodeMirror {
  const cls = holderClasses.get(parent);
  if (cls === undefined || child.domTag !== "#text") return child;
  const held = holders.get(child);
  if (held) return held;
  const element = createElement("text");
  applyClassName(element, cls);
  insertNode(element, child);
  holders.set(child, element);
  return element;
}

/** The node a React child was inserted as (its holder, when it has one). */
export function heldBy(child: NodeMirror): NodeMirror {
  return holders.get(child) ?? child;
}
