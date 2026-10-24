// Physical-key routing for the web host page (tools/web/reader.html). Pure, no DOM: the page
// calls routeKey(event, entryActive) on keydown, and bun tests import the same table.
//
//   entryActive = the guest has a focused text field (globalThis.__pocketTextEntry, written by
//   src/input/text-entry.ts each frame). While it is true, printable keys become text, and
//   Backspace / Enter / Escape become edit keys. Otherwise every key keeps its pad meaning, so
//   letters stay shoulder and face buttons exactly as before.

export const BTN = { SELECT: 0x1, START: 0x8, UP: 0x10, RIGHT: 0x20, DOWN: 0x40, LEFT: 0x80, LTRIGGER: 0x100, RTRIGGER: 0x200, TRIANGLE: 0x1000, CIRCLE: 0x2000, CROSS: 0x4000, SQUARE: 0x8000 };

/** KeyboardEvent.code -> pad button bit. */
export const KEYMAP = { ArrowUp: BTN.UP, ArrowRight: BTN.RIGHT, ArrowDown: BTN.DOWN, ArrowLeft: BTN.LEFT, KeyX: BTN.CROSS, Enter: BTN.CIRCLE, KeyZ: BTN.CIRCLE, KeyA: BTN.SQUARE, KeyS: BTN.TRIANGLE, ShiftLeft: BTN.SELECT, ShiftRight: BTN.SELECT, Space: BTN.START, KeyL: BTN.LTRIGGER, KeyR: BTN.RTRIGGER, KeyQ: BTN.LTRIGGER, KeyE: BTN.RTRIGGER };

/** KeyboardEvent.key -> edit key, while a text field has focus. */
const EDIT_KEYS = { Backspace: "Backspace", Enter: "Enter", Escape: "Escape" };

/** One character with no Ctrl/Meta/Alt: a printable key (Space included, a space character). */
const printable = (key) => [...key].length === 1;

/**
 * @returns {{to:"text",ch:string} | {to:"key",key:string} | {to:"button",bit:number} | null}
 *   null = not ours: the browser keeps its default (Ctrl/Cmd shortcuts while typing, unmapped keys).
 */
export function routeKey(e, entryActive) {
  if (entryActive) {
    if (e.ctrlKey || e.metaKey || e.altKey) return null;
    if (printable(e.key)) return { to: "text", ch: e.key };
    const key = EDIT_KEYS[e.key];
    if (key !== undefined) return { to: "key", key };
  }
  const bit = KEYMAP[e.code];
  return bit === undefined ? null : { to: "button", bit };
}
