// Menubar: a horizontal row of menu triggers over one panel at a time. A press on a trigger opens its menu under that
// trigger (PopperPanel, side bottom, align start); a second press closes it. While a panel is open the panel owns the
// keyboard: LEFT and RIGHT swap to the neighbouring entry's panel (wrapping, exactly one panel is ever mounted), UP and
// DOWN walk the enabled items (wrapping), CIRCLE reports the item's value through onSelect(value) and closes, and CROSS
// closes and gives focus back to the trigger that opened it. With no panel open, LEFT and RIGHT walk the bar's triggers
// (roving focus). Controlled: value (an entry value, or null for nothing open) and onOpenChange.
import { createContext, type ReactNode, useContext, useLayoutEffect, useRef } from "react";
import { BTN, focusNode, getFocused, pushFocusController, type FocusDirection } from "@pocketjs/framework/input";
import { Text, View } from "../elements.ts";
import { useButton } from "../input/buttons.ts";
import type { NodeMirror } from "../internal/pocket.ts";
import { PopperPanel, useAnchorBox } from "../primitives/anchored.tsx";
import { useRovingGroup, useRovingItem } from "../primitives/roving.ts";
import { useControllableState } from "../primitives/state.ts";
import { wrapIndex } from "./dropdown-menu.tsx";
import { Focusable } from "./focusable.tsx";
import { useTokens } from "./theme.tsx";

export interface MenubarEntry {
  value: string;
  node: NodeMirror;
}
interface MenubarContextValue {
  /** The entry whose panel is open, or null. */
  open: string | null;
  setOpen: (value: string | null) => void;
  entries: { current: MenubarEntry[] };
  select: (value: string) => void;
}
const Ctx = createContext<MenubarContextValue | null>(null);

function useMenubar(part: string): MenubarContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("pocketjs-react native: " + part + " must be used inside <Menubar>");
  return ctx;
}

/** The entry step places from value, wrapping: the panel a LEFT or RIGHT press swaps to. */
export function neighbourEntry(entries: MenubarEntry[], value: string | null, step: 1 | -1): MenubarEntry | null {
  if (entries.length === 0) return null;
  const i = entries.findIndex((e) => e.value === value);
  if (i < 0) return entries[0];
  return entries[(i + step + entries.length) % entries.length];
}

export interface MenubarProps {
  /** The open entry's value, or null (nothing open). */
  value?: string | null;
  defaultValue?: string | null;
  onOpenChange?: (value: string | null) => void;
  /** Called with the value of the item CIRCLE or a tap chose; the bar then closes its panel. */
  onSelect?: (value: string) => void;
  children?: ReactNode;
}

export function Menubar(props: MenubarProps) {
  const T = useTokens() as Record<string, string>;
  const [open, setOpen] = useControllableState<string | null>(props.value, props.defaultValue ?? null, props.onOpenChange);
  const entries = useRef<MenubarEntry[]>([]);
  const bar = useRef<NodeMirror | null>(null);
  useRovingGroup(bar, { orientation: "horizontal", loop: true, activate: false });
  const latest = useRef({ setOpen, onSelect: props.onSelect });
  latest.current = { setOpen, onSelect: props.onSelect };
  const select = (value: string) => {
    latest.current.onSelect?.(value);
    latest.current.setOpen(null);
  };
  return (
    <Ctx.Provider value={{ open, setOpen, entries, select }}>
      <View ref={bar} className={T["menubar.bar"]} debugName="menubar">{props.children}</View>
    </Ctx.Provider>
  );
}

/** One menu of the bar: names its panel and groups its trigger and content. */
const MenuCtx = createContext<string | null>(null);

export function MenubarMenu(props: { value: string; children?: ReactNode }) {
  return <MenuCtx.Provider value={props.value}>{props.children}</MenuCtx.Provider>;
}

function useMenuValue(part: string): string {
  const value = useContext(MenuCtx);
  if (value === null) throw new Error("pocketjs-react native: " + part + " must be used inside <MenubarMenu>");
  return value;
}

