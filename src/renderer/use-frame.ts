// useFrame(cb) — run `cb` once per host frame, before button handling, with a 0-based
// counter for this hook. The React-shaped counterpart of the internal addFramePump: the
// host drives one frame per vblank, so this is deterministic per step rather than wall time.
// Unregisters on unmount; the latest callback is called without re-registering.
import { useLayoutEffect, useRef } from "react";
import { addFramePump } from "./mount.ts";

export function useFrame(callback: (frame: number) => void): void {
  const run = useRef(callback);
  run.current = callback;
  useLayoutEffect(() => {
    let frame = 0;
    return addFramePump(() => run.current(frame++));
  }, []);
}
