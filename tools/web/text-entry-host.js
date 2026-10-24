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

// ---- C4c native-keyboard bridge (touch hosts) ----------------------------------------------
// A hidden <textarea> takes the native keyboard's input and its IME. Its text is sent to the
// same __pocketText seam as physical keys, but only once it is final: during a composition the
// preedit stays in the field (the IME needs it) and the committed string is sent on compositionend.

/** Per-field bridge state: whether a composition is open, and the commit just sent (its echo is dropped). */
export function createBridgeState() {
  return { composing: false, pending: null };
}

/** compositionstart on the hidden field. */
export function bridgeCompositionStart(state) {
  state.composing = true;
}

/** compositionend: the committed string is the text, sent once. */
export function bridgeCompositionEnd(state, data, emit) {
  state.composing = false;
  state.pending = data ? data : null;
  if (data) emit({ t: "ch", s: data });
}

/**
 * beforeinput on the hidden field. Returns true when the native edit must be cancelled (the
 * text went through emit instead); false lets the browser edit the field (composition only).
 */
export function bridgeBeforeInput(state, e, emit) {
  if (state.composing || e.isComposing || e.inputType === "insertCompositionText") return false;
  // The browser may repeat a commit as its own edit right after compositionend: drop the echo.
  const echo = state.pending !== null && e.data === state.pending && (e.inputType === "insertFromComposition" || e.inputType === "insertText");
  state.pending = null;
  if (echo) return true;
  switch (e.inputType) {
    case "insertText":
    case "insertReplacementText":
      if (e.data) emit({ t: "ch", s: e.data });
      return true;
    case "insertFromPaste": {
      const text = e.data ?? e.dataTransfer?.getData?.("text/plain") ?? "";
      if (text) emit({ t: "ch", s: text });
      return true;
    }
    case "insertLineBreak":
    case "insertParagraph":
      emit({ t: "key", k: "Enter" });
      return true;
    case "deleteContentBackward":
      emit({ t: "key", k: "Backspace" });
      return true;
    default:
      return true; // other edits on the hidden field are not text: cancel them
  }
}
