// Input and Textarea: a controlled text field on the core text-field seam (bindField / openField).
// Controlled: the value prop is the source; onChange(next) reports every edit. Placeholder and value text
// colours come from the seam (slate-500 placeholder, 4.76:1 on white; slate-400 measures 2.56:1 and is not used).
// Probe finding: bindField applies the text class from a layout effect, after the class flush of that commit,
// so the new text waits for the next commit. The field forces one re-render when it binds or its value changes.
import { useLayoutEffect, useRef, useState } from "react";
import { View } from "../elements.ts";
import type { NodeMirror } from "../internal/pocket.ts";
import { bindField, openField, type TextFieldBinding, unbindField } from "../input/text-field.ts";
import { Focusable } from "./focusable.tsx";
import { useField } from "./field.tsx";
import { useTokens } from "./theme.tsx";

interface FieldProps {
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  multiline?: boolean;
  onChange?: (next: string) => void;
  /** Fired when the field is committed (physical Enter, or the on-screen keyboard's OK/START). */
  onCommit?: (value: string) => void;
  /** The node ref of the control (a ref object or a callback), so a parent can focus it. */
  nodeRef?: { current: NodeMirror | null } | ((node: NodeMirror | null) => void);
}

function Field(props: FieldProps) {
  const T = useTokens() as Record<string, string>;
  const node = useRef<NodeMirror | null>(null);
  const bound = useRef<TextFieldBinding | null>(null);
  const lastValue = useRef<string | undefined | null>(null);
  const [, setTick] = useState(0);
  useLayoutEffect(() => {
    if (!node.current) return;
    const input = {
      value: props.value,
      placeholder: props.placeholder,
      multiline: props.multiline,
      onChange: (e: { target: { value: string } }) => props.onChange?.(e.target.value),
      onCommit: (value: string) => props.onCommit?.(value),
    };
    const first = bound.current === null;
    bound.current = bindField(node.current, props.multiline ? "textarea" : "input", input as never);
    if (first || lastValue.current !== props.value) {
      lastValue.current = props.value;
      setTick((t) => t + 1);
    }
  });
  useLayoutEffect(() => () => { if (node.current) unbindField(node.current); }, []);
  // A control inside a Field takes the Field's state: disabled, or invalid (a red border, same size, no focus border).
  const field = useField();
  const disabled = props.disabled === true || field.disabled;
  const invalid = field.invalid && !disabled;
  const base = props.multiline ? T["field.textarea"] : T["field.base"];
  const look = disabled
    ? [base, T["field.disabled"]].join(" ")
    : invalid
      ? (props.multiline ? T["field.textarea.invalid"] : T["field.invalid"])
      : [base, T["field.focus"]].join(" ");
  const setNode = (n: NodeMirror | null) => {
    node.current = n;
    const ref = props.nodeRef;
    if (typeof ref === "function") ref(n);
    else if (ref) ref.current = n;
  };
  return (
    <Focusable look={look} disabled={disabled} nodeRef={setNode} onPress={() => { if (bound.current) openField(bound.current); }} />
  );
}

export function Input(props: FieldProps) {
  return <Field {...props} multiline={false} />;
}

export function Textarea(props: FieldProps) {
  return <Field {...props} multiline />;
}
