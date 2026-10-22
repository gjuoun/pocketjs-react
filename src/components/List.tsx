// <List>: a vertical, d-pad-operable list. Every item is focusable; UP/DOWN move focus in
// order and CIRCLE calls onSelect. Item classes merge over the defaults with cn, so a
// conditional class (on && "bg-emerald-700") wins over the default background.
//
// With `visibleCount`, only that many items are drawn (the screen has no scroll view): UP/DOWN
// move a window over the items, so a long list such as a table of contents stays reachable.
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { focusNode, getFocused, pushFocusController } from "@pocketjs/framework/input";
import { View } from "../elements.ts";
import { cn } from "../style/cn.ts";
import type { NodeMirror } from "../internal/pocket.ts";

export const LIST_ITEM_CLASS = "flex-row items-center justify-between px-3 py-1 rounded-lg bg-slate-800 focus:bg-blue-600";

export interface ListProps<T> {
  items: readonly T[];
  renderItem: (item: T, index: number) => ReactNode;
  onSelect?: (item: T, index: number) => void;
  keyOf?: (item: T, index: number) => string | number;
  className?: string;
  itemClassName?: string | ((item: T, index: number) => string | false | null | undefined);
  /** Draw at most this many items and scroll the window with the focus. */
  visibleCount?: number;
  /** Item focused when the list mounts. */
  initialIndex?: number;
}

export function List<T>(props: ListProps<T>) {
  const { items, renderItem, onSelect, keyOf, className, itemClassName, visibleCount } = props;
  const windowed = visibleCount !== undefined && items.length > visibleCount;
  const count = windowed ? visibleCount! : items.length;
  const [focus, setFocus] = useState(() => Math.min(props.initialIndex ?? 0, Math.max(0, items.length - 1)));
  const [start, setStart] = useState(() => (windowed ? Math.max(0, Math.min(focus - Math.floor(count / 2), items.length - count)) : 0));
  const container = useRef<NodeMirror>(null);
  const nodes = useRef(new Map<number, NodeMirror>());
  const wantFocus = useRef<number | null>(props.initialIndex !== undefined ? focus : null);
  const state = useRef({ focus, start });
  state.current = { focus, start };

  useLayoutEffect(() => {
    if (!windowed || !container.current) return;
    return pushFocusController(container.current as never, (direction) => {
      if (direction !== "up" && direction !== "down") return false;
      const focused = getFocused();
      let current = state.current.focus;
      for (const [i, node] of nodes.current) if (node === (focused as unknown)) current = i;
      const next = current + (direction === "down" ? 1 : -1);
      if (next < 0 || next >= items.length) return true; // stay at the ends
      let s = state.current.start;
      if (next < s) s = next;
      if (next >= s + count) s = next - count + 1;
      wantFocus.current = next;
      setFocus(next);
      setStart(s);
      return true;
    });
  }, [windowed, items.length, count]);

  useLayoutEffect(() => {
    if (wantFocus.current === null) return;
    const node = nodes.current.get(wantFocus.current);
    wantFocus.current = null;
    if (node) focusNode(node as never);
  });

  const shown = items.slice(start, start + count);
  return (
    <View ref={container} className={cn("flex-col gap-1", className)}>
      {shown.map((item, k) => {
        const index = start + k;
        return (
          <View
            key={keyOf ? keyOf(item, index) : index}
            ref={(node: NodeMirror | null) => {
              if (node) nodes.current.set(index, node);
              else nodes.current.delete(index);
            }}
            className={cn(LIST_ITEM_CLASS, typeof itemClassName === "function" ? itemClassName(item, index) : itemClassName)}
            focusable
            onPress={onSelect ? () => onSelect(item, index) : undefined}
            debugName={String(keyOf ? keyOf(item, index) : index)}
          >
            {renderItem(item, index)}
          </View>
        );
      })}
    </View>
  );
}
