// C4b/C4c text entry: the host page pushes physical keys and native-keyboard text into
// globalThis.__pocketText (tools/web/text-entry-host.js). This pump applies them to the field
// that has focus, in direct mode (no keyboard panel). Each frame it publishes what the host needs:
//   __pocketTextEntry     a text field has focus (letters are text, not pad buttons)
//   __pocketTextMultiline the focused field is a textarea (Enter is a newline, not a commit)
// On a touch host (__pocketTextNative) the host also asks __pocketTextHitAt(x, y) whether a tap
// lands on an editable field, so it can summon the native keyboard inside the user gesture.
import { getFocused, hitFocusable, pushFocusController } from "@pocketjs/framework/input";
import type { NodeMirror } from "../internal/pocket.ts";
import { addFramePump } from "../renderer/mount.ts";
import {
  activeField,
  backspace,
  closeField,
  commitField,
  deleteAfter,
  fieldFor,
  insertText,
  isAttached,
  isReadOnly,
  moveCaret,
  moveLine,
  openField,
  type TextFieldBinding,
} from "./text-field.ts";

/** One physical or native-keyboard key, as the host page routes it while a field has focus. */
export type TextEvent = { t: "ch"; s: string } | { t: "key"; k: string };

interface TextGlobals {
  __pocketText?: TextEvent[];
  __pocketTextEntry?: boolean;
  __pocketTextMultiline?: boolean;
  __pocketTextNative?: boolean;
  __pocketTextHitAt?: (x: number, y: number) => boolean;
}
const g = globalThis as TextGlobals;

/** True on a touch host whose page summons the native keyboard for a tap (C4c). */
export function nativeKeyboard(): boolean {
  return g.__pocketTextNative === true;
}

/** The editable field that has focus, or null. Read-only fields never take typing. */
function focusedField(): TextFieldBinding | null {
  const node = getFocused() as NodeMirror | null;
  if (!node) return null;
  const binding = fieldFor(node);
  return binding && !isReadOnly(binding) ? binding : null;
}

function apply(field: TextFieldBinding, event: TextEvent): void {
  if (event.t === "ch") {
    if (!field.open) openField(field, "direct");
    insertText(field, event.s);
    return;
  }
  switch (event.k) {
    case "Backspace":
      if (!field.open) openField(field, "direct");
      backspace(field);
      break;
    case "Delete":
      if (!field.open) openField(field, "direct");
      deleteAfter(field);
      break;
    case "Left":
    case "Right":
      if (!field.open) openField(field, "direct");
      moveCaret(field, event.k === "Left" ? -1 : 1);
      break;
    case "Up":
    case "Down":
      // The host sends these only for a textarea; the field checks again.
      if (field.input.multiline) {
        if (!field.open) openField(field, "direct");
        moveLine(field, event.k === "Up" ? -1 : 1);
      }
      break;
    case "Enter":
      // ENT is a newline in a textarea and a commit in an input (F2).
      if (field.input.multiline) {
        if (!field.open) openField(field, "direct");
        insertText(field, "\n");
      } else commitField(field);
      break;
    case "Escape":
      closeField(field);
      break;
  }
}

/**
 * Install the pump (mount() does this). Returns the teardown.
 * Left/right move the caret of an open direct field (the focus controller swallows them);
 * up/down still move focus, which closes the direct field on the next frame.
 */
export function installTextEntry(): () => void {
  g.__pocketText ??= [];
  g.__pocketTextHitAt = (x, y) => {
    const node = hitFocusable(x, y) as NodeMirror | null;
    const binding = node ? fieldFor(node) : undefined;
    return binding !== undefined && !isReadOnly(binding);
  };
  let caretNode: NodeMirror | null = null;
  let disposeCaret: (() => void) | null = null;
  const setCaretController = (field: TextFieldBinding | null): void => {
    if (field?.node === caretNode) return;
    disposeCaret?.();
    disposeCaret = null;
    caretNode = field?.node ?? null;
    if (!field) return;
    disposeCaret = pushFocusController(field.node, (direction) => {
      if (!field.open || field.mode !== "direct") return false;
      if (direction === "left") moveCaret(field, -1);
      else if (direction === "right") moveCaret(field, 1);
      else return false;
      return true;
    });
  };

  const remove = addFramePump(() => {
    // A direct field closes when focus leaves it or React removes it.
    const open = activeField();
    if (open && open.mode === "direct" && (open !== focusedField() || !isAttached(open))) {
      closeField(open, false);
    }
    // One key per frame: a controlled field's value prop catches up with its onChange on the next
    // render, so a second key in the same frame would edit the stale string.
    const event = g.__pocketText?.shift();
    if (event) {
      const field = focusedField();
      if (field) apply(field, event); // no focused field: the key is dropped, never typed
    }
    const live = activeField();
    setCaretController(live?.mode === "direct" ? live : null);
    const focused = focusedField();
    g.__pocketTextEntry = focused !== null;
    g.__pocketTextMultiline = focused?.input.multiline === true;
  });

  return () => {
    remove();
    setCaretController(null);
    g.__pocketTextEntry = false;
    g.__pocketTextMultiline = false;
    delete g.__pocketTextHitAt;
  };
}
