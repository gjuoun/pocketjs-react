// C4b/C4c text entry: the host page pushes physical keys and native-keyboard text into
// globalThis.__pocketText (tools/web/text-entry-host.js), and the pointer pump pushes a press on
// the focused field as a caret event. This pump applies them to the field that has focus, in direct
// mode (no keyboard panel). Each frame it publishes what the host needs:
//   __pocketTextEntry     a text field has focus (letters are text, not pad buttons)
//   __pocketTextMultiline the focused field is a textarea (Enter is a newline, not a commit)
// A caret event places the caret at a point inside the field. The point is mapped through the
// core's own text runs (captureTexts, scoped to the field's node), so the caret lands where the text
// is drawn. The queue waits for that read, so keys typed after the tap apply after it.
import { getFocused, hitFocusable, pushFocusController } from "@pocketjs/framework/input";
import { getOps } from "@pocketjs/framework/host";
import type { NodeMirror } from "../internal/pocket.ts";
import { addFramePump } from "../renderer/mount.ts";
import { type InputSource, setInputSource } from "./input-source.ts";
import { setFocusedPress } from "./pointer.ts";
import {
  activeField,
  backspace,
  caretAtPoint,
  closeField,
  commitField,
  deleteAfter,
  display,
  FIELD_FONT_SLOT,
  fieldFor,
  inKeyboardPanel,
  insertText,
  isAttached,
  isReadOnly,
  keyboardMode,
  MASK,
  moveCaret,
  moveLine,
  openField,
  parseRuns,
  sameLines,
  setCaret,
  type TextFieldBinding,
  valueOf,
} from "./text-field.ts";

/** One physical or native-keyboard key, or a press on the focused field that places the caret. */
export type TextEvent =
  | { t: "ch"; s: string }
  | { t: "key"; k: string }
  | { t: "caret"; x: number; y: number };
type KeyEvent = Exclude<TextEvent, { t: "caret" }>;

interface TextGlobals {
  __pocketText?: TextEvent[];
  __pocketTextEntry?: boolean;
  __pocketTextMultiline?: boolean;
  __pocketTextNative?: boolean;
  __pocketTextHitAt?: (x: number, y: number) => boolean;
}
const g = globalThis as TextGlobals;

/**
 * The primary surface, which the caret read captures (captureTexts with the field's node as the root).
 * Surface 1 is the auxiliary surface: a host with none, like the web reader, refuses the capture.
 */
const CARET_SURFACE = 0;
interface TextOps {
  measureText(text: string, slot: number): number;
  captureTexts?(surface: number, root: number): boolean;
  capturedTexts?(surface: number): string;
}
const ops = (): TextOps => getOps() as unknown as TextOps;
const measure = (text: string): number => ops().measureText(text, FIELD_FONT_SLOT);

/** True on a touch host whose page summons the native keyboard for a tap (C4c). */
export function nativeKeyboard(): boolean {
  return g.__pocketTextNative === true;
}

/** The editable field that has focus, or null. Read-only fields never take typing. Focus on a key of the open
 *  field's keyboard is still that field's entry: a physical key reaches it while its panel is up. */
function focusedField(): TextFieldBinding | null {
  const node = getFocused() as NodeMirror | null;
  if (!node) return null;
  const binding = fieldFor(node) ?? (inKeyboardPanel(node) ? activeField() : undefined);
  return binding && !isReadOnly(binding) ? binding : null;
}

/** The source a pointer press on the focused field records: the on-screen keyboard, or the native one on a touch host. */
function summonSource(): InputSource {
  return nativeKeyboard() ? "physical" : "onscreen";
}

/** A physical key (or the native keyboard's text) reaches the field: it is the last input, so the panel hides. */
function apply(field: TextFieldBinding, event: KeyEvent): void {
  setInputSource("physical");
  if (event.t === "ch") {
    if (!field.open) openField(field, "physical");
    insertText(field, event.s);
    return;
  }
  switch (event.k) {
    case "Backspace":
      if (!field.open) openField(field, "physical");
      backspace(field);
      break;
    case "Delete":
      if (!field.open) openField(field, "physical");
      deleteAfter(field);
      break;
    case "Left":
    case "Right":
      if (!field.open) openField(field, "physical");
      moveCaret(field, event.k === "Left" ? -1 : 1);
      break;
    case "Up":
    case "Down":
      // The host sends these only for a textarea; the field checks again.
      if (field.input.multiline) {
        if (!field.open) openField(field, "physical");
        moveLine(field, event.k === "Up" ? -1 : 1);
      }
      break;
    case "Enter":
      // ENT is a newline in a textarea and a commit in an input (F2).
      if (field.input.multiline) {
        if (!field.open) openField(field, "physical");
        insertText(field, "\n");
      } else commitField(field);
      break;
    case "Escape":
      closeField(field);
      break;
  }
}