export function MenubarTrigger(props: { children?: string }) {
  const T = useTokens() as Record<string, string>;
  const ctx = useMenubar("MenubarTrigger");
  const value = useMenuValue("MenubarTrigger");
  const node = useRef<NodeMirror | null>(null);
  useRovingItem(node, {});
  useLayoutEffect(() => {
    if (!node.current) return;
    const entry: MenubarEntry = { value, node: node.current };
    ctx.entries.current.push(entry);
    return () => { ctx.entries.current = ctx.entries.current.filter((e) => e !== entry); };
  }, [value]);
  const open = ctx.open === value;
  const look = [T["menubar.trigger"], T["menubar.focus"], open ? T["menubar.open"] : ""].join(" ");
  return (
    <Focusable
      look={look}
      nodeRef={node}
      debugName={"menubar-trigger:" + value}
      onPress={() => ctx.setOpen(open ? null : value)}
    >
      <Text className={T[open ? "menubar.open.text" : "menubar.text"]}>{props.children}</Text>
    </Focusable>
  );
}

interface Item {
  value: string;
  node: NodeMirror;
}

const ItemScope = createContext<{ items: { current: Item[] } } | null>(null);

/** The layer: the open menu's panel under its trigger, with the dropdown's item traversal. */
function MenubarLayer(props: { value: string; children?: ReactNode }) {
  const T = useTokens() as Record<string, string>;
  const ctx = useMenubar("MenubarContent");
  const node = useRef<NodeMirror | null>(null);
  const items = useRef<Item[]>([]);
  const anchor = useAnchorBox(true, () => ctx.entries.current.find((e) => e.value === props.value)?.node ?? null);
  const latest = useRef(ctx);
  latest.current = ctx;
  // LEFT and RIGHT swap the panel along the bar (the neighbours wrap); UP and DOWN walk the enabled items.
  useButton(BTN.LEFT, () => {
    const next = neighbourEntry(latest.current.entries.current, props.value, -1);
    if (next) latest.current.setOpen(next.value);
  });
  useButton(BTN.RIGHT, () => {
    const next = neighbourEntry(latest.current.entries.current, props.value, 1);
    if (next) latest.current.setOpen(next.value);
  });
  // The panel renders only once its anchor is measured; the controller is registered in that same commit.
  useLayoutEffect(() => {
    const panel = node.current;
    if (!panel) return;
    const list = items;
    return pushFocusController(panel as never, (direction: FocusDirection) => {
      if (direction === "left" || direction === "right") return true;
      const nodes = list.current.map((i) => i.node);
      const at = nodes.indexOf(getFocused() as unknown as NodeMirror);
      const next = nodes[wrapIndex(nodes.length, at, direction === "down" ? 1 : -1)];
      if (next) focusNode(next as never);
      return true;
    });
  }, [anchor]);
  if (!anchor) return null;
  const restore = { current: ctx.entries.current.find((e) => e.value === props.value)?.node ?? null };
  return (
    <PopperPanel anchor={anchor} side="bottom" align="start" sideOffset={4} onDismiss={() => ctx.setOpen(null)} focusFirst restore={restore}>
      <View className={T["dropdown.panel"]} debugName="menubar-panel" ref={node as never}>
        <ItemScope.Provider value={{ items }}>{props.children}</ItemScope.Provider>
      </View>
    </PopperPanel>
  );
}

export function MenubarContent(props: { children?: ReactNode }) {
  const ctx = useMenubar("MenubarContent");
  const value = useMenuValue("MenubarContent");
  if (ctx.open !== value) return null;
  return <MenubarLayer value={value}>{props.children}</MenubarLayer>;
}

export function MenubarItem(props: { value: string; disabled?: boolean; children?: string }) {
  const T = useTokens() as Record<string, string>;
  const ctx = useMenubar("MenubarItem");
  const scope = useContext(ItemScope);
  if (!scope) throw new Error("pocketjs-react native: MenubarItem must be used inside <MenubarContent>");
  const node = useRef<NodeMirror | null>(null);
  const disabled = props.disabled === true;
  useLayoutEffect(() => {
    if (disabled || !node.current) return;
    const entry: Item = { value: props.value, node: node.current };
    scope.items.current.push(entry);
    return () => { scope.items.current = scope.items.current.filter((i) => i !== entry); };
  }, [disabled, props.value]);
  return (
    <Focusable
      look={[T["dropdown.item"], T["dropdown.focus"]].join(" ")}
      disabled={disabled}
      nodeRef={node}
      onPress={() => ctx.select(props.value)}
    >
      <Text className={T[disabled ? "dropdown.item.disabled" : "dropdown.item.text"]}>{props.children}</Text>
    </Focusable>
  );
}

export function MenubarSeparator() {
  const T = useTokens() as Record<string, string>;
  return <View className={T["separator.horizontal"]} />;
}
