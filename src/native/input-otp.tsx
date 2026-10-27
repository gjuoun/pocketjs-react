// InputOTP: a segmented code of N one-character cells. Each cell is a one-character text field on the core's own text
// entry: CIRCLE on a cell opens the keyboard on it; a typed digit fills it and the keyboard moves on to the next cell; backspace
// clears the cell and everything after it, and steps back one. LEFT and RIGHT move between cells (the core's focus traversal).
// The code is a prefix: a cell past the last digit does not take one, so no cell is ever left with a gap. The open cell draws
// the caret. onComplete(code) runs once, when the last cell fills. Controlled: value and onChange(code).
import { useLayoutEffect, useRef, useState } from "react";
import { focusNode } from "@pocketjs/framework/input";
import { View } from "../elements.ts";
import type { NodeMirror } from "../internal/pocket.ts";
import { bindField, closeField, openField, type TextFieldBinding } from "../input/text-field.ts";
import { Focusable } from "./focusable.tsx";
import { useTokens } from "./theme.tsx";

export interface InputOTPProps {
  /** The number of cells (default 6). */
  length?: number;
  value?: string;
  onChange?: (code: string) => void;
  onComplete?: (code: string) => void;
}

/** The code after cell i takes ch (typed), or after backspace at i (""): the digits before i, then ch and what follows. */
export function typeAt(code: string, i: number, ch: string, length: number): string {
  if (ch === "") return code.slice(0, i);
  if (i > code.length || i >= length) return code;
  return code.slice(0, i) + ch.slice(0, 1) + code.slice(i + 1);
}

interface CellProps {
  index: number;
  char: string;
  onInput: (index: number, next: string) => void;
  register: (index: number, node: NodeMirror | null, binding: TextFieldBinding | null) => void;
}

function Cell(props: CellProps) {
  const T = useTokens() as Record<string, string>;
  const node = useRef<NodeMirror | null>(null);
  const bound = useRef<TextFieldBinding | null>(null);
  const lastChar = useRef<string | null>(null);
  const [, setTick] = useState(0);
  useLayoutEffect(() => {
    if (!node.current) return;
    const first = bound.current === null;
    bound.current = bindField(node.current, "input", {
      value: props.char,
      placeholder: "_",
      maxLength: 1,
      onChange: (e: { target: { value: string } }) => props.onInput(props.index, e.target.value),
    } as never);
    props.register(props.index, node.current, bound.current);
    // bindField draws its text in a layout effect after the flush: one more commit shows a value that changed.
    if (first || lastChar.current !== props.char) { lastChar.current = props.char; setTick((t) => t + 1); }
  });
  useLayoutEffect(() => () => { props.register(props.index, null, null); }, []);
  return (
    <Focusable look={[T["otp.cell"], T["otp.focus"]].join(" ")} nodeRef={node} onPress={() => { if (bound.current) openField(bound.current); }} />
  );
}

export function InputOTP(props: InputOTPProps) {
  const T = useTokens() as Record<string, string>;
  const length = props.length ?? 6;
  const code = props.value ?? "";
  const cells = useRef<Array<{ node: NodeMirror; binding: TextFieldBinding } | null>>([]);
  // The code as of the last edit: two digits typed before React re-renders must both land, so edit reads this, not the prop.
  const latest = useRef(code);
  latest.current = code;
  const edit = (i: number, next: string) => {
    const before = latest.current;
    const value = typeAt(before, i, next, length);
    if (value === before) return;
    latest.current = value;
    props.onChange?.(value);
    if (value.length === length && before.length < length) props.onComplete?.(value);
    const to = next === "" ? i - 1 : i + 1;
    const target = to >= 0 && to < length ? cells.current[to] : null;
    if (target) { focusNode(target.node as never); openField(target.binding); }
    else if (cells.current[i]) closeField(cells.current[i]!.binding);
  };
  const register = (index: number, node: NodeMirror | null, binding: TextFieldBinding | null) => {
    cells.current[index] = node && binding ? { node, binding } : null;
  };
  return (
    <View className={T["otp.row"]} debugName="input-otp">
      {Array.from({ length }, (_, i) => (
        <Cell key={i} index={i} char={code[i] ?? ""} onInput={edit} register={register} />
      ))}
    </View>
  );
}
