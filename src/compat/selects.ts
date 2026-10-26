// Batch 1: the native select's visible row. A select shows one option: the one its value (else its
// defaultValue) names, else the one marked selected, else the first. The options are bound before the value is
// final (a controlled select changes between commits), so the visible row is decided after each commit by
// sweepSelects, which the style layer runs from afterCommit. An option's class is rewritten only when its
// visibility changes; the hidden ones carry the `hidden` class (display none).

import { type NodeMirror, rootMirror } from "../internal/pocket.ts";
import { applyClassName } from "../style/class-runtime.ts";
import { cn } from "../style/cn.ts";

interface OptionState {
  value: string | undefined;
  selected: boolean;
  /** The option's own classes, before the visibility class. */
  base: string;
  /** Last visibility written, undefined until the first sweep. */
  shown: boolean | undefined;
}

const selects = new Set<NodeMirror>();
const selectValue = new WeakMap<NodeMirror, string | undefined>();
const options = new WeakMap<NodeMirror, OptionState>();

const text = (v: unknown): string | undefined =>
  v === undefined || v === null ? undefined : String(v);

/** A select's value, read when it binds: value wins over defaultValue. */
export function bindSelect(node: NodeMirror, props: Record<string, unknown>): void {
  selects.add(node);
  selectValue.set(node, text(props.value) ?? text(props.defaultValue));
}

export function bindOption(node: NodeMirror, props: Record<string, unknown>): void {
  options.set(node, {
    value: text(props.value),
    selected: props.selected === true || props.selected === "",
    base: typeof props.className === "string" ? props.className : "",
    shown: undefined,
  });
}

function attached(node: NodeMirror): boolean {
  let top = node;
  while (top.parent) top = top.parent;
  return top === rootMirror;
}

/** The options under a select, in document order (through its optgroups). */
function optionsOf(node: NodeMirror, out: NodeMirror[] = []): NodeMirror[] {
  for (const child of node.children) {
    if (options.has(child)) out.push(child);
    else optionsOf(child, out);
  }
  return out;
}

function setShown(node: NodeMirror, state: OptionState, visible: boolean): void {
  if (state.shown === visible) return;
  state.shown = visible;
  applyClassName(node, visible ? state.base : cn(state.base, "hidden"));
}

/** After a commit: every attached select shows exactly its chosen option. */
export function sweepSelects(): void {
  for (const select of [...selects]) {
    if (!attached(select)) {
      selects.delete(select);
      continue;
    }
    const opts = optionsOf(select);
    if (opts.length === 0) continue;
    const value = selectValue.get(select);
    const state = (n: NodeMirror) => options.get(n)!;
    const chosen =
      opts.find((n) => (value !== undefined ? state(n).value === value : state(n).selected)) ??
      opts[0];
    for (const n of opts) setShown(n, state(n), n === chosen);
  }
}
