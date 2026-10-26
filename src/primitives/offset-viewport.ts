// Offset viewport (batch 4, D6): a clip node holds one content node whose translate is written from a scroll offset,
// once per frame. The extent is measureBox of the content: on a core with nodeRect that is the untrimmed length; on the
// default core the box is clamped to the viewport, so the range is 0 and the offset stays put (the degraded mode).
import { type MutableRefObject, useLayoutEffect, useRef } from "react";
import { type NodeMirror, setProp } from "../internal/pocket.ts";
import { addFramePump } from "../renderer/mount.ts";
import { registerDrag } from "../input/pointer.ts";
import { measureBox } from "./anchor.ts";

export type Axis = "x" | "y";

export interface OffsetThumb {
  thumb: MutableRefObject<NodeMirror | null>;
  track: MutableRefObject<NodeMirror | null>;
}

export interface Offset {
  viewport: MutableRefObject<NodeMirror | null>;
  content: MutableRefObject<NodeMirror | null>;
  scrollTo(value: number): void;
  scrollBy(delta: number): void;
  /** The largest offset the content allows. */
  max(): number;
  /** The content length along the axis (0 when unknown). */
  extent(): number;
  /** A drag on the thumb node scrolls the content by the pointer distance, scaled to the extent. */
  drag(node: NodeMirror): () => void;
}

const MIN_THUMB = 12;

export function useOffset(axis: Axis, bar?: OffsetThumb): Offset {
  const viewport = useRef<NodeMirror | null>(null);
  const content = useRef<NodeMirror | null>(null);
  const s = useRef({
    offset: 0,
    max: 0,
    extent: 0,
    written: NaN,
    thumbLen: NaN,
    thumbTop: NaN,
  });
  const len = (b: { w: number; h: number }) => (axis === "y" ? b.h : b.w);

  useLayoutEffect(() => {
    return addFramePump(() => {
      const vp = viewport.current;
      const ct = content.current;
      if (!vp || !ct) return;
      const vb = measureBox(vp);
      const cb = measureBox(ct);
      const visible = vb ? len(vb) : 0;
      s.current.extent = cb ? len(cb) : 0;
      s.current.max = Math.max(0, s.current.extent - visible);
      s.current.offset = Math.min(Math.max(0, s.current.offset), s.current.max);
      if (s.current.offset !== s.current.written) {
        const move: Record<string, number> =
          axis === "y"
            ? { translateY: -s.current.offset }
            : { translateX: -s.current.offset };
        setProp(ct, "style", move as never, {} as never);
        s.current.written = s.current.offset;
      }
      const tr = bar?.track.current;
      const th = bar?.thumb.current;
      if (!tr || !th) return;
      const tb = measureBox(tr);
      if (!tb || !vb) return;
      const trackLen = len(tb);
      const ratio = s.current.extent > 0 ? visible / s.current.extent : 1;
      const thumbLen =
        ratio >= 1
          ? trackLen
          : Math.max(MIN_THUMB, Math.round(trackLen * ratio));
      const thumbTop =
        s.current.max > 0
          ? Math.round(
              ((trackLen - thumbLen) * s.current.offset) / s.current.max,
            )
          : 0;
      if (thumbLen !== s.current.thumbLen || thumbTop !== s.current.thumbTop) {
        const size: Record<string, number> =
          axis === "y"
            ? { height: thumbLen, marginT: thumbTop }
            : { width: thumbLen, marginL: thumbTop };
        setProp(th, "style", size as never, {} as never);
        s.current.thumbLen = thumbLen;
        s.current.thumbTop = thumbTop;
      }
    });
  }, []);

  const scrollTo = (value: number) => {
    s.current.offset = Math.min(Math.max(0, value), s.current.max);
  };
  return {
    viewport,
    content,
    scrollTo,
    scrollBy: (delta) => scrollTo(s.current.offset + delta),
    max: () => s.current.max,
    extent: () => s.current.extent,
    drag(node) {
      let last = NaN;
      return registerDrag(node, (x, y, phase) => {
        const p = axis === "y" ? y : x;
        if (phase === "done") {
          last = NaN;
          return;
        }
        if (Number.isNaN(last)) {
          last = p;
          return;
        }
        const track = bar?.track.current;
        const tb = track ? measureBox(track) : null;
        const trackLen = tb ? len(tb) : 0;
        if (trackLen > 0)
          scrollTo(
            s.current.offset + ((p - last) * s.current.extent) / trackLen,
          );
        last = p;
      });
    },
  };
}
