// Native Menubar (batch 2), shaped like Radix's Menubar namespace so the vendored shadcn menubar imports it
// unchanged. Root is a row that holds which menu is open (its value). Each Menu provides the DropdownMenu
// core for its own panel, so Items, groups and sub-menus are the DropdownMenu parts. While a menu is open,
// LEFT and RIGHT on its panel close it and open the neighbouring menu (sorted by box x, wrapping). A press on
// another Trigger while one is open closes it (the press is swallowed as any outside tap is); the web
// hover-switch is parked.

import type { FocusDirection } from "@pocketjs/framework/input";
import {
  createContext,
  type MutableRefObject,
  type ReactNode,
  useContext,
  useLayoutEffect,
  useRef,
} from "react";
import { View } from "../elements.ts";
import type { NodeMirror } from "../internal/pocket.ts";
import { cn } from "../style/cn.ts";
import { type Box, measureBox } from "./anchor.ts";
import { MenuContext, MenuDirectionContext } from "./dropdown-menu.tsx";
import { Pressable } from "./press.tsx";
import { useControllableState } from "./state.ts";

export {
  CheckboxItem,
  Content,
  Group,
  Item,
  ItemIndicator,
  Label,
  Portal,
  RadioGroup,
  RadioItem,
  Separator,
  Sub,
  SubContent,
  SubTrigger,
} from "./dropdown-menu.tsx";

interface Entry {
  value: string;
  node: MutableRefObject<NodeMirror | null>;
  anchor: MutableRefObject<Box | null>;
}

interface BarContextValue {
  value: string;
  setValue: (value: string) => void;
  register: (entry: Entry) => () => void;
  snapshot: () => void;
  switchFrom: (current: string, direction: FocusDirection) => boolean;
}

const BarContext = createContext<BarContextValue | null>(null);
const MenuNodeContext = createContext<MutableRefObject<NodeMirror | null> | null>(null);

export interface RootProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children?: ReactNode;
}

/** The bar: a row of Triggers. Its value is the open menu's value ("" when none is open). */
export function Root(props: RootProps) {
  const [value, setValue] = useControllableState(props.value, props.defaultValue ?? "", props.onValueChange);
  const entries = useRef(new Map<string, Entry>());
  const register = (entry: Entry) => {
    entries.current.set(entry.value, entry);
    return () => {
      if (entries.current.get(entry.value) === entry) entries.current.delete(entry.value);
    };
  };
  // The triggers' boxes, measured while no menu is open: an open panel's shell covers the bar, so a hit
  // test then finds nothing. Taken by every open (Menu.setOpen), before the shell mounts.
  const boxes = useRef(new Map<string, Box>());
  const snapshot = () => {
    boxes.current.clear();
    for (const entry of entries.current.values()) {
      const box = entry.node.current ? measureBox(entry.node.current) : null;
      if (box) boxes.current.set(entry.value, box);
    }
  };
  // The neighbour of the open menu, in screen order (wrapping), opened in place of it.
  const switchFrom = (current: string, direction: FocusDirection): boolean => {
    const list = [...boxes.current.entries()]
      .map(([value, box]) => ({ value, box }))
      .sort((a, b) => a.box.x - b.box.x);
    const index = list.findIndex((item) => item.value === current);
    if (index < 0 || list.length < 2) return false;
    const step = direction === "right" ? 1 : -1;
    const next = list[(index + step + list.length) % list.length];
    const entry = entries.current.get(next.value);
    if (!entry) return false;
    entry.anchor.current = next.box;
    setValue(next.value);
    return true;
  };
  return (
    <BarContext.Provider value={{ value, setValue, register, snapshot, switchFrom }}>
      <View className={cn("flex-row", props.className)}>{props.children}</View>
    </BarContext.Provider>
  );
}

export interface MenuProps {
  value?: string;
  children?: ReactNode;
}

/** One menu of the bar: open while the bar's value is its value. */
export function Menu(props: MenuProps) {
  const bar = useContext(BarContext);
  if (!bar) throw new Error("pocketjs-react: Menubar.Menu must be used inside <Menubar>");
  const value = props.value ?? "";
  const open = value !== "" && bar.value === value;
  const anchor = useRef<Box | null>(null);
  const node = useRef<NodeMirror | null>(null);
  const latest = useRef(bar);
  latest.current = bar;
  useLayoutEffect(
    () => latest.current.register({ value, node, anchor }),
    [value],
  );
  const setOpen = (next: boolean) => {
    if (!next) anchor.current = null;
    else latest.current.snapshot();
    latest.current.setValue(next ? value : "");
  };
  const direction = (d: FocusDirection): boolean =>
    d === "left" || d === "right" ? latest.current.switchFrom(value, d) : false;
  return (
    <MenuContext.Provider value={{ open, setOpen, anchor }}>
      <MenuNodeContext.Provider value={node}>
        <MenuDirectionContext.Provider value={direction}>{props.children}</MenuDirectionContext.Provider>
      </MenuNodeContext.Provider>
    </MenuContext.Provider>
  );
}

export interface TriggerProps {
  asChild?: boolean;
  className?: string;
  disabled?: boolean;
  children?: ReactNode;
}

/** The bar item that opens its menu. The box is measured on press, like DropdownMenu.Trigger. */
export function Trigger(props: TriggerProps) {
  const ctx = useContext(MenuContext);
  const node = useContext(MenuNodeContext);
  if (!ctx || !node) throw new Error("pocketjs-react: Menubar.Trigger must be used inside <Menubar.Menu>");
  return (
    <Pressable
      asChild={props.asChild}
      className={props.className}
      disabled={props.disabled}
      nodeRef={node}
      onPress={() => {
        if (!ctx.open) ctx.anchor.current = node.current ? measureBox(node.current) : null;
        ctx.setOpen(!ctx.open);
      }}
    >
      {props.children}
    </Pressable>
  );
}
