// Native DropdownMenu primitive (C5), shaped like Radix's DropdownMenu namespace so the vendored
// shadcn dropdown-menu imports it unchanged. Root holds the open state. Content is a ModalLayer
// and is placed beside its trigger (C6). Item runs onSelect and closes the menu unless the handler
// calls preventDefault(). Sub-menus are not supported (F3=A): they throw when rendered.

import { createContext, type ReactNode, useContext, useRef } from "react";
import { Text, View } from "../elements.ts";
import { cn } from "../style/cn.ts";
import { type Box, measureFocused } from "./anchor.ts";
import { ModalLayer } from "./modal-layer.tsx";
import { Pressable } from "./press.tsx";
import { useControllableState } from "./state.ts";
import { ownItem, ownSurface, ownText } from "./surface.ts";

interface MenuContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  /** The trigger's box, measured as the menu opens (C6). Cleared on close. */
  anchor: { current: Box | null };
}

const MenuContext = createContext<MenuContextValue | null>(null);

function useMenu(part: string): MenuContextValue {
  const ctx = useContext(MenuContext);
  if (!ctx)
    throw new Error(
      `pocketjs-react: ${part} must be used inside <DropdownMenu>`,
    );
  return ctx;
}

/** What Radix hands onSelect: calling preventDefault() keeps the menu open. */
export interface SelectEvent {
  readonly defaultPrevented: boolean;
  preventDefault(): void;
}

function selectEvent(): SelectEvent {
  let prevented = false;
  return {
    get defaultPrevented() {
      return prevented;
    },
    preventDefault() {
      prevented = true;
    },
  };
}

export interface DropdownMenuProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  modal?: boolean;
  children?: ReactNode;
}

export function Root(props: DropdownMenuProps) {
  const [open, setOpen] = useControllableState(
    props.open,
    props.defaultOpen ?? false,
    props.onOpenChange,
  );
  const anchor = useRef<Box | null>(null);
  const setOpenAnchored = (next: boolean) => {
    if (!next) anchor.current = null;
    setOpen(next);
  };
  return (
    <MenuContext.Provider value={{ open, setOpen: setOpenAnchored, anchor }}>
      {props.children}
    </MenuContext.Provider>
  );
}

export interface TriggerProps {
  asChild?: boolean;
  className?: string;
  disabled?: boolean;
  children?: ReactNode;
}

export function Trigger(props: TriggerProps) {
  const ctx = useMenu("DropdownMenu.Trigger");
  return (
    <Pressable
      asChild={props.asChild}
      className={props.className}
      disabled={props.disabled}
      onPress={() => {
        if (!ctx.open) ctx.anchor.current = measureFocused();
        ctx.setOpen(!ctx.open);
      }}
    >
      {props.children}
    </Pressable>
  );
}

/** Pass-through: Content portals itself into the overlay layer (ModalLayer). */
export function Portal(props: { children?: ReactNode }) {
  return <>{props.children}</>;
}

export interface ContentProps {
  className?: string;
  children?: ReactNode;
  /** Positioning (side, align, sideOffset, collisionPadding) places the panel (C6); focus hooks: not implemented (C9). */
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  sideOffset?: number;
  alignOffset?: number;
  avoidCollisions?: boolean;
  collisionPadding?: number;
  loop?: boolean;
  onCloseAutoFocus?: (event: Event) => void;
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
  onPointerDownOutside?: (event: Event) => void;
  onInteractOutside?: (event: Event) => void;
  forceMount?: true;
}

/** The menu panel: focus is trapped and CROSS closes it (ModalLayer). */
export function Content(props: ContentProps) {
  const ctx = useMenu("DropdownMenu.Content");
  return (
    <ModalLayer
      open={ctx.open}
      onClose={() => ctx.setOpen(false)}
      anchoring={{
        anchor: ctx.anchor.current,
        side: props.side,
        align: props.align,
        sideOffset: props.sideOffset,
        collisionPadding: props.collisionPadding,
      }}
      panelClassName={cn(
        "flex-col p-1 rounded-md bg-slate-800 w-[220px]",
        ownSurface(props.className),
      )}
    >
      {props.children}
    </ModalLayer>
  );
}

