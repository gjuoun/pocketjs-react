// Per-colour icon variants. The core cannot tint a texture, so an icon's colour is chosen by
// swapping its Image to the baked variant of the colour it inherits. The inheritance follows the text
// colour rules (text-color.ts): an inline colour, else the focus: colour of a focused node (the core
// applies focus natively to text but not to an image), else the class base colour, else the parent's.

import { getOps } from "@pocketjs/framework/host";
import { getFocused } from "@pocketjs/framework/input";
import { countIconMiss } from "../compat/stats.ts";
import { NODE_TYPE, type NodeMirror } from "../internal/pocket.ts";
import { classBaseValue, classVariantValue } from "./class-runtime.ts";
import { ICON_COLOUR_NAMES, ICON_COLOURS, ICON_NAME, type IconColour, iconName } from "./icon-names.ts";
import { abgr } from "./text-color.ts";

const handles = new Map<string, number>();

/** Record the core handle of a baked variant the mount uploaded (its registry name, without `ui:img.`). */
export function registerIconVariant(id: string, handle: number): void {
  handles.set(id, handle);
}

/** The core handle of a baked variant, or undefined when the pak does not carry it. */
export function iconVariantHandle(id: string): number | undefined {
  return handles.get(id);
}

interface Applied {
  /** The Image's `src` prop when this pass last wrote its texture; a new prop forces a write. */
  domSrc: string;
  handle: number;
  id: string;
}
const applied = new WeakMap<NodeMirror, Applied>();
const missed = new WeakMap<NodeMirror, string>();

/** The variant name an icon Image currently draws (for tests and diagnostics). */
export function iconVariantOf(node: NodeMirror): string | undefined {
  return applied.get(node)?.id;
}

type InlineOf = (node: NodeMirror) => string | undefined;

const PALETTE = ICON_COLOUR_NAMES.map((name) => ({ name, colour: abgr(ICON_COLOURS[name]) }));

/** The palette colour nearest to an ABGR colour (RGB distance; alpha is ignored). */
function nearest(colour: number): IconColour {
  let best = PALETTE[0];
  let bestD = Infinity;
  for (const p of PALETTE) {
    let d = 0;
    for (let shift = 0; shift < 24; shift += 8) {
      const k = ((colour >>> shift) & 255) - ((p.colour >>> shift) & 255);
      d += k * k;
    }
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best.name;
}

let focusSeen: NodeMirror | null | undefined;

/** One pass over the tree: every icon Image takes the variant of the colour it inherits. */
export function sweepIconColour(root: NodeMirror, inlineOf: InlineOf, inherited: number): void {
  focusSeen = getFocused();
  visit(root, inherited, focusSeen, inlineOf);
}

/** Run the pass only when focus moved since the last one (focus changes between React commits). */
export function syncIconColour(root: NodeMirror, inlineOf: InlineOf, inherited: number): void {
  if (getFocused() !== focusSeen) sweepIconColour(root, inlineOf, inherited);
}

function visit(node: NodeMirror, inherited: number, focused: NodeMirror | null | undefined, inlineOf: InlineOf): void {
  const inline = inlineOf(node);
  let own: number | undefined;
  if (inline !== undefined) own = abgr(inline);
  else if (node === focused) own = classVariantValue(node, "textColor", "focus") ?? classBaseValue(node, "textColor");
  else own = classBaseValue(node, "textColor");
  const colour = own ?? inherited;
  if (node.type === NODE_TYPE.image) want(node, colour);
  for (const child of node.children) visit(child, colour, focused, inlineOf);
}

function want(node: NodeMirror, colour: number): void {
  const domSrc = node.domAttrs?.src;
  if (typeof domSrc !== "string") return;
  const m = ICON_NAME.exec(domSrc);
  if (!m) return;
  const id = iconName(m[1], Number(m[2]), nearest(colour));
  const handle = iconVariantHandle(id);
  if (handle === undefined) {
    if (missed.get(node) !== id) {
      missed.set(node, id);
      countIconMiss();
    }
    return;
  }
  const prev = applied.get(node);
  if (prev && prev.domSrc === domSrc && prev.handle === handle) return;
  getOps().setImage(node.id, handle);
  applied.set(node, { domSrc, handle, id });
}
