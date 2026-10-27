// Accordion: AccordionItem rows, each a trigger and a panel. type "single" keeps at most one item open (opening one closes
// the others); "multiple" lets any number be open. Controlled: value (a string for single, string[] for multiple) and
// onValueChange(next). CIRCLE on a trigger toggles its item. LEFT on an open trigger collapses it (it returns true only
// when it collapses), and CROSS collapses the focused open item. The panel mounts only while open, and its height is its
// lines plus the token padding and gap. The chevron turns 0 (closed, right) to 90 (open, down) through transition-all.
// data-state equivalent: each item root carries debugName "accordion-item:<value>:open" or ":closed" in the mirror.
import { createContext, type ReactNode, useContext, useLayoutEffect, useRef } from "react";
import { BTN, getFocused, pushFocusController, type FocusDirection } from "@pocketjs/framework/input";
import { Text, View } from "../elements.ts";
import type { NodeMirror } from "../internal/pocket.ts";
import { useButton } from "../input/buttons.ts";
import { useControllableState } from "../primitives/state.ts";
import { Chevron } from "./chevron.tsx";
import { Focusable } from "./focusable.tsx";
import { useTokens } from "./theme.tsx";

interface Entry {
  value: string;
  trigger: NodeMirror;
  collapse: () => boolean;
}
interface GroupValue {
  open: (value: string) => boolean;
  toggle: (value: string) => void;
  entries: { current: Entry[] };
}
const Ctx = createContext<GroupValue | null>(null);

/** The open set after a press on one item: single keeps only that item; multiple toggles it. */
export function nextOpen(type: "single" | "multiple", current: string[], value: string): string[] {
  if (current.includes(value)) return current.filter((v) => v !== value);
  return type === "single" ? [value] : [...current, value];
}

export interface AccordionProps {
  type?: "single" | "multiple";
  value?: string | string[];
  defaultValue?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  children?: ReactNode;
}

const toArray = (v: string | string[] | undefined): string[] | undefined => (v === undefined ? undefined : Array.isArray(v) ? v : v === "" ? [] : [v]);

export function Accordion(props: AccordionProps) {
  const T = useTokens() as Record<string, string>;
  const type = props.type ?? "single";
  const [open, setOpen] = useControllableState<string[]>(
    toArray(props.value),
    toArray(props.defaultValue) ?? [],
    (next) => props.onValueChange?.(type === "multiple" ? next : (next[0] ?? "")),
  );
  const entries = useRef<Entry[]>([]);
  const latest = useRef({ open, setOpen, type });
  latest.current = { open, setOpen, type };
  const group: GroupValue = {
    open: (value) => latest.current.open.includes(value),
    toggle: (value) => latest.current.setOpen(nextOpen(latest.current.type, latest.current.open, value)),
    entries,
  };
  // CROSS collapses the focused item when it is open; the group owns the button, so only the focused item answers.
  useButton(BTN.CROSS, () => {
    const f = getFocused() as unknown as NodeMirror | null;
    const hit = entries.current.find((e) => e.trigger === f);
    if (hit) hit.collapse();
  });
  return <Ctx.Provider value={group}><View className={T["accordion.root"]}>{props.children}</View></Ctx.Provider>;
}

export interface AccordionItemProps {
  value: string;
  title: string;
  /** The panel lines: each string is one Text line under the trigger, shown while the item is open. */
  children?: string | string[];
}

export function AccordionItem(props: AccordionItemProps) {
  const T = useTokens() as Record<string, string>;
  const g = useContext(Ctx);
  if (!g) throw new Error("pocketjs-react native: AccordionItem must be used inside <Accordion>");
  const trigger = useRef<NodeMirror | null>(null);
  const isOpen = g.open(props.value);
  const latest = useRef({ isOpen, g });
  latest.current = { isOpen, g };
  useLayoutEffect(() => {
    if (!trigger.current) return;
    const node = trigger.current;
    const entry: Entry = {
      value: props.value,
      trigger: node,
      collapse: () => { if (!latest.current.isOpen) return false; latest.current.g.toggle(props.value); return true; },
    };
    g.entries.current.push(entry);
    // LEFT collapses an open item and returns true only then; a closed item leaves LEFT to the linear focus.
    const release = pushFocusController(node as never, (direction: FocusDirection) => direction === "left" && entry.collapse());
    return () => {
      release();
      g.entries.current = g.entries.current.filter((x) => x !== entry);
    };
  }, [props.value]);
  const lines = props.children === undefined ? [] : Array.isArray(props.children) ? props.children : [props.children];
  return (
    <View className={T["accordion.item"]} debugName={"accordion-item:" + props.value + (isOpen ? ":open" : ":closed")}>
      <Focusable look={[T["accordion.trigger"], T["accordion.focus"]].join(" ")} nodeRef={trigger} onPress={() => g.toggle(props.value)}>
        <Text className={T["accordion.trigger.text"]}>{props.title}</Text>
        <Chevron turn={isOpen ? 90 : 0} />
      </Focusable>
      {isOpen ? (
        <View className={T["accordion.content"]} debugName="accordion-panel">
          {lines.map((l) => <Text key={l} className={T["accordion.body"]}>{l}</Text>)}
        </View>
      ) : null}
    </View>
  );
}
