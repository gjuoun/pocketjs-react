// embla-carousel-react shim (batch 4, R9): useEmblaCarousel returns [ref, api] with the api subset the vendored carousel
// uses. The ref is the viewport (the clip). Its first child is the track. A step moves the track by one slide: the spacing
// of the first two slides, measured before any move (translateX, or translateY on the vertical axis). Slides are the
// track's children. Events: select and reInit.
// Named boundaries (throw): plugins, loop, and the drag and wheel gestures (only the api moves the carousel).
import { useCallback, useRef, useState } from "react";
import { type NodeMirror, setProp } from "../internal/pocket.ts";
import { measureBox } from "../primitives/anchor.ts";

type Listener = (api: EmblaApi) => void;

export interface EmblaOptions {
  axis?: "x" | "y";
  loop?: boolean;
  align?: string;
  [option: string]: unknown;
}

export interface EmblaApi {
  scrollPrev(): void;
  scrollNext(): void;
  scrollTo(index: number): void;
  selectedScrollSnap(): number;
  canScrollPrev(): boolean;
  canScrollNext(): boolean;
  slideNodes(): NodeMirror[];
  on(event: string, fn: Listener): EmblaApi;
  off(event: string, fn: Listener): EmblaApi;
  reInit(): void;
}

export type UseEmblaCarouselType = [
  // An element ref: the vendored carousel hands it to a div. The value is the viewport's mirror node.
  (node: unknown) => void,
  EmblaApi | undefined,
];

function makeApi(
  options: EmblaOptions,
  node: { current: NodeMirror | null },
): EmblaApi {
  let index = 0;
  const listeners = new Map<string, Set<Listener>>();
  const vertical = options.axis === "y";
  const track = (): NodeMirror | undefined => node.current?.children[0];
  const slides = (): NodeMirror[] => track()?.children ?? [];
  const emit = (event: string) => {
    const api = self;
    for (const fn of listeners.get(event) ?? []) fn(api);
  };
  let step: number | null = null;
  // The slide spacing, read once from the untranslated layout (the first two slides).
  const measureStep = (): number | null => {
    const [a, b] = slides();
    const ba = a ? measureBox(a) : null;
    const bb = b ? measureBox(b) : null;
    if (!ba || !bb) return null;
    return vertical ? bb.y - ba.y : bb.x - ba.x;
  };
  const apply = () => {
    const t = track();
    const vp = node.current ? measureBox(node.current) : null;
    if (!t || !vp) return;
    if (step === null) step = measureStep() ?? (vertical ? vp.h : vp.w);
    const move: Record<string, number> = vertical
      ? { translateY: -index * step }
      : { translateX: -index * step };
    setProp(t, "style", move as never, {} as never);
  };
  const scrollTo = (next: number) => {
    const count = slides().length;
    const clamped = Math.min(Math.max(0, next), Math.max(0, count - 1));
    if (clamped === index) return;
    index = clamped;
    apply();
    emit("select");
  };
  const self: EmblaApi = {
    scrollPrev: () => scrollTo(index - 1),
    scrollNext: () => scrollTo(index + 1),
    scrollTo,
    selectedScrollSnap: () => index,
    canScrollPrev: () => index > 0,
    canScrollNext: () => index < slides().length - 1,
    slideNodes: () => slides(),
    on(event, fn) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(fn);
      return self;
    },
    off(event, fn) {
      listeners.get(event)?.delete(fn);
      return self;
    },
    reInit() {
      apply();
      emit("reInit");
    },
  };
  return self;
}

export default function useEmblaCarousel(
  options: EmblaOptions = {},
  plugins?: unknown,
): UseEmblaCarouselType {
  if (
    plugins !== undefined &&
    plugins !== null &&
    (!Array.isArray(plugins) || plugins.length > 0)
  )
    throw new Error(
      "pocketjs-react: embla-carousel plugins are not supported (the carousel shim has no plugin host)",
    );
  if (options.loop)
    throw new Error(
      "pocketjs-react: embla-carousel loop is not supported (the carousel shim stops at the ends)",
    );
  const node = useRef<NodeMirror | null>(null);
  const apiRef = useRef<EmblaApi | null>(null);
  if (apiRef.current === null) apiRef.current = makeApi(options, node);
  const [api] = useState<EmblaApi>(() => apiRef.current as EmblaApi);
  // The vendored carousel hands this to a div's ref, so the parameter is typed as an element ref; the value is the
  // viewport's mirror node (the compat host's), which is what the shim reads.
  const ref = useCallback((n: unknown) => {
    node.current = n as NodeMirror | null;
  }, []);
  return [ref, api];
}

export { useEmblaCarousel };
