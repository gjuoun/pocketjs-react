// C4 text input: the field's editable state, JSX-free so tests and a host with a real
// keyboard can drive it without React. One binding per DOM text entry element
// (<input>/<textarea>) or native <TextField>; the binding owns the element's text
// children, because React never gives <input> children.
//
// The display contract mirrors React DOM where it can: the app owns the string (controlled
// `value`), an uncontrolled field owns its own (seeded from `defaultValue`), and every
// edit reports the new value through onInput then onChange with a DOM-shaped event.
// The caret is drawn as a "|" inside the text while the keyboard is open (the core has no
// text cursor primitive).
import {
  createTextNode,
  insertNode,
  type NodeMirror,
  removeNode,
  replaceText,
  rootMirror,
  setProp,
} from "../internal/pocket.ts";

/** Value text and placeholder text are fixed literals: the core has no text-color
 *  inheritance (the C2 known gap), so the field picks its own pair. */
export const FIELD_VALUE_CLASS = "text-base text-slate-900";
export const FIELD_PLACEHOLDER_CLASS = "text-base text-slate-500";
/** Caret marker while the keyboard is open. ASCII on purpose: the atlas is guaranteed. */
export const CARET = "|";
/** Mask character for type="password". ASCII for the same reason. */
export const MASK = "*";

export interface TextFieldEvent {
  type: "change" | "input";
  target: { value: string; name?: string };
}

/** The DOM-shaped props a field understands, already normalized by the compat layer. */
export interface TextFieldInput {
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  maxLength?: number;
  masked?: boolean;
  multiline?: boolean;
  name?: string;
  onChange?: (event: TextFieldEvent) => void;
  onInput?: (event: TextFieldEvent) => void;
  onClick?: () => void;
}

export interface TextFieldBinding {
  node: NodeMirror;
  tag: string;
  input: TextFieldInput;
  /** The value an uncontrolled field owns; ignored while `value` is present. */
  internal: string;
  /** Insertion point, clamped live against the current value. */
  caret: number;
  open: boolean;
  texts: NodeMirror[];
  classes: string[];
}

// ---------------------------------------------------------------------------
// Pure logic — no native tree, no host. Unit-tested on their own.
// ---------------------------------------------------------------------------

/** What the field draws: one string per line, plus whether it is the placeholder. */
export interface Display {
  lines: string[];
  placeholder: boolean;
}

/** Mask the value, insert the caret marker, split lines. A placeholder shows only
 *  while the field is closed and empty; an empty line draws a space so it keeps its
 *  line height (the reader's own rule). */
export function display(
  value: string,
  caret: number,
  open: boolean,
  opts: { masked?: boolean; multiline?: boolean; placeholder?: string },
): Display {
  const shown = opts.masked ? MASK.repeat([...value].length) : value;
  if (!open && value === "") {
    const hint = opts.placeholder ?? "";
    return { lines: [hint || " "], placeholder: hint !== "" };
  }
  const at = Math.max(0, Math.min(caret, shown.length));
  const text = open ? shown.slice(0, at) + CARET + shown.slice(at) : shown;
  const lines = opts.multiline ? text.split("\n") : [text];
  return { lines: lines.map((line) => (line === "" ? " " : line)), placeholder: false };
}

/** Insert at the caret, refusing an insert that would pass maxLength. */
export function insertAt(
  value: string,
  caret: number,
  text: string,
  maxLength?: number,
): { value: string; caret: number } | null {
  if (maxLength !== undefined && value.length + text.length > maxLength) return null;
  const at = Math.max(0, Math.min(caret, value.length));
  return { value: value.slice(0, at) + text + value.slice(at), caret: at + text.length };
}

/** Delete one character before the caret. */
export function deleteBefore(
  value: string,
  caret: number,
): { value: string; caret: number } {
  const at = Math.max(0, Math.min(caret, value.length));
  if (at === 0) return { value, caret: 0 };
  return { value: value.slice(0, at - 1) + value.slice(at), caret: at - 1 };
}

/** Move the caret, clamped to the value. */
export function moveTo(value: string, caret: number, delta: number): number {
  return Math.max(0, Math.min(caret + delta, value.length));
}

// ---------------------------------------------------------------------------
// Bindings — one per element, kept in a WeakMap; the open one lives in the store.
// ---------------------------------------------------------------------------

