// Custom properties and var bindings (compat only). A style key `--name` is stored on its node; a descendant whose
// class binds a length to it (`w-(--sidebar-width)`) takes the nearest declaration above it, as CSS does. The core has
// no custom properties, so the binding is resolved to a concrete core prop after each React commit (the sweep), and an
// inline style on the same node still beats the binding. A removed binding hands its prop back to the class or default.
import { rootMirror, type NodeMirror, setProp } from "../internal/pocket.ts";
import type { Binding, BindingProp } from "../compat/tokens.ts";

const declared = new WeakMap<NodeMirror, Record<string, string>>();
const bound = new WeakMap<NodeMirror, Binding[]>();
/** Nodes with a binding, or with a binding write still outstanding. The sweep visits only these. */
const touched = new Set<NodeMirror>();
/** The core value this pass last wrote per node and prop. */
const written = new WeakMap<NodeMirror, Partial<Record<BindingProp, number>>>();

/** The custom properties a node declares in its style (replaces the previous set). */
export function setNodeVars(
  node: NodeMirror,
  vars: Record<string, string>,
): void {
  if (Object.keys(vars).length > 0) declared.set(node, vars);
  else declared.delete(node);
}

/** The bindings a node's class declares (replaces the previous set). */
export function setBindings(node: NodeMirror, list: Binding[]): void {
  if (list.length > 0) {
    bound.set(node, list);
    touched.add(node);
  } else bound.delete(node);
}

/** The raw value of `name` at or above the node: the nearest declaration wins. */
export function lookupVar(node: NodeMirror, name: string): string | undefined {
  for (let n: NodeMirror | null = node; n; n = n.parent) {
    const v = declared.get(n)?.[name];
    if (v !== undefined) return v;
  }
  return undefined;
}

/** A custom property value as px: `Npx`, `Nrem` (16 px root, as tokens.ts) or a bare number; undefined otherwise. */
export function varLength(raw: string): number | undefined {
  const m = /^(-?\d+(?:\.\d+)?)(px|rem)?$/.exec(raw.trim());
  if (!m) return undefined;
  return parseFloat(m[1]) * (m[2] === "rem" ? 16 : 1);
}

export interface SweepHooks {
  /** The node has an inline style for this core prop (it owns the prop). */
  inlineHas(node: NodeMirror, prop: BindingProp): boolean;
  /** The class base value for the prop, if the class sets it. */
  classBase(node: NodeMirror, prop: BindingProp): number | undefined;
  /** The core default for the prop. */
  defaultOf(prop: BindingProp): number;
}

function attached(node: NodeMirror): boolean {
  for (let n: NodeMirror | null = node; n; n = n.parent)
    if (n === rootMirror) return true;
  return false;
}

/** One pass after a commit: write each bound prop from its custom property, and restore props no longer bound. */
export function sweepVars(hooks: SweepHooks): void {
  for (const node of [...touched]) {
    if (!attached(node)) {
      touched.delete(node);
      continue;
    }
    const list = bound.get(node) ?? [];
    const prev = written.get(node) ?? {};
    const next: Partial<Record<BindingProp, number>> = {};
    for (const b of list) {
      if (hooks.inlineHas(node, b.prop)) continue;
      const raw = lookupVar(node, b.name);
      const px = raw === undefined ? undefined : varLength(raw);
      if (px !== undefined) next[b.prop] = px;
    }
    const delta: Record<string, number> = {};
    let changed = false;
    for (const key of Object.keys(next) as BindingProp[]) {
      if (prev[key] !== next[key]) {
        delta[key] = next[key] as number;
        changed = true;
      }
    }
    for (const key of Object.keys(prev) as BindingProp[]) {
      if (key in next || hooks.inlineHas(node, key)) continue;
      delta[key] = hooks.classBase(node, key) ?? hooks.defaultOf(key);
      changed = true;
    }
    if (changed) setProp(node, "style", delta, {});
    if (Object.keys(next).length > 0) written.set(node, next);
    else written.delete(node);
    if (list.length === 0 && Object.keys(next).length === 0)
      touched.delete(node);
  }
}
