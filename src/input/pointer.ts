// Mouse as a second input layer on the same focus system as the d-pad. Each frame, pointer
// events are drained from the host and a click (press and release over the same focusable)
// focuses and presses that node, exactly like moving focus there and pressing CIRCLE. The
// framework's hitFocusable() resolves a point to the nearest focusable inside the active
// focus scope, so an open dialog keeps clicks behind it inert.
//
// Sources:
//   - desktop host: `ui.svcPoll()` lines {"t":"mouse","x","y","d"} in logical pixels. Other
//     lines (for example {"t":"load"} from --file) are kept for takeHostMessages();
//   - a host page (browser): it pushes {x, y, down} into `globalThis.__pocketPointer`.
import { getOps } from "@pocketjs/framework/host";
import { focusNode, getFocused, hitFocusable, pressNode } from "@pocketjs/framework/input";
import type { NodeMirror } from "../internal/pocket.ts";
import { addFramePump } from "../renderer/mount.ts";

export interface PointerEvent {
  x: number;
  y: number;
  down: boolean;
}

const hostMessages: Record<string, unknown>[] = [];

/** Non-pointer host messages received since the last call (desktop svc lines). */
export function takeHostMessages(): Record<string, unknown>[] {
  return hostMessages.splice(0);
}

function drain(): PointerEvent[] {
  const events: PointerEvent[] = [];
  const ops = getOps() as { svcPoll?: () => string | undefined };
  const batch = ops.svcPoll?.();
  if (batch) {
    for (const line of batch.split("\n")) {
      if (!line) continue;
      let message: Record<string, unknown>;
      try {
        message = JSON.parse(line);
      } catch {
        continue;
      }
      if (
        message.t === "mouse" &&
        typeof message.x === "number" &&
        typeof message.y === "number"
      ) {
        events.push({ x: message.x, y: message.y, down: message.d === true });
      } else if (message.t !== "mouse") hostMessages.push(message);
    }
  }
  const queue = (globalThis as { __pocketPointer?: PointerEvent[] })
    .__pocketPointer;
  if (queue && queue.length) events.push(...queue.splice(0));
  return events;
}

let pressing = false;

/** True while the pointer pump presses a node (a tap or click), not a CIRCLE press. */
export function pressingFromPointer(): boolean {
  return pressing;
}

/**
 * A press that lands on the node which already had focus when the press began (a second tap or
 * click in a field). The text field takes it as a caret placement and returns true, so the press
 * is not sent. Set by the text entry (installTextEntry); null otherwise.
 */
let focusedPress: ((node: NodeMirror, x: number, y: number) => boolean) | null = null;
export function setFocusedPress(fn: typeof focusedPress): void {
  focusedPress = fn;
}

export function installPointer(): () => void {
  let armed: unknown = null;
  let armedFocused = false;
  return addFramePump(() => {
    for (const event of drain()) {
      const target = hitFocusable(event.x, event.y);
      if (event.down) {
        armed = target;
        armedFocused = target !== null && getFocused() === target;
        if (target) focusNode(target);
      } else {
        if (target && target === armed) {
          const placed = armedFocused && focusedPress !== null && focusedPress(target, event.x, event.y);
          if (!placed) {
            pressing = true;
            try {
              pressNode(target);
            } finally {
              pressing = false;
            }
          }
        }
        armed = null;
        armedFocused = false;
      }
    }
  });
}