const bindings = new WeakMap<NodeMirror, TextFieldBinding>();
const listeners = new Set<() => void>();
let active: TextFieldBinding | null = null;
/** The open field, or null — read by the keyboard panel and by mount() teardown. */
export function activeField(): TextFieldBinding | null {
  return active;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify(): void {
  for (const listener of [...listeners]) listener();
}

/** The value the field currently shows and edits. */
export function valueOf(binding: TextFieldBinding): string {
  return binding.input.value ?? binding.internal;
}

/** Read-only fields (value without onChange) render but never open a keyboard. */
export function isReadOnly(binding: TextFieldBinding): boolean {
  return binding.input.value !== undefined && binding.input.onChange === undefined;
}

export function fieldFor(node: NodeMirror): TextFieldBinding | undefined {
  return bindings.get(node);
}

/** Draw the binding's current value into its text children, creating or dropping lines. */
function render(binding: TextFieldBinding): void {
  if (!binding.node.parent) return; // detached: nothing to draw
  const value = valueOf(binding);
  binding.caret = Math.max(0, Math.min(binding.caret, value.length));
  const shown = display(value, binding.caret, binding.open, {
    masked: binding.input.masked,
    multiline: binding.input.multiline,
    placeholder: binding.input.placeholder,
  });
  const cls = shown.placeholder ? FIELD_PLACEHOLDER_CLASS : FIELD_VALUE_CLASS;
  while (binding.texts.length < shown.lines.length) {
    const text = createTextNode(" ");
    binding.texts.push(text);
    binding.classes.push("");
    insertNode(binding.node, text);
  }
  while (binding.texts.length > shown.lines.length) {
    const text = binding.texts.pop()!;
    binding.classes.pop();
    removeNode(binding.node, text);
  }
  for (let i = 0; i < shown.lines.length; i++) {
    const text = binding.texts[i];
    if (text.text !== shown.lines[i]) replaceText(text, shown.lines[i]);
    if (binding.classes[i] !== cls) {
      binding.classes[i] = cls;
      setProp(text, "class", cls);
    }
  }
}

/** Report a new value to the app: onInput first, then onChange (React DOM's order). */
function report(binding: TextFieldBinding, next: string): void {
  const event = (type: TextFieldEvent["type"]): TextFieldEvent => ({
    type,
    target: { value: next, name: binding.input.name },
  });
  binding.input.onInput?.(event("input"));
  binding.input.onChange?.(event("change"));
}

/** Apply an edit: controlled fields report it, uncontrolled ones keep it. A no-op edit
 *  (backspace at the start) still moves the caret and redraws, but reports nothing. */
function edit(binding: TextFieldBinding, next: string, caret: number): void {
  const before = valueOf(binding);
  binding.caret = caret;
  if (next !== before) {
    if (binding.input.value === undefined) binding.internal = next;
    render(binding);
    report(binding, next);
    return;
  }
  render(binding);
}

export interface FieldResult {
  open: boolean;
  value: string;
}

/** Open the field's keyboard (a no-op for a read-only field). */
export function openField(binding: TextFieldBinding): void {
  if (isReadOnly(binding)) return;
  if (active && active !== binding) closeField(active, false);
  binding.open = true;
  binding.caret = valueOf(binding).length;
  active = binding;
  render(binding);
  notify();
}

/** Close the keyboard; `restore` is false when focus is moving to another field. */
export function closeField(binding: TextFieldBinding, restoreCaret = true): void {
  if (!binding.open) return;
  binding.open = false;
  if (restoreCaret) binding.caret = valueOf(binding).length;
  if (active === binding) active = null;
  render(binding);
  notify();
}

export function insertText(binding: TextFieldBinding, text: string): void {
  const next = insertAt(valueOf(binding), binding.caret, text, binding.input.maxLength);
  if (!next) return;
  edit(binding, next.value, next.caret);
}

export function backspace(binding: TextFieldBinding): void {
  const next = deleteBefore(valueOf(binding), binding.caret);
  edit(binding, next.value, next.caret);
}

export function moveCaret(binding: TextFieldBinding, delta: number): void {
  binding.caret = moveTo(valueOf(binding), binding.caret, delta);
  render(binding);
}

/** Close the field and report its final value (the keyboard's OK / START). */
export function commitField(binding: TextFieldBinding): void {
  const value = valueOf(binding);
  closeField(binding);
  report(binding, value);
}

// ---------------------------------------------------------------------------
// Binding a native element — called by the compat layer on create and on update.
// ---------------------------------------------------------------------------

/** Bind (or rebind) a native view as a text entry. Called once per mount and again on
 *  every commit, so a controlled value reaches the drawn text without a React child. */
export function bindField(
  node: NodeMirror,
  tag: string,
  input: TextFieldInput,
): TextFieldBinding {
  let binding = bindings.get(node);
  if (!binding) {
    binding = {
      node,
      tag,
      input,
      internal: input.defaultValue ?? "",
      caret: (input.defaultValue ?? "").length,
      open: false,
      texts: [],
      classes: [],
    };
    bindings.set(node, binding);
  } else {
    binding.input = input;
  }
  if (isReadOnly(binding) && binding.open) closeField(binding, false);
  render(binding);
  return binding;
}

/** Drop a binding (element removed by React, or mount() teardown). */
export function unbindField(node: NodeMirror): void {
  const binding = bindings.get(node);
  if (!binding) return;
  bindings.delete(node);
  if (active === binding) {
    binding.open = false;
    active = null;
    notify();
  }
}

/** True while the binding's element is still in the tree (checked once per frame, so a
 *  React unmount that never calls unbindField cannot leave a keyboard over nothing). */
export function isAttached(binding: TextFieldBinding): boolean {
  let node: NodeMirror | null = binding.node;
  while (node) {
    if (node === rootMirror) return true;
    node = node.parent;
  }
  return false;
}

/** Forget the open field (mount() teardown: a fresh mount starts with no keyboard). */
export function resetTextFields(): void {
  if (active) {
    active.open = false;
    active = null;
    notify();
  }
}
