// useButton(BTN.X, fn): react to a face/shoulder button's pressed edge. Handlers form a
// stack per button: only the most recently registered handler for a button runs, so a
// dialog's back handler shadows the page's while the dialog is open.
import { useLayoutEffect, useRef } from "react";
import { addFrameListener } from "../renderer/mount.ts";

interface Entry {
  mask: number;
  run: { current: (pressed: number) => void };
}

const stack: Entry[] = [];
let installed = false;

function dispatch(pressed: number): void {
  for (let bit = 1; bit <= pressed; bit <<= 1) {
    if (!(pressed & bit)) continue;
    for (let i = stack.length - 1; i >= 0; i--) {
      if (stack[i].mask & bit) {
        stack[i].run.current(bit);
        break;
      }
    }
  }
}

export function useButton(
  mask: number,
  handler: (pressed: number) => void,
  opts: { enabled?: boolean } = {},
): void {
  const run = useRef(handler);
  run.current = handler;
  const enabled = opts.enabled ?? true;
  useLayoutEffect(() => {
    if (!enabled) return;
    if (!installed) {
      addFrameListener(dispatch);
      installed = true;
    }
    const entry: Entry = { mask, run };
    stack.push(entry);
    return () => {
      const i = stack.lastIndexOf(entry);
      if (i >= 0) stack.splice(i, 1);
    };
  }, [mask, enabled]);
}
