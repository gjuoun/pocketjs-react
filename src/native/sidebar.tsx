// Sidebar: a navigation rail of grouped items with one active item. The rail's width is a percentage of its parent
// (expanded 30 and collapsed 10 by default), resolved by the library (useParentExtent), because the core has no percent sizes.
// The toggle at the top collapses the rail: the group headings and the labels go, and each item shows its icon glyph alone.
// Keyboard: UP and DOWN move through the toggle and then the items in order and wrap at both ends; LEFT and RIGHT stay put.
// CIRCLE on an item makes it the active item (onValueChange(value)); CIRCLE on the toggle flips collapsed.
import { useLayoutEffect, useRef } from "react";
import { focusNode, getFocused, pushFocusController, type FocusDirection } from "@pocketjs/framework/input";
import { Text, View } from "../elements.ts";
import type { NodeMirror } from "../internal/pocket.ts";
import { useControllableState } from "../primitives/state.ts";
import { wrapIndex } from "./dropdown-menu.tsx";
import { Focusable } from "./focusable.tsx";
import { useParentExtent } from "./percent.ts";
import { useTokens } from "./theme.tsx";

export interface SidebarItem {
  value: string;
  label: string;
  /** One glyph, drawn alone when the rail is collapsed. */
  icon: string;
}

export interface SidebarGroup {
  heading: string;
  items: SidebarItem[];
}

export interface SidebarProps {
  groups: SidebarGroup[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  collapsed?: boolean;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  /** The rail's width, as a percent of its parent, when expanded (default 30). */
  expandedWidth?: number;
  /** The rail's width, as a percent of its parent, when collapsed (default 10). */
  collapsedWidth?: number;
}

const TOGGLE = "__toggle";

/** The order a focus step walks: the toggle, then every item in group order. */
export function sidebarOrder(groups: SidebarGroup[]): string[] {
  return [TOGGLE, ...groups.flatMap((g) => g.items.map((i) => i.value))];
}

export function Sidebar(props: SidebarProps) {
  const T = useTokens() as Record<string, string>;
  const [value, select] = useControllableState(props.value, props.defaultValue ?? "", props.onValueChange);
  const [collapsed, setCollapsed] = useControllableState(props.collapsed, props.defaultCollapsed ?? false, props.onCollapsedChange);
  const root = useRef<NodeMirror | null>(null);
  const nodes = useRef(new Map<string, NodeMirror>());
  const order = useRef<string[]>([]);
  order.current = sidebarOrder(props.groups);
  const px = useParentExtent(root, "w", collapsed ? (props.collapsedWidth ?? 10) : (props.expandedWidth ?? 30));
  const style = px === null ? { opacity: 0.01 } : { width: px };

  useLayoutEffect(() => {
    if (!root.current) return;
    return pushFocusController(root.current as never, (direction: FocusDirection) => {
      // LEFT and RIGHT are consumed so they do not carry focus out of the rail.
      if (direction !== "up" && direction !== "down") return true;
      const list = order.current.map((v) => nodes.current.get(v));
      const at = list.indexOf(getFocused() as unknown as NodeMirror);
      if (at < 0) return false;
      const next = list[wrapIndex(list.length, at, direction === "down" ? 1 : -1)];
      if (next) focusNode(next as never);
      return true;
    });
  }, []);

  const register = (key: string) => (n: NodeMirror | null) => {
    if (n) nodes.current.set(key, n);
    else nodes.current.delete(key);
  };

  return (
    <View className={T["sidebar.root"]} ref={root as never} style={style} debugName="sidebar">
      <Focusable look={[T["sidebar.toggle"], T["sidebar.focus"], T["sidebar.press"]].join(" ")} nodeRef={register(TOGGLE)} onPress={() => setCollapsed(!collapsed)}>
        <Text className={T["sidebar.toggle.text"]}>{collapsed ? "Show" : "Hide"}</Text>
      </Focusable>
      {props.groups.map((g) => (
        <View key={g.heading} className={T["sidebar.group"]} debugName="sidebar-group">
          {collapsed ? null : <Text className={T["sidebar.heading"]}>{g.heading}</Text>}
          {g.items.map((item) => {
            const on = item.value === value;
            const look = [
              collapsed ? T["sidebar.item.collapsed"] : T["sidebar.item"],
              on ? T["sidebar.active"] : T["sidebar.idle"],
              T["sidebar.focus"],
              T["sidebar.press"],
            ].join(" ");
            return (
              <Focusable key={item.value} look={look} nodeRef={register(item.value)} onPress={() => select(item.value)}>
                <Text className={T["sidebar.icon"]}>{item.icon}</Text>
                {collapsed ? null : <Text className={T[on ? "sidebar.label.active" : "sidebar.label"]}>{item.label}</Text>}
              </Focusable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
