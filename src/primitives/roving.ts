// Roving focus for a group of items (Tabs, ToggleGroup, RadioGroup). The group registers one focus controller:
// while focus is on one of its items, the group's arrows move focus to the neighbour (wrapping) and, when the
// group activates on focus, press it too. Items are the nodes that registered; disabled ones are skipped. Focus
// stays inside the group on the group's axis: an arrow at the end of a non-wrapping group is consumed, not
// passed to the d-pad's linear order.
import { focusNode, getFocused, pushFocusController } from "@pocketjs/framework/input";
import { type MutableRefObject, type RefObject, useEffect, useLayoutEffect, useRef } from "react";
import type { NodeMirror } from "../internal/pocket.ts";

export interface RovingItem {
  /** Runs when the group moves focus onto this item (automatic activation). */
  activate?: () => void;
  disabled?: boolean;
}

const items = new WeakMap<NodeMirror, MutableRefObject<RovingItem>>();

/** Register a node as an item of its enclosing group. Returns the teardown. */
export function registerItem(node: NodeMirror, item: MutableRefObject<RovingItem>): () => void {
  items.set(node, item);
  return () => {
    if (items.get(node) === item) items.delete(node);
  };
}

/** The enabled items under a group, in tree order. */
function orderedItems(root: NodeMirror): NodeMirror[] {
  const out: NodeMirror[] = [];
  const walk = (n: NodeMirror) => {
    if (items.has(n) && !items.get(n)!.current.disabled) out.push(n);
    for (const k of n.children) walk(k);
  };
  walk(root);
  return out;
}

export interface RovingOptions {
  orientation: "horizontal" | "vertical";
  /** The last item's arrow goes to the first, and back. */
  loop: boolean;
  /** Moving focus also presses the item (Tabs, RadioGroup). */
  activate: boolean;
}

/** The arrows of a group: a focus controller on its node. Returns the teardown. */
export function rovingGroup(node: NodeMirror, opts: RovingOptions): () => void {
  const back = opts.orientation === "horizontal" ? "left" : "up";
  const fwd = opts.orientation === "horizontal" ? "right" : "down";
  return pushFocusController(node, (direction) => {
    if (direction !== back && direction !== fwd) return false;
    const list = orderedItems(node);
    const i = list.indexOf(getFocused() as unknown as NodeMirror);
    if (i < 0) return false;
    const step = direction === fwd ? 1 : -1;
    let j = i + step;
    if (j < 0 || j >= list.length) {
      if (!opts.loop) return true;
      j = (j + list.length) % list.length;
    }
    const next = list[j];
    focusNode(next as never);
    if (opts.activate) items.get(next)?.current.activate?.();
    return true;
  });
}

/** Give a group node its arrows for as long as it is mounted. */
export function useRovingGroup(node: RefObject<NodeMirror | null>, opts: RovingOptions): void {
  useEffect(() => {
    const n = node.current;
    if (!n) return;
    return rovingGroup(n, opts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.orientation, opts.loop, opts.activate]);
}

/** Register an item's node with its group; the latest activate and disabled are read at each move. */
export function useRovingItem(node: RefObject<NodeMirror | null>, item: RovingItem): void {
  const latest = useRef(item);
  latest.current = item;
  useLayoutEffect(() => {
    const n = node.current;
    if (!n) return;
    return registerItem(n, latest);
  }, []);
}
