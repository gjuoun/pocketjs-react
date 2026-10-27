// Carousel: one slide at a time in a fixed viewport, with Prev and Next controls and a position readout ("2 / 3").
// Wrapping is explicit: with loop (the default) Next on the last slide goes to the first, and Prev on the first goes to the
// last. With loop={false} the end control is disabled and does nothing. A move slides the new slide in from the side it comes
// from: it is mounted one slide width off the viewport, and the core's layout transition (150 ms) moves it to offset 0.
// The viewport clips and holds only the slide on screen, so no slide sits off the clip at rest (a child clipped away is not overflow to gate 2).
// CIRCLE on Prev or Next moves; LEFT and RIGHT move focus between the controls.
import { useRef, useState } from "react";
import { Text, View } from "../elements.ts";
import { useControllableState } from "../primitives/state.ts";
import { useFrame } from "../renderer/use-frame.ts";
import { wrapIndex } from "./dropdown-menu.tsx";
import { Focusable } from "./focusable.tsx";
import { useTokens } from "./theme.tsx";

/** The slide index a move lands on: wrapped when looping; null when a non-looping carousel is at its end. */
export function stepIndex(count: number, at: number, step: 1 | -1, loop: boolean): number | null {
  if (count <= 0) return null;
  if (loop) return wrapIndex(count, at, step);
  const next = at + step;
  return next < 0 || next >= count ? null : next;
}

export interface CarouselProps {
  slides: string[];
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  /** Wrap at both ends (default true). false disables Prev on the first slide and Next on the last. */
  loop?: boolean;
}

export function Carousel(props: CarouselProps) {
  const T = useTokens() as Record<string, string>;
  const [index, setIndex] = useControllableState(props.index, props.defaultIndex ?? 0, props.onIndexChange);
  // The side the shown slide enters from: 1 from the right, -1 from the left, 0 for the first slide (no entry).
  const [dir, setDir] = useState<0 | 1 | -1>(0);
  const loop = props.loop !== false;
  const n = props.slides.length;
  const move = (step: 1 | -1) => {
    const next = stepIndex(n, index, step, loop);
    if (next === null || next === index) return;
    setDir(step);
    setIndex(next);
  };
  const atStart = !loop && index === 0;
  const atEnd = !loop && index === n - 1;
  const nav = [T["carousel.nav"], T["carousel.focus"], T["carousel.press"]].join(" ");
  const navIdle = [nav, T["carousel.nav.idle"]].join(" ");
  const navDisabled = [T["carousel.nav"], T["carousel.nav.disabled"]].join(" ");
  return (
    <View className={T["carousel.root"]} debugName="carousel">
      <View className={T["carousel.row"]}>
        <Focusable look={atStart ? navDisabled : navIdle} disabled={atStart} onPress={() => move(-1)}>
          <Text className={T[atStart ? "carousel.nav.disabled.text" : "carousel.nav.text"]}>Prev slide</Text>
        </Focusable>
        <View className={T["carousel.viewport"]} debugName="carousel-viewport">
          <Slide key={index} text={props.slides[index] ?? ""} from={dir} />
        </View>
        <Focusable look={atEnd ? navDisabled : navIdle} disabled={atEnd} onPress={() => move(1)}>
          <Text className={T[atEnd ? "carousel.nav.disabled.text" : "carousel.nav.text"]}>Next slide</Text>
        </Focusable>
      </View>
      <Text className={T["carousel.indicator"]}>{(n ? index + 1 : 0) + " / " + n}</Text>
    </View>
  );
}

/**
 * One slide. Mounted fresh for each index. It is drawn at its entry place for two frames, then it takes the rest place and
 * the core transitions it to 0 (the entry must be drawn first, or the transition starts from where the mount frame ended).
 */
function Slide(props: { text: string; from: 0 | 1 | -1 }) {
  const T = useTokens() as Record<string, string>;
  const [rest, setRest] = useState(props.from === 0);
  const age = useRef(0);
  useFrame(() => {
    age.current++;
    if (!rest && age.current >= 2) setRest(true);
  });
  const place = rest ? "carousel.at" : props.from === 1 ? "carousel.from.right" : "carousel.from.left";
  return (
    <View className={[T["carousel.slide"], T[place]].join(" ")} debugName="carousel-slide">
      <Text className={T["carousel.text"]}>{props.text}</Text>
    </View>
  );
}
