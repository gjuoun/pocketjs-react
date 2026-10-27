// Slider: a focusable row of a label, a 196 px track and the value. Controlled: value (0 to 100) is the source, and
// onValueChange(next) reports every change. The value moves in stops of 10 (11 positions, like the progress steps: a
// percentage left is not in the vocabulary). Each stop is a token pair: the thumb's left inset and the fill's width.
// Geometry: the thumb is 16 px and travels 180 px, so stop k sits at 18k px and its centre at 18k + 8; the fill runs from
// the track's left edge to the thumb centre. The thumb and fill use transition-all duration-150, so both the arrow steps
// and a drag settle through the core's layout interpolation.
// Keyboard: LEFT and RIGHT step the value by 10 and clamp at 0 and 100 (they return true, so focus stays on the slider).
// Pointer: a press on the slider starts a drag (registerDrag on the focusable root, the press target); every point maps to
// the nearest stop from the track's measured rect, and the release ends it. Both paths report through onValueChange.
import { useLayoutEffect, useRef } from "react";
import { pushFocusController, type FocusDirection } from "@pocketjs/framework/input";
import { Text, View } from "../elements.ts";
import type { NodeMirror } from "../internal/pocket.ts";
import { measureBox } from "../primitives/anchor.ts";
import { registerDrag } from "../input/pointer.ts";
import { useControllableState } from "../primitives/state.ts";
import { Focusable } from "./focusable.tsx";
import { useTokens } from "./theme.tsx";

/** The stop a value lands on: clamped to 0..100, rounded half up to the nearest 10. */
export function sliderStop(value: number): number {
  const v = Math.min(100, Math.max(0, value));
  return Math.floor(v / 10 + 0.5) * 10;
}

/** The stop under a point on the track, from the track's left edge: the thumb centre is 8 px into the 180 px travel. */
export function stopAtX(x: number, trackX: number): number {
  return sliderStop(((x - trackX - 8) / 180) * 100);
}

export interface SliderProps {
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  children?: string;
}

export function Slider(props: SliderProps) {
  const T = useTokens() as Record<string, string>;
  const [value, setValue] = useControllableState(props.value, props.defaultValue ?? 0, props.onValueChange);
  const stop = sliderStop(value);
  const root = useRef<NodeMirror | null>(null);
  const track = useRef<NodeMirror | null>(null);
  const latest = useRef({ value: stop, setValue });
  latest.current = { value: stop, setValue };

  useLayoutEffect(() => {
    if (!root.current) return;
    return pushFocusController(root.current as never, (direction: FocusDirection) => {
      if (direction !== "left" && direction !== "right") return false;
      const cur = latest.current.value;
      const next = sliderStop(cur + (direction === "right" ? 10 : -10));
      if (next !== cur) latest.current.setValue(next);
      return true;
    });
  }, []);

  useLayoutEffect(() => {
    if (!root.current) return;
    return registerDrag(root.current, (x) => {
      const box = track.current ? measureBox(track.current) : null;
      if (!box) return;
      const next = stopAtX(x, box.x);
      if (next !== latest.current.value) latest.current.setValue(next);
    });
  }, []);

  const k = stop / 10;
  return (
    <Focusable look={[T["slider.root"], T["slider.focus"]].join(" ")} nodeRef={root}>
      <Text className={T["slider.label"]}>{props.children ?? ""}</Text>
      <View className={T["slider.track"]} ref={track} debugName="slider-track">
        <View className={T["slider.bar"]} />
        <View className={T["slider.fill." + k]} debugName="slider-fill" />
        <View className={T["slider.thumb." + k]} debugName="slider-thumb" />
      </View>
      <Text className={T["slider.value"]}>{String(stop)}</Text>
    </Focusable>
  );
}
