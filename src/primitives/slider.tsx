// Native Slider (batch 3), shaped like Radix's Slider namespace so the vendored shadcn slider imports it unchanged.
// The track is a row of flex segments (the Progress technique, no percent widths): a piece per gap between the
// boundaries (0, the thumbs' shares, 1), each grown to its share, and a 16 px thumb between neighbours. A single
// thumb fills from the start (Range) to its value; several thumbs fill between the first and the last. The colours
// come from the vendored Track and Range classes. Root is the one focus stop: LEFT and DOWN step down, RIGHT and UP
// step up, and a press-and-drag on the track sets the nearest thumb to the pointer (registerDrag). onValueCommit
// runs on release.
import { pushFocusController } from "@pocketjs/framework/input";
import {
  Children,
  type ReactElement,
  type ReactNode,
  isValidElement,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";
import { View } from "../elements.ts";
import { registerDrag } from "../input/pointer.ts";
import type { NodeMirror } from "../internal/pocket.ts";
import { cn } from "../style/cn.ts";
import { type Box, measureBox } from "./anchor.ts";
import { useControllableState } from "./state.ts";

const THUMB = 16;

interface Parts {
  className?: string;
  children?: ReactNode;
  [prop: `data-${string}`]: unknown;
}

/** Markers: the Root reads their classes; they draw nothing of their own. */
export function Track(_props: Parts): null {
  return null;
}
export function Range(_props: Parts): null {
  return null;
}
export function Thumb(_props: Parts): null {
  return null;
}

/** The bg-* tokens of a class string: a segment draws its colour, nothing else from the vendored track. */
function bgOf(className: string | undefined): string {
  return (className ?? "").split(/\s+/).filter((t) => t.startsWith("bg-")).join(" ");
}

/** The thumbs' own classes, in order (their size and colour come from the vendored source). */
function thumbClasses(children: ReactNode): (string | undefined)[] {
  const out: (string | undefined)[] = [];
  for (const child of Children.toArray(children)) {
    if (isValidElement(child) && child.type === Thumb) out.push((child as ReactElement<Parts>).props.className);
  }
  return out;
}

/** A child of a given marker type, found among the Root's children. */
function markerOf(children: ReactNode, marker: typeof Track): Parts | undefined {
  for (const child of Children.toArray(children)) {
    if (isValidElement(child) && child.type === marker) return child.props as Parts;
  }
  return undefined;
}

export interface RootProps {
  value?: number[];
  defaultValue?: number[];
  onValueChange?: (value: number[]) => void;
  onValueCommit?: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
  [prop: `data-${string}`]: unknown;
}

export function Root(props: RootProps) {
  const min = props.min ?? 0;
  const max = props.max ?? 100;
  const step = props.step && props.step > 0 ? props.step : 1;
  const thumbs = thumbClasses(props.children);
  const n = Math.max(1, thumbs.length);
  const fallback = n === 1 ? [min] : [min, max];
  const [values, setValues] = useControllableState<number[]>(
    props.value,
    props.defaultValue ?? fallback,
    props.onValueChange,
  );
  const span = max - min || 1;
  const share = (v: number) => Math.min(1, Math.max(0, (v - min) / span));
  const disabled = !!props.disabled;
  const node = useRef<NodeMirror | null>(null);
  const active = useRef(0);
  const latest = useRef(values);
  latest.current = values;

  const clampAt = (index: number, raw: number, list: number[]): number => {
    const snapped = min + Math.round((raw - min) / step) * step;
    const lo = index > 0 ? list[index - 1] : min;
    const hi = index < list.length - 1 ? list[index + 1] : max;
    return Math.min(hi, Math.max(lo, Math.min(max, Math.max(min, snapped))));
  };

  const setAt = (index: number, next: number) => {
    const list = latest.current;
    if (list[index] === next) return;
    const copy = list.slice();
    copy[index] = next;
    setValues(copy);
  };

  // Arrows: the active thumb moves by one step (LEFT and DOWN down, RIGHT and UP up).
  useEffect(() => {
    const n0 = node.current;
    if (!n0 || disabled) return;
    return pushFocusController(n0, (direction) => {
      const dir = direction === "right" || direction === "up" ? 1 : direction === "left" || direction === "down" ? -1 : 0;
      if (dir === 0) return false;
      const i = Math.min(active.current, latest.current.length - 1);
      setAt(i, clampAt(i, latest.current[i] + dir * step, latest.current));
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled, step, min, max]);

  // A press on the track: the nearest thumb moves to the pointer, and the release commits.
  useLayoutEffect(() => {
    const n0 = node.current;
    if (!n0 || disabled) return;
    let cur: number[] = latest.current.slice();
    return registerDrag(n0, (x, _y, phase) => {
      if (phase === "done") {
        props.onValueCommit?.(cur);
        return;
      }
      const box = measureBox(n0);
      if (!box) return;
      const usable = Math.max(1, box.w - THUMB * cur.length);
      let best = 0;
      let bestDist = Infinity;
      for (let i = 0; i < cur.length; i++) {
        const centre = box.x + 8 + usable * share(cur[i]) + THUMB * i;
        const d = Math.abs(centre - x);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      }
      active.current = best;
      const f = (x - box.x - 8 - THUMB * best) / usable;
      const raw = min + Math.min(1, Math.max(0, f)) * span;
      const next = clampAt(best, raw, cur);
      if (cur[best] !== next) {
        cur = cur.slice();
        cur[best] = next;
        setValues(cur);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled, step, min, max]);

  // The pieces: a boundary at 0, at each thumb's share and at 1; a single thumb fills from the start.
  const shares = values.map(share).sort((a, b) => a - b);
  const bounds = [0, ...shares, 1];
  const track = markerOf(props.children, Track);
  const range = markerOf(props.children, Range);
  const trackFill = bgOf(track?.className) || "bg-slate-100";
  const rangeFill = bgOf(range?.className) || "bg-slate-900";
  const rows: ReactNode[] = [];
  for (let k = 0; k < bounds.length - 1; k++) {
    const inRange = values.length === 1 ? k === 0 : k >= 1 && k < bounds.length - 2;
    rows.push(
      <View
        key={"p" + k}
        className={cn("h-1.5 rounded-[8px]", inRange ? rangeFill : trackFill)}
        style={{ flexGrow: Math.round((bounds[k + 1] - bounds[k]) * 1000), flexBasis: 0 }}
      />
    );
    if (k < shares.length) {
      const thumb = thumbs[Math.min(k, thumbs.length - 1)];
      rows.push(
        <View
          key={"t" + k}
          className={cn("w-4 h-4 shrink-0 rounded-[8px] bg-white", thumb)}
          {...(disabled ? { disabled: true } : {})}
        />
      );
    }
  }
  return (
    <View
      ref={node}
      focusable={!disabled}
      className={cn("flex-row items-center w-full h-4", props.className)}
      {...{ "data-disabled": disabled ? "" : undefined, "data-orientation": "horizontal" }}
    >
      {rows}
    </View>
  );
}
