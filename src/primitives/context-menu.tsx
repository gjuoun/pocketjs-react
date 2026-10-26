// Native ContextMenu (batch 2), shaped like Radix's ContextMenu namespace so the vendored shadcn
// context-menu imports it unchanged. Root provides the DropdownMenu core (MenuContext) with an anchor that
// is a point, not a trigger box: a long press on the Trigger (LONG_PRESS_FRAMES, at the press point) or
// TRIANGLE on a focused Trigger (at its top-left corner) opens it there. Items, groups and sub-menus are
// the DropdownMenu parts, unchanged.

import { BTN, getFocused } from "@pocketjs/framework/input";
import { type MutableRefObject, type ReactNode, useLayoutEffect, useRef, useContext } from "react";
import type { NodeMirror } from "../internal/pocket.ts";
import { type Box, measureBox } from "./anchor.ts";
import { pointBox } from "./anchored.tsx";
import { MenuContext, type MenuContextValue } from "./dropdown-menu.tsx";
import { useButton } from "../input/buttons.ts";
import { registerLongPress } from "../input/pointer.ts";
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

export interface RootProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  modal?: boolean;
  children?: ReactNode;
}

export function Root(props: RootProps) {
  const [open, setOpen] = useControllableState(props.open, props.defaultOpen ?? false, props.onOpenChange);
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
  className?: string;
  disabled?: boolean;
  children?: ReactNode;
}

/**
 * The region that opens the menu on a long press or TRIANGLE. A plain press does nothing (Radix's
 * contextmenu event has no tap equivalent here). Parked: a right-click (no button in the svc lines).
 */
export function Trigger(props: TriggerProps) {
  const ctx = useContext(MenuContext) as MenuContextValue | null;
  if (!ctx) throw new Error("pocketjs-react: ContextMenu.Trigger must be used inside <ContextMenu>");
  const node = useRef<NodeMirror | null>(null);
  const open = (x: number, y: number) => {
    ctx.anchor.current = pointBox(x, y);
    ctx.setOpen(true);
  };
  // The latest context, read by the long-press and TRIANGLE handlers.
  const latest = useRef(ctx);
  latest.current = ctx;
  useLayoutEffect(() => {
    const target = node.current;
    if (props.disabled || !target) return;
    return registerLongPress(target, (x, y) => {
      latest.current.anchor.current = pointBox(x, y);
      latest.current.setOpen(true);
    });
  }, [props.disabled]);
  // TRIANGLE on the focused Trigger opens the menu at the Trigger's top-left corner.
  useButton(BTN.TRIANGLE, () => {
    const target = node.current;
    if (props.disabled || !target || getFocused() !== target) return;
    const box: Box | null = measureBox(target);
    if (box) open(box.x, box.y);
  });
  return (
    <Pressable
      className={props.className}
      disabled={props.disabled}
      nodeRef={node}
      onPress={() => {}}
    >
      {props.children}
    </Pressable>
  );
}