export function Group(props: { className?: string; children?: ReactNode }) {
  return (
    <View className={cn("flex-col", props.className)}>{props.children}</View>
  );
}

interface ItemStateValue {
  checked: boolean;
}

const ItemStateContext = createContext<ItemStateValue>({ checked: false });

export interface ItemProps {
  className?: string;
  children?: ReactNode;
  disabled?: boolean;
  inset?: boolean;
  textValue?: string;
  asChild?: boolean;
  onSelect?: (event: SelectEvent) => void;
}

/** Every row: a focusable press that runs onSelect, then closes unless prevented. */
function ItemFrame(props: ItemProps & { checked?: boolean }) {
  const ctx = useMenu("DropdownMenu.Item");
  const press = () => {
    const event = selectEvent();
    props.onSelect?.(event);
    if (!event.defaultPrevented) ctx.setOpen(false);
  };
  return (
    <ItemStateContext.Provider value={{ checked: props.checked ?? false }}>
      <Pressable
        asChild={props.asChild}
        className={cn(
          "flex items-center gap-2 px-2 py-1.5 text-sm text-white focus:bg-blue-600",
          ownItem(props.className),
        )}
        disabled={props.disabled}
        onPress={press}
      >
        {props.children}
      </Pressable>
    </ItemStateContext.Provider>
  );
}

export function Item(props: ItemProps) {
  return <ItemFrame {...props} />;
}

export interface CheckboxItemProps extends ItemProps {
  checked?: boolean | "indeterminate";
  onCheckedChange?: (checked: boolean) => void;
}

export function CheckboxItem(props: CheckboxItemProps) {
  const checked = props.checked === true;
  return (
    <ItemFrame
      {...props}
      checked={checked}
      onSelect={(event) => {
        props.onSelect?.(event);
        props.onCheckedChange?.(!checked);
      }}
    />
  );
}

interface RadioGroupValue {
  value?: string;
  onValueChange?: (value: string) => void;
}

const RadioContext = createContext<RadioGroupValue>({});

export interface RadioGroupProps {
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children?: ReactNode;
}

export function RadioGroup(props: RadioGroupProps) {
  return (
    <RadioContext.Provider
      value={{ value: props.value, onValueChange: props.onValueChange }}
    >
      <Group className={props.className}>{props.children}</Group>
    </RadioContext.Provider>
  );
}

export interface RadioItemProps extends ItemProps {
  value: string;
}

export function RadioItem(props: RadioItemProps) {
  if (props.value === "")
    throw new Error(
      "pocketjs-react: a DropdownMenu.RadioItem must have a value",
    );
  const group = useContext(RadioContext);
  return (
    <ItemFrame
      {...props}
      checked={group.value === props.value}
      onSelect={(event) => {
        props.onSelect?.(event);
        group.onValueChange?.(props.value);
      }}
    />
  );
}

/** Renders its children only while the enclosing checkbox or radio item is checked. */
export function ItemIndicator(props: {
  className?: string;
  children?: ReactNode;
}) {
  const { checked } = useContext(ItemStateContext);
  return checked ? props.children : null;
}

export function Label(props: { className?: string; children?: ReactNode }) {
  return (
    <Text
      className={cn("text-sm font-bold text-white", ownText(props.className))}
    >
      {props.children}
    </Text>
  );
}

export function Separator(props: { className?: string }) {
  return (
    <View className={cn("h-[1px] bg-slate-600", ownSurface(props.className))} />
  );
}

/** Sub-menus are not supported yet (C5 F3=A): rendering one says so instead of guessing. */
type Loose = {
  [key: string]: unknown;
  children?: ReactNode;
  className?: string;
};
function unsupportedError(name: string): Error {
  return new Error(
    "pocketjs-react: DropdownMenu." +
      name +
      " (sub-menus) is not supported yet (C5 F3)",
  );
}
export function Sub(_props: Loose): never {
  throw unsupportedError("Sub");
}
export function SubTrigger(_props: Loose): never {
  throw unsupportedError("SubTrigger");
}
export function SubContent(_props: Loose): never {
  throw unsupportedError("SubContent");
}
