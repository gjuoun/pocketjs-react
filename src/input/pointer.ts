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
import { focusLabelControlAt } from "./label-map.ts";

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

/** Web hover subscribers: called with the pointer point on a move, and with nulls when it leaves. */
type MoveListener = (x: number | null, y: number | null) => void;
const moveListeners: MoveListener[] = [];

export function onPointerMove(fn: MoveListener): () => void {
  moveListeners.push(fn);
  return () => {
    const i = moveListeners.indexOf(fn);
    if (i >= 0) moveListeners.splice(i, 1);
  };
}

/** Frames a press must be held on a registered node before its long-press handler runs (about 500 ms). */
export const LONG_PRESS_FRAMES = 30;

const longPresses = new Map<NodeMirror, (x: number, y: number) => void>();

/**
 * A long press on `node` (held LONG_PRESS_FRAMES frames without a drift off it) calls `fn` at the press
 * point, and the release presses nothing (ContextMenu's open gesture). Returns the teardown.
 */
export function registerLongPress(node: NodeMirror, fn: (x: number, y: number) => void): () => void {
  longPresses.set(node, fn);
  return () => {
    if (longPresses.get(node) === fn) longPresses.delete(node);
  };
}

/** A held drag on a registered node: `fn` gets the press point and every held point after it ("move"), and the
 *  release ("done"). A drag press presses nothing on release. */
export type DragListener = (x: number, y: number, phase: "move" | "done") => void;
const drags = new Map<NodeMirror, DragListener>();

/** Register a held-drag listener on a node (Slider's track). Returns the teardown. */
export function registerDrag(node: NodeMirror, fn: DragListener): () => void {
  drags.set(node, fn);
  return () => {
    if (drags.get(node) === fn) drags.delete(node);
  };
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
  // The held press: frames it has been down, and where it went down (a long press reports that point).
  let isDown = false;
  let held = 0;
  let downAt = { x: 0, y: 0 };
  // A focus move the pump did not make (a d-pad move) clears the hover highlight.
  let seenFocus: unknown = null;
  // A held drag: the listener of the node the press began on, until the release.
  let dragging: DragListener | null = null;
  return addFramePump(() => {
    const focus = getFocused();
    if (focus !== seenFocus) {
      seenFocus = focus;
      hoverClear();
    }
    for (const event of drain()) {
      // A held drag: while the press is down every point is a move; the release ends the drag and presses nothing.
      if (dragging !== null) {
        if (event.down && !event.leave) {
          dragging(event.x, event.y, "move");
          continue;
        }
        const done = dragging;
        dragging = null;
        isDown = false;
        armed = null;
        armedFocused = false;
        done(event.x, event.y, "done");
        continue;
      }
      // Hover never touches `armed`, focus or presses: it only lights the row overlay.
      if (event.leave) {
        hoverClear();
        for (const fn of [...moveListeners]) fn(null, null);
        continue;
      }
      if (event.move) {
        hoverMove(hitFocusable(event.x, event.y), armed !== null);
        // A held press that drifts off its node is no longer a long press on it.
        if (armed !== null && hitFocusable(event.x, event.y) !== armed) armed = null;
        for (const fn of [...moveListeners]) fn(event.x, event.y);
        continue;
      }
      if (event.down) {
        hoverClear();
        const top = topLayer();
        armed = null;
        armedFocused = false;
        isDown = true;
        held = 0;
        downAt = { x: event.x, y: event.y };
        armedOutside = top && outsideLayer(top, event.x, event.y) ? top : null;
        if (armedOutside) continue;
        const target = hitFocusable(event.x, event.y);
        armed = target;
        armedFocused = target !== null && getFocused() === target;
        if (target) focusNode(target);
        // Batch A (R-L): no focusable under the tap, but a label is: its control takes the focus.
        else focusLabelControlAt(event.x, event.y);
        // A registered drag starts here: its first point is the press point, and nothing is pressed on release.
        const drag = target ? drags.get(target) : undefined;
        if (drag) {
          armed = null;
          dragging = drag;
          drag(event.x, event.y, "move");
        }
      } else if (armedOutside) {
        isDown = false;
        const layer = armedOutside;
        armedOutside = null;
        if (
          layer.dismissOutside !== false &&
          topLayer() === layer &&
          outsideLayer(layer, event.x, event.y)
        )
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
        isDown = false;
      }
    }
    // A press still held on its node counts toward the long press; the frame it reaches the count, it fires.
    if (armed !== null && isDown) {
      held++;
      if (held === LONG_PRESS_FRAMES) {
        const fn = longPresses.get(armed as NodeMirror);
        if (fn) {
          armed = null;
          fn(downAt.x, downAt.y);
        }
      }
    }
  });
}
