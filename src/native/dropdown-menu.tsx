// DropdownMenu: a list of items opened by a press on its trigger, in an anchored panel placed below the trigger (as Popover).
// While open, the list owns UP and DOWN: they move through the enabled items and wrap at both ends, and focus never leaves
// the list (LEFT and RIGHT do nothing). CIRCLE on an item reports its value through onSelect(value), closes the menu and returns focus to the trigger.
// CROSS and a tap outside close it with no selection. Disabled items are skipped by the traversal. The items are read in
// the order they mount (a static menu's order). Controlled: open and onOpenChange(open).
import { createContext, type ReactNode, useContext, useLayoutEffect, useRef } from "react";
import { focusNode, getFocused, pushFocusController, type FocusDirection } from "@pocketjs/framework/input";
import { Text, View } from "../elements.ts";
import type { NodeMirror } from "../internal/pocket.ts";
import { type Align, type Side } from "../primitives/anchor.ts";
import { PopperPanel, useAnchorBox } from "../primitives/anchored.tsx";
import { useControllableState } from "../primitives/state.ts";
import { Button } from "./button.tsx";
import { Focusable } from "./focusable.tsx";
import { useTokens } from "./theme.tsx";

interface MenuItem {
  value: string;
  node: NodeMirror;
}
interface MenuContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  trigger: { current: NodeMirror | null };
  items: { current: MenuItem[] };
  select: (value: string) => void;
}
const Ctx = createContext<MenuContextValue | null>(null);

function useMenu(part: string): MenuContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("pocketjs-react native: " + part + " must be used inside <DropdownMenu>");
  return ctx;
}

/** The item a step lands on from `at` (-1: focus is not on an item, so the first). Wraps at both ends. */
export function wrapIndex(count: number, at: number, step: 1 | -1): number {
  if (count === 0) return -1;
  if (at < 0) return 0;
  return (at + step + count) % count;
}

export interface DropdownMenuProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Called with the value of the item CIRCLE or a tap chose; the menu then closes. */
  onSelect?: (value: string) => void;
  children?: ReactNode;
}

export function DropdownMenu(props: DropdownMenuProps) {
  const [open, setOpen] = useControllableState(props.open, props.defaultOpen ?? false, props.onOpenChange);
  const trigger = useRef<NodeMirror | null>(null);
  const items = useRef<MenuItem[]>([]);
  const onSelect = useRef(props.onSelect);
  onSelect.current = props.onSelect;
  const select = (value: string) => {
    onSelect.current?.(value);
    setOpen(false);
  };
  return (
    <Ctx.Provider value={{ open, setOpen, trigger, items, select }}>{props.children}</Ctx.Provider>
  );
}

export function DropdownMenuTrigger(props: { children?: string }) {
  const ctx = useMenu("DropdownMenuTrigger");
  return <Button nodeRef={ctx.trigger as never} onPress={() => ctx.setOpen(true)}>{props.children}</Button>;
}

export interface DropdownMenuContentProps {
  side?: Side;
  align?: Align;
  sideOffset?: number;
  children?: ReactNode;
}

/** The layer: the list in an anchored panel. Mounted only while open. */
function MenuLayer(props: Required<Pick<DropdownMenuContentProps, "side" | "align" | "sideOffset">> & { children?: ReactNode }) {
  const T = useTokens() as Record<string, string>;
  const ctx = useMenu("DropdownMenuContent");
  const anchor = useAnchorBox(true, () => ctx.trigger.current);
  const list = useRef<NodeMirror | null>(null);
  // While open, the list owns UP and DOWN: it moves through the enabled items, wrapping, and never leaves the list.
  useLayoutEffect(() => {
    if (!list.current) return;
    return pushFocusController(list.current as never, (direction: FocusDirection) => {
      // A vertical list: LEFT and RIGHT are consumed here, so they do not carry focus out of the menu.
      if (direction === "left" || direction === "right") return true;
      const nodes = ctx.items.current.map((i) => i.node);
      const at = nodes.indexOf(getFocused() as unknown as NodeMirror);
      const next = nodes[wrapIndex(nodes.length, at, direction === "down" ? 1 : -1)];
      if (next) focusNode(next as never);
      return true;
    });
  }, [anchor]);
  if (!anchor) return null;
  return (
    <PopperPanel
      anchor={anchor}
      side={props.side}
      align={props.align}
      sideOffset={props.sideOffset}
      onDismiss={() => ctx.setOpen(false)}
      focusFirst
      restore={ctx.trigger}
    >
      <View className={T["dropdown.panel"]} debugName="dropdown-panel" ref={list as never}>{props.children}</View>
    </PopperPanel>
  );
}

export function DropdownMenuContent(props: DropdownMenuContentProps) {
  const ctx = useMenu("DropdownMenuContent");
  if (!ctx.open) return null;
  return (
    <MenuLayer side={props.side ?? "bottom"} align={props.align ?? "start"} sideOffset={props.sideOffset ?? 4}>
      {props.children}
    </MenuLayer>
  );
}

export interface DropdownMenuItemProps {
  value: string;
  disabled?: boolean;
  children?: string;
}

export function DropdownMenuItem(props: DropdownMenuItemProps) {
  const T = useTokens() as Record<string, string>;
  const ctx = useMenu("DropdownMenuItem");
  const node = useRef<NodeMirror | null>(null);
  const disabled = props.disabled === true;
  // An enabled item joins the traversal on mount and leaves it on unmount; disabled items are not focusable and are not listed.
  useLayoutEffect(() => {
    if (disabled || !node.current) return;
    const entry: MenuItem = { value: props.value, node: node.current };
    ctx.items.current.push(entry);
    return () => { ctx.items.current = ctx.items.current.filter((i) => i !== entry); };
  }, [disabled, props.value]);
  return (
    <Focusable
      look={[T["dropdown.item"], T["dropdown.focus"]].join(" ")}
      disabled={disabled}
      nodeRef={(n: NodeMirror | null) => { node.current = n; }}
      onPress={() => ctx.select(props.value)}
    >
      <Text className={T[disabled ? "dropdown.item.disabled" : "dropdown.item.text"]}>{props.children}</Text>
    </Focusable>
  );
}

export function DropdownMenuLabel(props: { children?: string }) {
  const T = useTokens() as Record<string, string>;
  return <Text className={T["dropdown.label"]}>{props.children}</Text>;
}

export function DropdownMenuSeparator() {
  const T = useTokens() as Record<string, string>;
  return <View className={T["separator.horizontal"]} />;
}
