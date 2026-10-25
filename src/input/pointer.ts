// Mouse as a second input layer on the same focus system as the d-pad. Each frame, pointer
// events are drained from the host and a click (press and release over the same focusable)
// focuses and presses that node, exactly like moving focus there and pressing CIRCLE. The
// framework's hitFocusable() resolves a point to the nearest focusable inside the active
// focus scope, so an open dialog keeps clicks behind it inert. A press that starts and ends outside
// the top layer's panel closes that layer (C6), and does not reach the app behind it.
//
// Sources:
//   - desktop host: `ui.svcPoll()` lines {"t":"mouse","x","y","d"} in logical pixels. Other
//     lines (for example {"t":"load"} from --file) are kept for takeHostMessages();
//   - a host page (browser): it pushes {x, y, down} into `globalThis.__pocketPointer`.
import { getOps } from "@pocketjs/framework/host";
import {
  focusNode,
  getFocused,
  hitFocusable,
  pressNode,
} from "@pocketjs/framework/input";
import type { NodeMirror } from "../internal/pocket.ts";
import { hitsWithin } from "../primitives/anchor.ts";
import { type Layer, topLayer } from "../primitives/layer-stack.ts";
import { addFramePump } from "../renderer/mount.ts";
import { hoverClear, hoverMove } from "./hover.ts";

export interface PointerEvent {
  x: number;
  y: number;
  down: boolean;
  /** Web hover: a pointer move over the canvas, or the pointer leaving it. */
  move?: boolean;
  leave?: boolean;
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
let focusedPress: ((node: NodeMirror, x: number, y: number) => boolean) | null =
  null;
export function setFocusedPress(fn: typeof focusedPress): void {
  focusedPress = fn;
}

/** A point outside a layer's panel: the topmost hit there is not the panel or a node inside it. */
function outsideLayer(layer: Layer, x: number, y: number): boolean {
  const panel = layer.panel();
  return panel !== null && !hitsWithin(panel, x, y);
}

export function installPointer(): () => void {
  let armed: unknown = null;
  let armedFocused = false;
  // A press that began outside the top layer's panel: its release outside closes that layer.
  let armedOutside: Layer | null = null;
  // A focus move the pump did not make (a d-pad move) clears the hover highlight.
  let seenFocus: unknown = null;
  return addFramePump(() => {
    const focus = getFocused();
    if (focus !== seenFocus) {
      seenFocus = focus;
      hoverClear();
    }
    for (const event of drain()) {
      // Hover never touches `armed`, focus or presses: it only lights the row overlay.
      if (event.leave) {
        hoverClear();
        continue;
      }
      if (event.move) {
        hoverMove(hitFocusable(event.x, event.y), armed !== null);
        continue;
      }
      if (event.down) {
        hoverClear();
        const top = topLayer();
        armed = null;
        armedFocused = false;
        armedOutside = top && outsideLayer(top, event.x, event.y) ? top : null;
        if (armedOutside) continue;
        const target = hitFocusable(event.x, event.y);
        armed = target;
        armedFocused = target !== null && getFocused() === target;
        if (target) focusNode(target);
      } else if (armedOutside) {
        const layer = armedOutside;
        armedOutside = null;
        if (topLayer() === layer && outsideLayer(layer, event.x, event.y))
          layer.close();
      } else {
        const target = hitFocusable(event.x, event.y);
        if (target && target === armed) {
          const placed =
            armedFocused &&
            focusedPress !== null &&
            focusedPress(target, event.x, event.y);
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
