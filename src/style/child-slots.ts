// Child-slot rules (*:data-[slot=NAME]:BODY): BODY styles the direct child whose data-slot is NAME. The child is
// not a node the parent's class reaches, so the parent records its rules at bind, and after each commit the sweep writes
// BODY onto the child's own class (the same way sweepSelects writes an option's visibility).
import { type NodeMirror, rootMirror } from "../internal/pocket.ts";
import { childSlotRules } from "../compat/selectors.ts";
import { applyClassName } from "./class-runtime.ts";
import { cn } from "./cn.ts";

interface SlotRule {
  slot: string;
  body: string;
}

const rules = new WeakMap<NodeMirror, SlotRule[]>();
const parents = new Set<NodeMirror>();
const slotOf = new WeakMap<NodeMirror, string>();
/** The class the child's own props gave it (the compat output the style layer applied). */
const ownClass = new WeakMap<NodeMirror, string>();
/** The class the sweep last wrote onto a child, so an unchanged one is not written again. */
const written = new WeakMap<NodeMirror, string>();

/** At bind: a parent records its child-slot rules; a node records its data-slot. */
export function bindChildSlots(node: NodeMirror, props: Record<string, unknown>): void {
  const found = childSlotRules(props.className);
  if (found.length > 0) {
    rules.set(node, found);
    parents.add(node);
  } else rules.delete(node);
  const slot = props["data-slot"];
  if (typeof slot === "string") slotOf.set(node, slot);
  else slotOf.delete(node);
}

/** After the style layer applied a node's own class: the sweep must write its child-slot body again. */
export function noteOwnClass(node: NodeMirror, cls: unknown): void {
  ownClass.set(node, typeof cls === "string" ? cls : "");
  written.delete(node);
}

function attached(node: NodeMirror): boolean {
  let top = node;
  while (top.parent) top = top.parent;
  return top === rootMirror;
}

/** After a commit: every attached parent gives its matching direct children their bodies. */
export function sweepChildSlots(): void {
  for (const parent of [...parents]) {
    if (!attached(parent)) {
      parents.delete(parent);
      continue;
    }
    const list = rules.get(parent) ?? [];
    for (const child of parent.children) {
      const slot = slotOf.get(child);
      if (slot === undefined) continue;
      const bodies = list.filter((r) => r.slot === slot).map((r) => r.body);
      if (bodies.length === 0 && !written.has(child)) continue;
      const next = bodies.length === 0 ? (ownClass.get(child) ?? "") : cn(ownClass.get(child) ?? "", ...bodies);
      if (written.get(child) === next) continue;
      written.set(child, next);
      applyClassName(child, next);
    }
  }
}
