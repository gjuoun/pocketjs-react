// ScrollArea: a fixed-extent viewport over a column of rows that is windowed, the todo list's Rows pattern generalized.
// Only the window around the offset is mounted, so a hundred rows cost four nodes; the offset is the index of the first
// mounted row. The viewport owns UP and DOWN: they move the core focus to the neighbouring row and, when it would leave
// the window, shift the window and focus the new row once it mounts (the focused row always lands inside the viewport).
// A held drag on a row scrolls by whole rows: the Step 0 probe proved pointermove and drags reach the guest on the web
// host, so the drag is available here. Controlled: value (the window start) and onOffsetChange(next); or defaultValue.
import { Children, type ReactNode, useLayoutEffect, useRef } from "react";
import { focusNode, getFocused, pushFocusController, type FocusDirection } from "@pocketjs/framework/input";
import { Text, View } from "../elements.ts";
import { registerDrag } from "../input/pointer.ts";
import type { NodeMirror } from "../internal/pocket.ts";
import { firstFocusable } from "../primitives/anchored.tsx";
import { useControllableState } from "../primitives/state.ts";
import { useTokens } from "./theme.tsx";

/** Where the window must start so that row index is inside it: the current window stays put while it can. */
export function scrollToChild(index: number, visible: number, count: number, start = 0): number {
  const max = Math.max(0, count - visible);
  let next = Math.min(Math.max(0, start), max);
  if (index < next) next = index;
  if (index >= next + visible) next = index - visible + 1;
  return Math.min(Math.max(0, next), max);
}

export interface ScrollAreaProps {
  /** The viewport's extent along its axis, in px. */
  height: number;
  /** Every row's height in px (uniform). */
  rowHeight: number;
  /** Rows mounted at once; the default is floor(height / rowHeight), at least one. */
  visible?: number;
  /** Controlled window start: the index of the first mounted row. */
  value?: number;
  defaultValue?: number;
  onOffsetChange?: (offset: number) => void;
  children?: ReactNode;
}

export function ScrollArea(props: ScrollAreaProps) {
  const T = useTokens() as Record<string, string>;
  const kids = Children.toArray(props.children);
  const count = kids.length;
  const visible = Math.max(1, props.visible ?? Math.floor(props.height / props.rowHeight));
  const [value, setValue] = useControllableState(props.value, props.defaultValue ?? 0, props.onOffsetChange);
  const maxStart = Math.max(0, count - visible);
  const start = Math.min(Math.max(0, value), maxStart);
  const viewport = useRef<NodeMirror | null>(null);
  // The mounted rows by their index in the full list (the wrapper node of each).
  const rows = useRef(new Map<number, NodeMirror>());
  // A row to focus once the render that mounts it has committed (a window shift).
  const pending = useRef<number | null>(null);
  const latest = useRef({ start, visible, count, rowHeight: props.rowHeight, setValue });
  latest.current = { start, visible, count, rowHeight: props.rowHeight, setValue };

  // The viewport owns UP and DOWN: a step past the window shifts it, and the new row takes focus after the commit.
  useLayoutEffect(() => {
    const view = viewport.current;
    if (!view) return;
    return pushFocusController(view as never, (direction: FocusDirection) => {
      if (direction !== "up" && direction !== "down") return false;
      const focused = getFocused() as unknown as NodeMirror | null;
      let at = -1;
      for (const [i, n] of rows.current) {
        let hit = false;
        for (let k: NodeMirror | null = focused; k; k = k.parent) if (k === n) { hit = true; break; }
        if (hit) { at = i; break; }
      }
      if (at < 0) return true;
      const next = Math.min(latest.current.count - 1, Math.max(0, at + (direction === "down" ? 1 : -1)));
      if (next === at) return true;
      const now = latest.current;
      const target = scrollToChild(next, now.visible, now.count, now.start);
      if (target !== now.start) {
        pending.current = next;
        now.setValue(target);
      } else {
        const node = rows.current.get(next);
        const focusable = node ? firstFocusable(node) : null;
        if (focusable) focusNode(focusable as never);
      }
      return true;
    });
  }, []);

  // A window shift mounts the pending row; this focuses it in the commit that mounts it.
  useLayoutEffect(() => {
    const index = pending.current;
    if (index === null) return;
    const node = rows.current.get(index);
    if (!node) return;
    pending.current = null;
    const focusable = firstFocusable(node);
    if (focusable) focusNode(focusable as never);
  }, [start, count, visible]);

  // A held drag on a row scrolls by whole rows (the drag press presses nothing on release).
  const drag = (originY: number | null, y: number): number | null => {
    if (originY === null) return null;
    const steps = Math.round((originY - y) / latest.current.rowHeight);
    const next = Math.min(Math.max(0, latest.current.start + steps), Math.max(0, latest.current.count - latest.current.visible));
    if (next !== latest.current.start) latest.current.setValue(next);
    return originY;
  };

  const shown: ReactNode[] = [];
  for (let i = start; i < Math.min(count, start + visible); i++) {
    shown.push(
      <Row key={"row-" + i} index={i} rows={rows} drag={drag}>
        {kids[i]}
      </Row>,
    );
  }
  return (
    <View ref={viewport} className={T["scroll-area.viewport"]} style={{ height: props.height }} debugName="scroll-area">
      {shown}
    </View>
  );
}

interface DragFn {
  (originY: number | null, y: number): number | null;
}

/** One mounted row: a plain column box that records its node and gives its focusables the viewport's drag. */
function Row(props: { index: number; rows: { current: Map<number, NodeMirror> }; drag: DragFn; children?: ReactNode }) {
  const T = useTokens() as Record<string, string>;
  const box = useRef<NodeMirror | null>(null);
  const latest = useRef(props);
  latest.current = props;
  useLayoutEffect(() => {
    const node = box.current;
    if (!node) return;
    latest.current.rows.current.set(props.index, node);
    // A press lands on the row's focusable, not on this box, so every focusable in the row takes the drag.
    const offs: Array<() => void> = [];
    let originY: number | null = null;
    const walk = (n: NodeMirror): void => {
      if (n.focusable) {
        offs.push(registerDrag(n, (_x, y, phase) => {
          if (phase === "done") { originY = null; return; }
          originY = latest.current.drag(originY, y) ?? y;
        }));
      }
      for (const c of n.children) walk(c);
    };
    walk(node);
    return () => {
      latest.current.rows.current.delete(props.index);
      for (const off of offs) off();
    };
  }, [props.index]);
  return <View ref={box} className={T["scroll-area.row"]} debugName={"scroll-row:" + props.index}>{props.children}</View>;
}
