// <TextField>: the native spelling of a text entry. It is the same field as <input> (one
// binding, one keyboard, one onChange contract) with PocketJS's own prop names: className
// instead of DOM props, and no DOM-only surface. Implemented as a thin wrapper over the
// compat path, so the two cannot drift apart.
import type { ReactNode } from "react";
import type { TextFieldEvent } from "./text-field.ts";

export interface TextFieldProps {
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  maxLength?: number;
  /** Newlines split lines; ENT inserts one. */
  multiline?: boolean;
  name?: string;
  /** Called with a DOM-shaped event; the new value is event.target.value. */
  onChange?: (event: TextFieldEvent) => void;
  onInput?: (event: TextFieldEvent) => void;
  onClick?: () => void;
  className?: string;
  children?: ReactNode;
}

export function TextField(props: TextFieldProps) {
  const { multiline, ...rest } = props;
  const attrs = rest as Record<string, unknown>;
  return multiline ? <textarea {...attrs} /> : <input {...attrs} />;
}
