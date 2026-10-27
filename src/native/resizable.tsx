// Resizable: two panes side by side, split by a divider. The first pane's width is size percent of the group (default 50),
// resolved by the library (useParentExtent; the first pane's parent is the group); the second pane takes the rest. The divider
// is a focusable bar: a press and drag on it (registerDrag) sets the size from the pointer's x inside the group, and LEFT and
// RIGHT step it by DIVIDER_STEP (they return true, so focus stays on the divider). Both panes keep at least minSize percent
// (default 20): every size is rounded to a whole percent and clamped to [minSize, 100 - minSize].
import { type ReactNode, useLayoutEffect, useRef } from "react";
import { pushFocusController, type FocusDirection } from "@pocketjs/framework/input";
import { Text, View } from "../elements.ts";
import { registerDrag } from "../input/pointer.ts";
import type { NodeMirror } from "../internal/pocket.ts";
import { measureBox } from "../primitives/anchor.ts";
import { useControllableState } from "../primitives/state.ts";
import { Focusable } from "./focusable.tsx";
import { useParentExtent } from "./percent.ts";
import { useTokens } from "./theme.tsx";

/** The size change one LEFT or RIGHT press makes, in percent. */
export const DIVIDER_STEP = 10;

/** A size rounded to a whole percent and kept inside [min, 100 - min]: both panes keep their minimum. */
export function clampSize(size: number, min: number): number {
  return Math.min(100 - min, Math.max(min, Math.round(size)));
}

/** The size a pointer at x sets: the share of the group's width to the left of x, clamped. */
export function sizeAtX(x: number, groupX: number, groupW: number, min: number): number {
  return clampSize(((x - groupX) / groupW) * 100, min);
}

export interface ResizableProps {
  first: ReactNode;
  second: ReactNode;
  /** The first pane's share of the group, in percent. Controlled with onSizeChange. */
  size?: number;
  defaultSize?: number;
  onSizeChange?: (size: number) => void;
  /** The least share either pane may have, in percent (default 20). */
  minSize?: number;
}

export function Resizable(props: ResizableProps) {
  const T = useTokens() as Record<string, string>;
  const [size, setSize] = useControllableState(props.size, props.defaultSize ?? 50, props.onSizeChange);
  const min = props.minSize ?? 20;
  const held = clampSize(size, min);
  const first = useRef<NodeMirror | null>(null);
  const divider = useRef<NodeMirror | null>(null);
  const latest = useRef({ held, min, setSize });
  latest.current = { held, min, setSize };
  const px = useParentExtent(first, "w", held);
  const firstStyle = px === null ? { opacity: 0.01 } : { width: px };

  useLayoutEffect(() => {
    if (!divider.current) return;
    return pushFocusController(divider.current as never, (direction: FocusDirection) => {
      if (direction !== "left" && direction !== "right") return false;
      const cur = latest.current.held;
      const next = clampSize(cur + (direction === "right" ? DIVIDER_STEP : -DIVIDER_STEP), latest.current.min);
      if (next !== cur) latest.current.setSize(next);
      return true;
    });
  }, []);

  useLayoutEffect(() => {
    if (!divider.current) return;
    return registerDrag(divider.current, (x) => {
      const group = first.current?.parent;
      const box = group ? measureBox(group) : null;
      if (!box) return;
      const next = sizeAtX(x, box.x, box.w, latest.current.min);
      if (next !== latest.current.held) latest.current.setSize(next);
    });
  }, []);

  return (
    <View className={T["resizable.group"]} debugName="resizable">
      <View ref={first as never} className={T["resizable.pane"]} style={firstStyle} debugName="resizable-first">
        {props.first}
      </View>
      <Focusable look={[T["resizable.divider"], T["resizable.focus"]].join(" ")} nodeRef={divider}>
        <View className={T["resizable.fill"]}>
          <Text className={T["resizable.grip"]}>::</Text>
        </View>
      </Focusable>
      <View className={T["resizable.pane.rest"]} debugName="resizable-second">
        {props.second}
      </View>
    </View>
  );
}
