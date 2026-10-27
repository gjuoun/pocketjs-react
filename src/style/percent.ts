// Percentage lengths (compat only). The core has no percent: w-1/2, top-3/4, min-w-1/3 and -translate-y-1/2 are
// resolved to whole pixels against a reference box, as the var bindings resolve (vars.ts). A size or inset fraction
// multiplies the PARENT's box, as CSS does; a translate fraction multiplies the node's own declared size.
// Each commit re-resolves the nodes whose class changed; a full pass re-resolves every percent node: on each frame
// when the host has nodeRect (one call per box), and on a throttle otherwise (a hit-test search per box is costly).
// A reference that cannot be measured yet (not laid out, or off screen) keeps the prop's last value. An inline style
// on the same prop still wins.
import { getOps, hostViewport } from "@pocketjs/framework/host";
import type { Percent, PercentProp } from "../compat/tokens.ts";
import { type NodeMirror, rootMirror, setProp } from "../internal/pocket.ts";
import { type Box, measureBox } from "../primitives/anchor.ts";

const declared = new WeakMap<NodeMirror, Percent[]>();
/** Nodes with a declared percent, or with a resolved value still to restore. A full pass visits these. */
const touched = new Set<NodeMirror>();
/** Nodes whose percent declaration changed since the last pass. A commit pass visits only these. */
const dirty = new Set<NodeMirror>();
/** The core value this pass last wrote per node and prop. */
const written = new WeakMap<NodeMirror, Partial<Record<PercentProp, number>>>();

/** The percent lengths a node's class declares (replaces the previous set). */
export function setPercents(node: NodeMirror, list: Percent[]): void {
  if (list.length > 0) declared.set(node, list);
  else declared.delete(node);
  touched.add(node);
  dirty.add(node);
}

export interface PercentHooks {
  /** The node has an inline style for this core prop (it owns the prop). */
  inlineHas(node: NodeMirror, prop: PercentProp): boolean;
  /** The class base value for the prop, if the class sets it. */
  classBase(node: NodeMirror, prop: PercentProp): number | undefined;
  /** The core default for the prop. */
  defaultOf(prop: PercentProp): number;
  /** The node's own declared px size on an axis (inline style, else its class), undefined when it is not a fixed px size. */
  declaredSize(node: NodeMirror, axis: Percent["axis"]): number | undefined;
}

interface Size {
  w: number;
  h: number;
}

function attached(node: NodeMirror): boolean {
  for (let n: NodeMirror | null = node; n; n = n.parent)
    if (n === rootMirror) return true;
  return false;
}

/** The measured box of a node, cached for one pass so siblings and children share one search. */
function boxOf(node: NodeMirror, cache: Map<NodeMirror, Size | null>): Size | null {
  if (!cache.has(node)) {
    const b: Box | null = measureBox(node);
    cache.set(node, b ? { w: b.w, h: b.h } : null);
  }
  return cache.get(node) ?? null;
}

/** The reference box of a fraction: the parent's (the viewport under the root), or the node's own. */
function referenceOf(node: NodeMirror, of: Percent["of"], cache: Map<NodeMirror, Size | null>): Size | null {
  if (of === "self") return boxOf(node, cache);
  const parent = node.parent;
  if (!parent || parent === rootMirror) {
    const vp = hostViewport(getOps());
    return vp && vp.w > 0 && vp.h > 0 ? vp : null;
  }
  return boxOf(parent, cache);
}

/** One pass: write each percent prop as its fraction of the reference length, and restore props no longer declared.
 *  full = every percent node; otherwise only the nodes whose declaration changed since the last pass. */
export function sweepPercents(hooks: PercentHooks, full: boolean): void {
  const visit = full ? [...touched] : [...dirty];
  dirty.clear();
  const cache = new Map<NodeMirror, Size | null>();
  for (const node of visit) {
    if (!attached(node)) {
      touched.delete(node);
      written.delete(node);
      continue;
    }
    const list = declared.get(node) ?? [];
    const prev = written.get(node) ?? {};
    const next: Partial<Record<PercentProp, number>> = {};
    for (const p of list) {
      if (hooks.inlineHas(node, p.prop)) continue;
      // A translate of a fixed-size node takes the declared size (exact on any core); measuring is the fallback.
      let length = p.of === "self" ? hooks.declaredSize(node, p.axis) : undefined;
      if (length === undefined) {
        const ref = referenceOf(node, p.of, cache);
        if (ref) length = p.axis === "w" ? ref.w : ref.h;
      }
      // No reference yet (not laid out, or off screen): the prop keeps its last value.
      if (length === undefined) {
        if (prev[p.prop] !== undefined) next[p.prop] = prev[p.prop];
        continue;
      }
      next[p.prop] = Math.round(p.fraction * length);
    }
    const delta: Record<string, number> = {};
    let changed = false;
    for (const key of Object.keys(next) as PercentProp[]) {
      if (prev[key] !== next[key]) {
        delta[key] = next[key] as number;
        changed = true;
      }
    }
    for (const key of Object.keys(prev) as PercentProp[]) {
      if (key in next || hooks.inlineHas(node, key)) continue;
      delta[key] = hooks.classBase(node, key) ?? hooks.defaultOf(key);
      changed = true;
    }
    if (changed) setProp(node, "style", delta, {});
    if (Object.keys(next).length > 0) written.set(node, next);
    else written.delete(node);
    if (list.length === 0 && Object.keys(next).length === 0) touched.delete(node);
  }
}