/** A caret placement waiting for a fresh read of the field's runs. */
interface PendingCaret {
  field: TextFieldBinding;
  x: number;
  y: number;
  expect: string[];
  tries: number;
}
let pending: PendingCaret | null = null;

/** The lines the field draws with its caret: a read shows the field only when it matches these. */
function drawnLines(field: TextFieldBinding): string[] {
  return display(valueOf(field), field.caret, true, {
    masked: field.input.masked,
    multiline: field.input.multiline,
    placeholder: field.input.placeholder,
  }).lines;
}

function armCapture(field: TextFieldBinding): void {
  ops().captureTexts?.(CARET_SURFACE, field.node.id);
}

function startCaret(field: TextFieldBinding, x: number, y: number): void {
  // A press on the field summons its keyboard: a closed field opens with that source, an open one takes it.
  if (!field.open) openField(field, summonSource());
  else setInputSource(summonSource());
  pending = { field, x, y, expect: drawnLines(field), tries: 0 };
  armCapture(field);
}

/** Apply a pending caret placement once the core has drawn the field's current lines. */
function resolveCaret(): void {
  const p = pending;
  if (!p) return;
  if (!isAttached(p.field) || focusedField() !== p.field) {
    pending = null;
    return;
  }
  const runs = parseRuns(ops().capturedTexts?.(CARET_SURFACE) ?? "");
  if (!sameLines(runs, p.expect)) {
    if (++p.tries > 4) {
      pending = null; // no fresh read: the caret stays where it was
      return;
    }
    armCapture(p.field);
    return;
  }
  const value = valueOf(p.field);
  const shown = p.field.input.masked ? MASK.repeat([...value].length) : value;
  setCaret(p.field, caretAtPoint(shown.split("\n"), runs, p.x, p.y, measure));
  pending = null;
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
  // A press on the field that already had focus is a caret placement (desktop click, touch tap).
  setFocusedPress((node, x, y) => {
    const binding = fieldFor(node);
    if (!binding || isReadOnly(binding)) return false;
    (g.__pocketText ??= []).push({ t: "caret", x, y });
    return true;
  });
  let caretNode: NodeMirror | null = null;
  let disposeCaret: (() => void) | null = null;
  const setCaretController = (field: TextFieldBinding | null): void => {
    if (field?.node === caretNode) return;
    disposeCaret?.();
    disposeCaret = null;
    caretNode = field?.node ?? null;
    if (!field) return;
    disposeCaret = pushFocusController(field.node, (direction) => {
      if (!field.open || keyboardMode() !== "direct") return false;
      if (direction === "left") moveCaret(field, -1);
      else if (direction === "right") moveCaret(field, 1);
      else return false;
      return true;
    });
  };

  const remove = addFramePump(() => {
    // A direct field closes when focus leaves it or React removes it.
    const open = activeField();
    if (open && keyboardMode() === "direct" && (open !== focusedField() || !isAttached(open))) {
      closeField(open, false);
    }
    // One queued event per frame: a controlled field's value prop catches up with its onChange on
    // the next render, so a second key in the same frame would edit the stale string. While a caret
    // read is pending, the queue waits, so keys typed after a tap apply after the caret moves.
    if (pending) {
      resolveCaret();
    } else {
      const event = g.__pocketText?.shift();
      const field = event ? focusedField() : null; // no focused field: the event is dropped
      if (event && field) {
        if (event.t === "caret") startCaret(field, event.x, event.y);
        else apply(field, event);
      }
    }
    const live = activeField();
    setCaretController(live && keyboardMode() === "direct" ? live : null);
    const focused = focusedField();
    g.__pocketTextEntry = focused !== null;
    g.__pocketTextMultiline = focused?.input.multiline === true;
  });

  return () => {
    remove();
    setFocusedPress(null);
    pending = null;
    setCaretController(null);
    g.__pocketTextEntry = false;
    g.__pocketTextMultiline = false;
    delete g.__pocketTextHitAt;
  };
}
