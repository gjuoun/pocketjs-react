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
import { useTokens } from "./theme.tsx";

interface FieldProps {
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  multiline?: boolean;
  onChange?: (next: string) => void;
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
    };
    const first = bound.current === null;
    bound.current = bindField(node.current, props.multiline ? "textarea" : "input", input as never);
    if (first || lastValue.current !== props.value) {
      lastValue.current = props.value;
      setTick((t) => t + 1);
    }
  });
  useLayoutEffect(() => () => { if (node.current) unbindField(node.current); }, []);
  const base = props.multiline ? T["field.textarea"] : T["field.base"];
  const look = props.disabled
    ? [base, T["field.disabled"]].join(" ")
    : [base, T["field.focus"]].join(" ");
  return (
    <Focusable look={look} disabled={props.disabled} nodeRef={node} onPress={() => { if (bound.current) openField(bound.current); }} />
  );
}

export function Input(props: FieldProps) {
  return <Field {...props} multiline={false} />;
}

export function Textarea(props: FieldProps) {
  return <Field {...props} multiline />;
}
