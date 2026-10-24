// C4b physical keys: the host page pushes printable keys and edit keys into
// globalThis.__pocketText (tools/web/text-entry-host.js); this pump applies them to the field
// that has focus, in direct mode (no keyboard panel). Each frame it publishes
// globalThis.__pocketTextEntry, which the host reads to decide whether a key is text or pad input.
// The field that has focus alone decides: a panel's keys hold focus, so letters stay buttons there.
import { getFocused, pushFocusController } from "@pocketjs/framework/input";
import type { NodeMirror } from "../internal/pocket.ts";
import { addFramePump } from "../renderer/mount.ts";
import { isAttached } from "./text-field.ts";
import {
  activeField,
  backspace,
  closeField,
  commitField,
  fieldFor,
  insertText,
  isReadOnly,
  moveCaret,
  openField,
  type TextFieldBinding,
} from "./text-field.ts";

/** One physical key, as the host page routes it while a field has focus. */
export type TextEvent = { t: "ch"; s: string } | { t: "key"; k: string };

interface TextGlobals {
  __pocketText?: TextEvent[];
  __pocketTextEntry?: boolean;
}
const g = globalThis as TextGlobals;

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
    case "Enter":
      // ENT inserts a newline in a textarea; in an input it commits and closes (F2).
      if (field.input.multiline && field.open) insertText(field, "\n");
      else commitField(field);
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
    g.__pocketTextEntry = focusedField() !== null;
  });

  return () => {
    remove();
    setCaretController(null);
    g.__pocketTextEntry = false;
  };
}
