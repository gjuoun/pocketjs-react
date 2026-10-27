// NavigationMenu: a bar of items; each item has a trigger and, while it is the open value, a panel below the bar. The open
// value is controlled at the root ("" when none), so only one panel is open at a time. The panel is an anchored layer placed
// under its trigger, so the bar and the page never move when a panel opens. A tap outside the open panel, or CROSS, closes it
// and the tap is swallowed (the layer rule); focus moves into the panel on open and back to the trigger on close. CIRCLE on
// a trigger opens its panel, CIRCLE on a link in it selects and closes. Mounted only while open.
import { createContext, type ReactNode, useContext, useRef } from "react";
import { Text, View } from "../elements.ts";
import type { NodeMirror } from "../internal/pocket.ts";
import { PopperPanel, useAnchorBox } from "../primitives/anchored.tsx";
import { useControllableState } from "../primitives/state.ts";
import { Focusable } from "./focusable.tsx";
import { Separator } from "./separator.tsx";
import { useTokens } from "./theme.tsx";

interface NavRoot {
  value: string;
  setValue: (value: string) => void;
}
interface NavItem {
  value: string;
  trigger: { current: NodeMirror | null };
}
const RootCtx = createContext<NavRoot | null>(null);
const ItemCtx = createContext<NavItem | null>(null);

function useRoot(part: string): NavRoot {
  const ctx = useContext(RootCtx);
  if (!ctx) throw new Error("pocketjs-react native: " + part + " must be used inside <NavigationMenu>");
  return ctx;
}

function useItem(part: string): NavItem {
  const ctx = useContext(ItemCtx);
  if (!ctx) throw new Error("pocketjs-react native: " + part + " must be used inside <NavigationMenuItem>");
  return ctx;
}

export interface NavigationMenuProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children?: ReactNode;
}

export function NavigationMenu(props: NavigationMenuProps) {
  const [value, setValue] = useControllableState(props.value, props.defaultValue ?? "", props.onValueChange);
  return (
    <RootCtx.Provider value={{ value, setValue }}>
      <View className="flex-col" debugName="navigation-menu">{props.children}</View>
    </RootCtx.Provider>
  );
}

/** The bar: a row of items, with a rule under it. */
export function NavigationMenuList(props: { children?: ReactNode }) {
  const T = useTokens() as Record<string, string>;
  return (
    <View className="flex-col">
      <View className={T["nav.bar"]} debugName="navigation-bar">{props.children}</View>
      <Separator />
    </View>
  );
}

export interface NavigationMenuItemProps {
  value: string;
  children?: ReactNode;
}

/** One bar item: its trigger, and its panel while it is the open value. */
export function NavigationMenuItem(props: NavigationMenuItemProps) {
  const trigger = useRef<NodeMirror | null>(null);
  return (
    <ItemCtx.Provider value={{ value: props.value, trigger }}>
      <View className="flex-col" debugName="navigation-item">{props.children}</View>
    </ItemCtx.Provider>
  );
}

export function NavigationMenuTrigger(props: { children?: string }) {
  const T = useTokens() as Record<string, string>;
  const root = useRoot("NavigationMenuTrigger");
  const item = useItem("NavigationMenuTrigger");
  const open = root.value === item.value;
  return (
    <Focusable
      look={[T["nav.trigger"], T["nav.focus"], T["nav.press"], open ? T["nav.open"] : ""].join(" ")}
      nodeRef={item.trigger as never}
      onPress={() => root.setValue(open ? "" : item.value)}
    >
      <Text className={open ? T["nav.trigger.open.text"] : T["nav.trigger.text"]}>{props.children}</Text>
    </Focusable>
  );
}

export interface NavigationMenuContentProps {
  children?: ReactNode;
}

/** The panel of its item: mounted only while the item is the open value. */
export function NavigationMenuContent(props: NavigationMenuContentProps) {
  const root = useRoot("NavigationMenuContent");
  const item = useItem("NavigationMenuContent");
  if (root.value !== item.value) return null;
  return <PanelLayer>{props.children}</PanelLayer>;
}

function PanelLayer(props: { children?: ReactNode }) {
  const T = useTokens() as Record<string, string>;
  const root = useRoot("NavigationMenuContent");
  const item = useItem("NavigationMenuContent");
  const anchor = useAnchorBox(true, () => item.trigger.current);
  if (!anchor) return null; // the trigger is measured on the first frame; the panel mounts then, placed
  return (
    <PopperPanel anchor={anchor} side="bottom" align="start" sideOffset={4} onDismiss={() => root.setValue("")} focusFirst restore={item.trigger}>
      <View className={T["nav.panel"]} debugName="navigation-panel">{props.children}</View>
    </PopperPanel>
  );
}

/** A line of text in a panel that is not a control (a heading for the links under it). */
export function NavigationMenuLabel(props: { children?: string }) {
  const T = useTokens() as Record<string, string>;
  return <Text className={T["nav.label"]}>{props.children}</Text>;
}

export interface NavigationMenuLinkProps {
  value: string;
  onSelect?: (value: string) => void;
  children?: string;
}

/** A link in a panel: CIRCLE reports its value and closes the panel. */
export function NavigationMenuLink(props: NavigationMenuLinkProps) {
  const T = useTokens() as Record<string, string>;
  const root = useRoot("NavigationMenuLink");
  return (
    <Focusable look={[T["nav.link"], T["nav.focus"], T["nav.press"]].join(" ")} onPress={() => { props.onSelect?.(props.value); root.setValue(""); }}>
      <Text className={T["nav.link.text"]}>{props.children}</Text>
    </Focusable>
  );
}
