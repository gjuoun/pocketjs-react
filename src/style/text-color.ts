// JG-156 text-colour inheritance (compat only). The core carries a text colour from a `text`
// element to its own text runs, but a `view` ancestor's colour never reaches a text run below it, so
// a shadcn `bg-white text-slate-900` card paints its title white. After each React commit this pass
// gives every top-most text run (a text node whose parent is not a text node) that sets no colour of
// its own an inline textColor: the nearest ancestor's colour, or the mount default. A node with its
// own colour, or with a focus:/active: text variant, stays native: an inline override beats a class
// variant on the core, so writing one there would kill the variant.
import { NODE_TYPE, type NodeMirror, setProp } from "../internal/pocket.ts";
import { classBaseValue, classVariantOwns } from "./class-runtime.ts";

/** The core's own default text colour (white), used when a release finds no class colour. */
const CORE_DEFAULT = 0xffffffff;

let fallback: number | null = null;
/** The override this pass last wrote on a node (ABGR); absent when the node carries none. */
const written = new WeakMap<NodeMirror, number>();

/** "#rgb", "#rgba", "#rrggbb" or "#rrggbbaa" to the core's ABGR u32. */
export function abgr(hex: string): number {
  let h = hex.slice(1);
  if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) : 255;
  return ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
}

/** Turn the pass on with the mount's default colour, or off (null). Set by installCompat. */
export function setTextInheritance(defaultColor: string | null): void {
  fallback = defaultColor === null ? null : abgr(defaultColor);
}

/** The colour a node inherits when no ancestor sets one: the mount default, or the core default. */
export function defaultTextColour(): number {
  return fallback ?? CORE_DEFAULT;
}

/** A style write outside this pass replaced the node's textColor: forget the override it wrote. */
export function forgetTextOverride(node: NodeMirror): void {
  written.delete(node);
}

/** One pass over the tree after a commit. `inlineOf` reads a node's inline textColor, if any. */
export function sweepTextColor(
  root: NodeMirror,
  inlineOf: (node: NodeMirror) => string | undefined,
): void {
  if (fallback === null) return;
  visit(root, fallback, false, inlineOf);
}

function visit(
  node: NodeMirror,
  inherited: number,
  underText: boolean,
  inlineOf: (node: NodeMirror) => string | undefined,
): void {
  const inline = inlineOf(node);
  const own =
    inline !== undefined ? abgr(inline) : classBaseValue(node, "textColor");
  const colour = own ?? inherited;
  const isText = node.type === NODE_TYPE.text;
  if (isText) {
    if (!underText && own === undefined && !classVariantOwns(node, "textColor"))
      want(node, inherited);
    else release(node);
  }
  for (const child of node.children) visit(child, colour, isText, inlineOf);
}

function want(node: NodeMirror, colour: number): void {
  if (written.get(node) === colour) return;
  setProp(node, "style", { textColor: colour }, {});
  written.set(node, colour);
}

/** Hand the node back to its class (or the core default) when this pass had overridden it. */
function release(node: NodeMirror): void {
  if (!written.has(node)) return;
  setProp(
    node,
    "style",
    { textColor: classBaseValue(node, "textColor") ?? CORE_DEFAULT },
    {},
  );
  written.delete(node);
}
