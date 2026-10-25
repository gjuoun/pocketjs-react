// useControllableState: the open/value contract the native primitives share. A controlled prop
// wins; otherwise the component keeps its own state. onChange fires only when the value actually
// changes (Radix's rule), so a handler never sees a no-op.

import { useCallback, useRef, useState } from "react";

export function useControllableState<T>(
  prop: T | undefined,
  fallback: T,
  onChange?: (next: T) => void,
): readonly [T, (next: T) => void] {
  const [inner, setInner] = useState<T>(fallback);
  const controlled = prop !== undefined;
  const value = controlled ? (prop as T) : inner;
  const current = useRef(value);
  current.current = value;
  const handler = useRef(onChange);
  handler.current = onChange;
  const set = useCallback(
    (next: T) => {
      if (Object.is(next, current.current)) return;
      if (!controlled) setInner(next);
      handler.current?.(next);
    },
    [controlled],
  );
  return [value, set] as const;
}
