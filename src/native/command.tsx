// Command: the searchable list. An input filters the items by their label (case-insensitive substring); the groups keep
// their headings and drop out when no item in them matches; an empty result draws one line. The focus controller on the root
// owns UP and DOWN: from the input DOWN enters the list at its first item and UP at its last; inside the list UP and DOWN
// step through the visible items and wrap at both ends; LEFT and RIGHT stay put. CIRCLE on an item (Enter) reports its value
// through onSelect(value). Items mount only when they match, so the list the controller walks is the list on screen.
import { useLayoutEffect, useRef, useState } from "react";
import { focusNode, getFocused, pushFocusController, type FocusDirection } from "@pocketjs/framework/input";
import { Text, View } from "../elements.ts";
import type { NodeMirror } from "../internal/pocket.ts";
import { Focusable } from "./focusable.tsx";
import { Input } from "./input.tsx";
import { wrapIndex } from "./dropdown-menu.tsx";
import { useTokens } from "./theme.tsx";

export interface CommandItem {
  value: string;
  label: string;
}

export interface CommandGroup {
  heading: string;
  items: CommandItem[];
}

export interface CommandProps {
  groups: CommandGroup[];
  placeholder?: string;
  /** The line drawn when nothing matches (default "No results."). */
  emptyText?: string;
  onSelect?: (value: string) => void;
}

/** Whether an item's label matches the query (case-insensitive substring; an empty query matches everything). */
export function matches(label: string, query: string): boolean {
  return label.toLowerCase().includes(query.trim().toLowerCase());
}

/** The groups that still have a matching item, each with only its matching items, in their order. */
export function filterGroups(groups: CommandGroup[], query: string): CommandGroup[] {
  return groups
    .map((g) => ({ heading: g.heading, items: g.items.filter((i) => matches(i.label, query)) }))
    .filter((g) => g.items.length > 0);
}

export function Command(props: CommandProps) {
  const T = useTokens() as Record<string, string>;
  const [query, setQuery] = useState("");
  const root = useRef<NodeMirror | null>(null);
  const input = useRef<NodeMirror | null>(null);
  const nodes = useRef(new Map<string, NodeMirror>());
  const visible = filterGroups(props.groups, query);
  const order = visible.flatMap((g) => g.items.map((i) => i.value));
  const walk = useRef<string[]>([]);
  walk.current = order;
  const select = useRef(props.onSelect);
  select.current = props.onSelect;
  useLayoutEffect(() => {
    if (!root.current) return;
    return pushFocusController(root.current as never, (direction: FocusDirection) => {
      const focused = getFocused() as unknown as NodeMirror;
      const values = walk.current;
      const at = values.findIndex((v) => nodes.current.get(v) === focused);
      if (at < 0) {
        if (focused !== input.current || values.length === 0) return false;
        if (direction === "down") { focusNode(nodes.current.get(values[0]) as never); return true; }
        if (direction === "up") { focusNode(nodes.current.get(values[values.length - 1]) as never); return true; }
        return false;
      }
      if (direction === "up" || direction === "down") {
        const next = values[wrapIndex(values.length, at, direction === "down" ? 1 : -1)];
        focusNode(nodes.current.get(next) as never);
      }
      return true;
    });
  }, []);
  return (
    <View className={T["command.root"]} ref={root as never} debugName="command">
      <Input placeholder={props.placeholder ?? "Search"} value={query} onChange={setQuery} nodeRef={input as never} />
      <View className={T["command.list"]}>
        {visible.length === 0 ? <Text className={T["command.empty"]}>{props.emptyText ?? "No results."}</Text> : null}
        {visible.map((g) => (
          <View key={g.heading} className={T["command.group"]} debugName="command-group">
            <Text className={T["command.heading"]}>{g.heading}</Text>
            {g.items.map((item) => (
              <Focusable
                key={item.value}
                look={[T["command.item"], T["command.focus"], T["command.press"]].join(" ")}
                nodeRef={(n: NodeMirror | null) => { if (n) nodes.current.set(item.value, n); else nodes.current.delete(item.value); }}
                onPress={() => select.current?.(item.value)}
              >
                <Text className={T["command.item.text"]}>{item.label}</Text>
              </Focusable>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}
