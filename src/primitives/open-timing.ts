// Frame-counted open and close for floating panels (Tooltip, HoverCard). The clock is the frame pump, so
// a delay is a frame count: 60 Hz is assumed, and tests step exact frames (Risk R3).
import { useLayoutEffect, useRef } from "react";
import { addFramePump } from "../renderer/mount.ts";

/** One frame at 60 Hz, in milliseconds. */
export const FRAME_MS = 1000 / 60;

/** A millisecond delay as whole frames, rounded up (700 ms = 42 frames, 300 ms = 18). */
export function framesFromMs(ms: number): number {
  return Math.ceil(ms / FRAME_MS);
}

export interface OpenTiming {
  /** False while the owner is controlled (open prop given): the hook leaves the panel to its owner. */
  enabled: boolean;
  open: boolean;
  setOpen: (next: boolean) => void;
  /** True while the panel should be open. Read every frame. */
  want: () => boolean;
  /** Frames `want()` must hold before the panel opens. */
  openFrames: number;
  /** Frames `want()` must stay false before the panel closes. */
  closeFrames: number;
}

/**
 * Opens or closes a panel once `want()` has held for its delay. A change of `want()` restarts the count;
 * the count is kept per mounted owner, read through a ref so the latest props apply.
 */
export function useOpenTiming(timing: OpenTiming): void {
  const latest = useRef(timing);
  latest.current = timing;
  useLayoutEffect(() => {
    let last: boolean | undefined;
    let since = 0;
    return addFramePump(() => {
      const t = latest.current;
      if (!t.enabled) return;
      const next = t.want();
      if (next !== last) {
        last = next;
        since = 0;
      } else since++;
      if (next === t.open) return;
      if (since >= (next ? t.openFrames : t.closeFrames)) t.setOpen(next);
    });
  }, []);
}
