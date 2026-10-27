// Select: a native list, no popup layer. The trigger shows the selected label and a chevron. CIRCLE opens the list in the
// flow below the trigger (it pushes the content under it down) and focus moves to the selected option. UP and DOWN move
// through the options and stop at both ends. CIRCLE selects the focused option, closes the list and returns focus to the
// trigger; CROSS closes it with no change. Controlled: value and onValueChange(next).
//
// What it cannot do, against a popup select: float over its siblings (the list has no overlay layer, so it moves what
// follows it), open upward near the screen edge (no collision flip), close on a tap outside (no pointer dismissal),
// scroll a list longer than the space, or type ahead by letter.
import { useLayoutEffect, useRef, useState } from "react";
import { BTN, focusNode, getFocused, pushFocusController, type FocusDirection } from "@pocketjs/framework/input";
import { Text, View } from "../elements.ts";
import type { NodeMirror } from "../internal/pocket.ts";
import { useButton } from "../input/buttons.ts";
import { useControllableState } from "../primitives/state.ts";
import { Chevron } from "./chevron.tsx";
import { Focusable } from "./focusable.tsx";
import { useTokens } from "./theme.tsx";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
}

/** The index a focus step lands on: UP or DOWN moves one option and stops at either end (no wrap). */
export function clampIndex(count: number, from: number, step: 1 | -1): number {
  return Math.min(count - 1, Math.max(0, from + step));
}

export function Select(props: SelectProps) {
  const T = useTokens() as Record<string, string>;
  const [value, select] = useControllableState(props.value, props.defaultValue ?? "", props.onValueChange);
  const [open, setOpen] = useState(false);
  const trigger = useRef<NodeMirror | null>(null);
  const list = useRef<NodeMirror | null>(null);
  const optionNodes = useRef(new Map<string, NodeMirror>());
  const options = props.options;
  const selected = options.find((o) => o.value === value);
  const latest = useRef({ options, select, value });
  latest.current = { options, select, value };

  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus && trigger.current) focusNode(trigger.current as never);
  };

  // Opening moves focus onto the selected option (the first one when nothing is selected).
  useLayoutEffect(() => {
    if (!open) return;
    const { options: opts, value: v } = latest.current;
    const node = optionNodes.current.get(v) ?? optionNodes.current.get(opts[0]?.value ?? "");
    if (node) focusNode(node as never);
  }, [open]);

  // While open, the list owns UP and DOWN: it clamps at both ends and returns true so focus does not leave it.
  useLayoutEffect(() => {
    if (!open || !list.current) return;
    return pushFocusController(list.current as never, (direction: FocusDirection) => {
      if (direction !== "up" && direction !== "down") return false;
      const ordered = latest.current.options.map((o) => optionNodes.current.get(o.value)).filter((n): n is NodeMirror => !!n);
      const at = ordered.findIndex((n) => n === (getFocused() as unknown as NodeMirror | null));
      if (at < 0) return false;
      focusNode(ordered[clampIndex(ordered.length, at, direction === "down" ? 1 : -1)] as never);
      return true;
    });
  }, [open]);

  // CROSS closes an open list without a change.
  useButton(BTN.CROSS, () => { if (open) close(true); });

  const triggerLook = [T["select.trigger"], T["select.focus"]].join(" ");
  return (
    <View className="flex-col gap-1">
      <Focusable look={triggerLook} nodeRef={trigger} onPress={() => { if (!open) setOpen(true); }}>
        <Text className={T["select.value"]}>{selected ? selected.label : ""}</Text>
        <Chevron turn={open ? 270 : 90} />
      </Focusable>
      {open ? (
        <View className={T["select.list"]} ref={list} debugName="select-list">
          {options.map((o) => {
            const on = o.value === value;
            const look = [T["select.option"], on ? T["select.option.selected"] : "", T["select.focus"]].join(" ");
            return (
              <Focusable
                key={o.value}
                look={look}
                nodeRef={(n: NodeMirror | null) => { if (n) optionNodes.current.set(o.value, n); else optionNodes.current.delete(o.value); }}
                onPress={() => { select(o.value); close(true); }}
              >
                <Text className={T[on ? "select.option.text.selected" : "select.option.text"]}>{o.label}</Text>
              </Focusable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
