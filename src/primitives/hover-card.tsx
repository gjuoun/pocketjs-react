// Native HoverCard (batch 2), shaped like Radix's HoverCard namespace so the vendored shadcn hover-card
// imports it unchanged. Opens when focus is on the Trigger or inside the Content, or (web) a pointer is over
// either, after openDelay (700 ms = 42 frames). Closes after closeDelay (300 ms = 18 frames) once none of
// those hold. The Content is a layer: a tap outside closes it and presses nothing behind (R-1); the close
// latches until focus or the pointer leaves, so a tap elsewhere is not undone by focus still on the Trigger.
// The Content is focusable and is not trapped.

import { getFocused } from "@pocketjs/framework/input";
import { createContext, type MutableRefObject, type ReactNode, useContext, useLayoutEffect, useRef } from "react";
import type { NodeMirror } from "../internal/pocket.ts";
import { cn } from "../style/cn.ts";
import { onPointerMove } from "../input/pointer.ts";
import { hitsWithin } from "./anchor.ts";
import { PopperPanel, useAnchorBox, within } from "./anchored.tsx";
import { framesFromMs, useOpenTiming } from "./open-timing.ts";
import { Pressable } from "./press.tsx";
import { useControllableState } from "./state.ts";
import { ownSurface } from "./surface.ts";

interface HoverCardContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  dismiss: () => void;
  trigger: MutableRefObject<NodeMirror | null>;
  content: MutableRefObject<NodeMirror | null>;
}

const HoverCardContext = createContext<HoverCardContextValue | null>(null);

function useHoverCard(part: string): HoverCardContextValue {
  const ctx = useContext(HoverCardContext);
  if (!ctx) throw new Error(`pocketjs-react: ${part} must be used inside <HoverCard>`);
  return ctx;
}

/** Radix defaults: 700 ms to open, 300 ms to close. */
const OPEN_MS = 700;
const CLOSE_MS = 300;

export interface RootProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  openDelay?: number;
  closeDelay?: number;
  children?: ReactNode;
}

export function Root(props: RootProps) {
  const [open, setOpen] = useControllableState(props.open, props.defaultOpen ?? false, props.onOpenChange);
  const trigger = useRef<NodeMirror | null>(null);
  const content = useRef<NodeMirror | null>(null);
  const hovered = useRef(false);
  const latch = useRef(false);
  // A dismissal (a tap outside, CROSS) latches the close until focus or the pointer leaves.
  const dismiss = () => {
    latch.current = true;
    setOpen(false);
  };

  useLayoutEffect(
    () =>
      onPointerMove((x, y) => {
        const on = x !== null && y !== null;
        hovered.current =
          on &&
          ((trigger.current !== null && hitsWithin(trigger.current, x, y)) ||
            (content.current !== null && hitsWithin(content.current, x, y)));
      }),
    [],
  );

  useOpenTiming({
    enabled: props.open === undefined,
    open,
    setOpen,
    want: () => {
      const focus = getFocused();
      const base =
        (trigger.current !== null && within(trigger.current, focus)) ||
        (content.current !== null && within(content.current, focus)) ||
        hovered.current;
      if (!base) latch.current = false;
      return base && !latch.current;
    },
    openFrames: framesFromMs(props.openDelay ?? OPEN_MS),
    closeFrames: framesFromMs(props.closeDelay ?? CLOSE_MS),
  });

  return (
    <HoverCardContext.Provider value={{ open, setOpen, dismiss, trigger, content }}>
      {props.children}
    </HoverCardContext.Provider>
  );
}

export interface TriggerProps {
  asChild?: boolean;
  className?: string;
  children?: ReactNode;
}

export function Trigger(props: TriggerProps) {
  const ctx = useHoverCard("HoverCard.Trigger");
  return (
    <Pressable
      asChild={props.asChild}
      className={props.className}
      nodeRef={ctx.trigger}
      onPress={() => {}}
    >
      {props.children}
    </Pressable>
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

/** The card beside its trigger (bottom, centred, 4 px). A layer (R-1); focusable but not trapped. */
export function Content(props: ContentProps) {
  const ctx = useHoverCard("HoverCard.Content");
  const box = useAnchorBox(ctx.open, () => ctx.trigger.current);
  if (!ctx.open || box === null) return null;
  return (
    <PopperPanel
      className={cn("flex-col gap-1 p-3 rounded-md bg-slate-800 text-white w-[256px]", ownSurface(props.className))}
      anchor={box}
      side={props.side ?? "bottom"}
      align={props.align ?? "center"}
      sideOffset={props.sideOffset ?? 4}
      alignOffset={props.alignOffset}
      collisionPadding={props.collisionPadding}
      onDismiss={ctx.dismiss}
      panelRef={ctx.content}
    >
      {props.children}
    </PopperPanel>
  );
}
