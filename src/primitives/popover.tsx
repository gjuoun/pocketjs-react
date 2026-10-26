// Native Popover (batch 2), shaped like Radix's Popover namespace so the vendored shadcn popover imports
// it unchanged. Root holds the open state. Trigger toggles. Content is a PopperPanel beside the trigger
// (bottom, centred, 4 px by default), a layer: a tap outside closes it and presses nothing behind (R-1).
// Focus moves to the first focusable inside on open, is not trapped, and returns to the trigger on close.
// Anchor, when mounted, is the box the panel measures instead of the trigger.

import { createContext, type ReactNode, type MutableRefObject, useContext, useRef } from "react";
import { View } from "../elements.ts";
import type { NodeMirror } from "../internal/pocket.ts";
import { cn } from "../style/cn.ts";
import { PopperPanel, useAnchorBox } from "./anchored.tsx";
import { Pressable } from "./press.tsx";
import { useControllableState } from "./state.ts";
import { ownSurface } from "./surface.ts";

interface PopoverContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  trigger: MutableRefObject<NodeMirror | null>;
  anchorNode: MutableRefObject<NodeMirror | null>;
}

const PopoverContext = createContext<PopoverContextValue | null>(null);

function usePopover(part: string): PopoverContextValue {
  const ctx = useContext(PopoverContext);
  if (!ctx) throw new Error(`pocketjs-react: ${part} must be used inside <Popover>`);
  return ctx;
}

export interface RootProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
}

export function Root(props: RootProps) {
  const [open, setOpen] = useControllableState(
    props.open,
    props.defaultOpen ?? false,
    props.onOpenChange,
  );
  const trigger = useRef<NodeMirror | null>(null);
  const anchorNode = useRef<NodeMirror | null>(null);
  return (
    <PopoverContext.Provider value={{ open, setOpen, trigger, anchorNode }}>
      {props.children}
    </PopoverContext.Provider>
  );
}

export interface TriggerProps {
  asChild?: boolean;
  className?: string;
  disabled?: boolean;
  children?: ReactNode;
}

export function Trigger(props: TriggerProps) {
  const ctx = usePopover("Popover.Trigger");
  return (
    <Pressable
      asChild={props.asChild}
      className={props.className}
      disabled={props.disabled}
      nodeRef={ctx.trigger}
      onPress={() => ctx.setOpen(!ctx.open)}
    >
      {props.children}
    </Pressable>
  );
}

/** The element the panel is placed beside when it is not the trigger (Radix's Anchor). */
export function Anchor(props: { className?: string; children?: ReactNode }) {
  const ctx = usePopover("Popover.Anchor");
  return (
    <View ref={ctx.anchorNode as never} className={props.className}>
      {props.children}
    </View>
  );
}

/** Pass-through: Content portals itself into the overlay layer (PopperPanel). */
export function Portal(props: { children?: ReactNode }) {
  return <>{props.children}</>;
}

export interface ContentProps {
  className?: string;
  children?: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  sideOffset?: number;
  alignOffset?: number;
  collisionPadding?: number;
  forceMount?: true;
}

/** The panel beside its anchor. Not trapped: focus may leave it with the d-pad. */
export function Content(props: ContentProps) {
  const ctx = usePopover("Popover.Content");
  const box = useAnchorBox(ctx.open, () => ctx.anchorNode.current ?? ctx.trigger.current);
  if (!ctx.open || box === null) return null;
  return (
    <PopperPanel
      className={cn("flex-col gap-1 p-3 rounded-md bg-slate-800 text-white w-[288px]", ownSurface(props.className))}
      anchor={box}
      side={props.side ?? "bottom"}
      align={props.align ?? "center"}
      sideOffset={props.sideOffset ?? 4}
      alignOffset={props.alignOffset}
      collisionPadding={props.collisionPadding}
      onDismiss={() => ctx.setOpen(false)}
      focusFirst
      restore={ctx.trigger}
    >
      {props.children}
    </PopperPanel>
  );
}
