// ContextMenu: a menu opened by a gesture on a region, not by a press. A long press (~500 ms, registerLongPress) opens it
// at the press point; TRIANGLE on the focused region opens it under the region, centred. The panel is the DropdownMenu's:
// the dropdown tokens, the same UP/DOWN traversal (wrapIndex, wrapping at both ends, LEFT and RIGHT consumed), focus moves
// into it on open and returns to the region on close. CIRCLE on an item reports its value through onSelect(value) and
// closes; CROSS and an outside press close it with no selection. Controlled: open and onOpenChange(open).
import { createContext, type ReactNode, useContext, useLayoutEffect, useRef } from "react";
import { BTN, focusNode, getFocused, pushFocusController, type FocusDirection } from "@pocketjs/framework/input";
import { Text, View } from "../elements.ts";
import { useButton } from "../input/buttons.ts";
import { registerLongPress } from "../input/pointer.ts";
import type { NodeMirror } from "../internal/pocket.ts";
import { type Align, type Box, measureBox, type Side } from "../primitives/anchor.ts";
import { pointBox, PopperPanel } from "../primitives/anchored.tsx";
import { useControllableState } from "../primitives/state.ts";
import { wrapIndex } from "./dropdown-menu.tsx";
import { Focusable } from "./focusable.tsx";
import { useTokens } from "./theme.tsx";

interface MenuItem {
  value: string;
  node: NodeMirror;
}
interface Anchored {
  box: Box;
  align: Align;
}
interface MenuContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  /** Where the panel goes: the press point, or the region's box (TRIANGLE). Read when the panel mounts. */
  anchor: { current: Anchored | null };
  trigger: { current: NodeMirror | null };
  items: { current: MenuItem[] };
  select: (value: string) => void;
}
const Ctx = createContext<MenuContextValue | null>(null);

function useMenu(part: string): MenuContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("pocketjs-react native: " + part + " must be used inside <ContextMenu>");
  return ctx;
}

export interface ContextMenuProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Called with the value of the item CIRCLE or a tap chose; the menu then closes. */
  onSelect?: (value: string) => void;
  children?: ReactNode;
}

export function ContextMenu(props: ContextMenuProps) {
  const [open, setOpen] = useControllableState(props.open, props.defaultOpen ?? false, props.onOpenChange);
  const anchor = useRef<Anchored | null>(null);
  const trigger = useRef<NodeMirror | null>(null);
  const items = useRef<MenuItem[]>([]);
  const latest = useRef({ setOpen, onSelect: props.onSelect });
  latest.current = { setOpen, onSelect: props.onSelect };
  const setOpenAnchored = (next: boolean) => {
    if (!next) anchor.current = null;
    setOpen(next);
  };
  const select = (value: string) => {
    latest.current.onSelect?.(value);
    setOpenAnchored(false);
  };
  return (
    <Ctx.Provider value={{ open, setOpen: setOpenAnchored, anchor, trigger, items, select }}>{props.children}</Ctx.Provider>
  );
}

/** The region: a long press opens the menu at the press point, TRIANGLE under the region; a plain press does nothing. */
export function ContextMenuTrigger(props: { children?: ReactNode }) {
  const T = useTokens() as Record<string, string>;
  const ctx = useMenu("ContextMenuTrigger");
  const node = useRef<NodeMirror | null>(null);
  const latest = useRef(ctx);
  latest.current = ctx;
  useLayoutEffect(() => {
    const target = node.current;
    if (!target) return;
    latest.current.trigger.current = target;
    return registerLongPress(target, (x, y) => {
      latest.current.anchor.current = { box: pointBox(x, y), align: "start" };
      latest.current.setOpen(true);
    });
  }, []);
  useButton(BTN.TRIANGLE, () => {
    const target = node.current;
    if (!target || getFocused() !== (target as unknown as ReturnType<typeof getFocused>)) return;
    const box = measureBox(target);
    if (!box) return;
    latest.current.anchor.current = { box, align: "center" };
    latest.current.setOpen(true);
  });
  return (
    <Focusable
      look={[T["context-menu.trigger"], T["context-menu.focus"]].join(" ")}
      nodeRef={node}
      debugName="context-menu-trigger"
    >
      {props.children}
    </Focusable>
  );
}

export interface ContextMenuContentProps {
  side?: Side;
  children?: ReactNode;
}

/** The layer: the menu beside its anchor. Mounted only while open. */
function ContextMenuLayer(props: { side: Side; children?: ReactNode }) {
  const T = useTokens() as Record<string, string>;
  const ctx = useMenu("ContextMenuContent");
  const anchored = ctx.anchor.current;
  const list = useRef<NodeMirror | null>(null);
  // While open, the list owns UP and DOWN: it moves through the enabled items, wrapping, and never leaves the list.
  useLayoutEffect(() => {
    if (!list.current) return;
    return pushFocusController(list.current as never, (direction: FocusDirection) => {
      if (direction === "left" || direction === "right") return true;
      const nodes = ctx.items.current.map((i) => i.node);
      const at = nodes.indexOf(getFocused() as unknown as NodeMirror);
      const next = nodes[wrapIndex(nodes.length, at, direction === "down" ? 1 : -1)];
      if (next) focusNode(next as never);
      return true;
    });
  }, []);
  if (!anchored) return null;
  return (
    <PopperPanel
      anchor={anchored.box}
      side={props.side}
      align={anchored.align}
      sideOffset={4}
      onDismiss={() => ctx.setOpen(false)}
      focusFirst
      restore={ctx.trigger}
    >
      <View className={T["dropdown.panel"]} debugName="context-menu-panel" ref={list as never}>{props.children}</View>
    </PopperPanel>
  );
}

export function ContextMenuContent(props: ContextMenuContentProps) {
  const ctx = useMenu("ContextMenuContent");
  if (!ctx.open) return null;
  return <ContextMenuLayer side={props.side ?? "bottom"}>{props.children}</ContextMenuLayer>;
}

export interface ContextMenuItemProps {
  value: string;
  disabled?: boolean;
  children?: string;
}

export function ContextMenuItem(props: ContextMenuItemProps) {
  const T = useTokens() as Record<string, string>;
  const ctx = useMenu("ContextMenuItem");
  const node = useRef<NodeMirror | null>(null);
  const disabled = props.disabled === true;
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
      nodeRef={node}
      onPress={() => ctx.select(props.value)}
    >
      <Text className={T[disabled ? "dropdown.item.disabled" : "dropdown.item.text"]}>{props.children}</Text>
    </Focusable>
  );
}

export function ContextMenuLabel(props: { children?: string }) {
  const T = useTokens() as Record<string, string>;
  return <Text className={T["dropdown.label"]}>{props.children}</Text>;
}

export function ContextMenuSeparator() {
  const T = useTokens() as Record<string, string>;
  return <View className={T["separator.horizontal"]} />;
}
