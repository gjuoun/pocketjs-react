// react-resizable-panels shim (batch 4, R9): Group, Panel and Separator on the native View. A Panel is a flex-grow share
// of the group (its size in percent is the grow ratio). The Separator is focusable (a drag only fires on a focusable node,
// registerDrag) and moves the boundary between its neighbours: by the pointer distance while held, by 5% per arrow press.
// Panels and separators are numbered in the order the group renders them. Not built: collapsible panels, the autosave
// layout, keyboard resizing on the vertical axis, and the layout prop of react-resizable-panels v4 (defaultSize only).
import { pushFocusController } from "@pocketjs/framework/input";
import {
  type MutableRefObject,
  type ReactNode,
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { View } from "../elements.ts";
import { registerDrag } from "../input/pointer.ts";
import { cn } from "../style/cn.ts";
import { measureBox } from "./anchor.ts";
import { type NodeMirror } from "../internal/pocket.ts";
import { Pressable } from "./press.tsx";

const KEY_STEP = 5;

interface Ctx {
  horizontal: boolean;
  sizes: number[];
  setSizes(next: number[]): void;
  /** Each panel's default size, in render order. Complete once the group has rendered. */
  order: number[];
  node: MutableRefObject<NodeMirror | null>;
}
const Ctx = createContext<Ctx | null>(null);

function useGroup(part: string): Ctx {
  const c = useContext(Ctx);
  if (!c)
    throw new Error(
      "pocketjs-react: react-resizable-panels " +
        part +
        " must be used within a Group",
    );
  return c;
}

export interface GroupProps {
  direction?: "horizontal" | "vertical";
  orientation?: "horizontal" | "vertical";
  className?: string;
  children?: ReactNode;
  [prop: `data-${string}`]: unknown;
}

export function Group(props: GroupProps) {
  const horizontal =
    (props.orientation ?? props.direction ?? "horizontal") === "horizontal";
  const [sizes, setSizes] = useState<number[]>([]);
  const node = useRef<NodeMirror | null>(null);
  // The render order of panels is rebuilt on every render: a Panel or Separator takes its number from it.
  const order: number[] = [];
  return (
    <Ctx.Provider value={{ horizontal, sizes, setSizes, order, node }}>
      <View
        ref={node}
        className={cn(horizontal ? "flex-row" : "flex-col", props.className)}
      >
        {props.children}
      </View>
    </Ctx.Provider>
  );
}

export interface PanelProps {
  defaultSize?: number;
  minSize?: number;
  className?: string;
  children?: ReactNode;
}

export function Panel(props: PanelProps) {
  const c = useGroup("Panel");
  const index = c.order.length;
  c.order.push(props.defaultSize ?? 100);
  const size = c.sizes[index] ?? c.order[index];
  return (
    <View
      className={cn("overflow-hidden", props.className)}
      style={{ flexGrow: size, flexBasis: 0 } as never}
    >
      {props.children}
    </View>
  );
}

export interface SeparatorProps {
  className?: string;
  children?: ReactNode;
  [prop: `data-${string}`]: unknown;
}

export function Separator(props: SeparatorProps) {
  const c = useGroup("Separator");
  const node = useRef<NodeMirror | null>(null);
  // The panel before this separator is the last one numbered so far; the one after it is the next.
  const left = c.order.length - 1;
  const right = left + 1;
  const latest = useRef({
    left,
    right,
    sizes: c.sizes,
    order: c.order,
    setSizes: c.setSizes,
    horizontal: c.horizontal,
  });
  latest.current = {
    left,
    right,
    sizes: c.sizes,
    order: c.order,
    setSizes: c.setSizes,
    horizontal: c.horizontal,
  };

  const move = (delta: number) => {
    const { left: l, right: r, sizes, order } = latest.current;
    const next = order.map((d, i) => sizes[i] ?? d);
    if (next[l] === undefined || next[r] === undefined) return;
    const amount = Math.max(-next[l], Math.min(next[r], delta));
    next[l] += amount;
    next[r] -= amount;
    latest.current.setSizes(next);
  };

  useLayoutEffect(() => {
    const n = node.current;
    if (!n) return;
    let last = NaN;
    const offDrag = registerDrag(n, (x, y, phase) => {
      const p = latest.current.horizontal ? x : y;
      if (phase === "done") {
        last = NaN;
        return;
      }
      if (Number.isNaN(last)) {
        last = p;
        return;
      }
      const group = c.node.current ? measureBox(c.node.current) : null;
      const len = group ? (latest.current.horizontal ? group.w : group.h) : 0;
      if (len > 0) move(((p - last) / len) * 100);
      last = p;
    });
    const offKeys = pushFocusController(n, (direction) => {
      const forward = latest.current.horizontal ? "right" : "down";
      const back = latest.current.horizontal ? "left" : "up";
      if (direction === forward) move(KEY_STEP);
      else if (direction === back) move(-KEY_STEP);
      else return false;
      return true;
    });
    return () => {
      offDrag();
      offKeys();
    };
  }, []);

  return (
    <Pressable
      nodeRef={node}
      className={cn(
        "relative flex items-center justify-center",
        props.className,
      )}
      onPress={() => {}}
    >
      {props.children}
    </Pressable>
  );
}
