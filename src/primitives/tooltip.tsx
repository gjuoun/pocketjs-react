// Native Tooltip (batch 2), shaped like Radix's Tooltip namespace so the vendored shadcn tooltip imports it
// unchanged. Opens on focus of the Trigger or (web) a pointer over it, after the Provider's delay (0 by
// default). Closes at once when focus or the pointer leaves. A press on the Trigger closes it and it stays
// closed until focus or the pointer leaves. It is not a layer and takes no focus: presses pass through.
// Parked (Risk R2): the Arrow draws nothing; skipDelay is not implemented.

import { getFocused } from "@pocketjs/framework/input";
import { createContext, type MutableRefObject, type ReactNode, useContext, useLayoutEffect, useRef } from "react";
import { Text } from "../elements.ts";
import type { NodeMirror } from "../internal/pocket.ts";
import { cn } from "../style/cn.ts";
import { hitsWithin } from "./anchor.ts";
import { PopperPanel, useAnchorBox, within } from "./anchored.tsx";
import { framesFromMs, useOpenTiming } from "./open-timing.ts";
import { Pressable } from "./press.tsx";
import { useControllableState } from "./state.ts";
import { ownSurface } from "./surface.ts";
import { onPointerMove } from "../input/pointer.ts";

interface ProviderValue {
  delayFrames: number;
}

const ProviderContext = createContext<ProviderValue>({ delayFrames: 0 });

export interface ProviderProps {
  delayDuration?: number;
  skipDelayDuration?: number;
  children?: ReactNode;
}

/** The open delay for every Tooltip under it, in milliseconds (shadcn passes 0). */
export function Provider(props: ProviderProps) {
  const value = { delayFrames: framesFromMs(props.delayDuration ?? 0) };
  return <ProviderContext.Provider value={value}>{props.children}</ProviderContext.Provider>;
}

interface TooltipContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  trigger: MutableRefObject<NodeMirror | null>;
  /** A press closed the tooltip: it stays closed until focus or the pointer leaves. */
  latch: MutableRefObject<boolean>;
  hovered: MutableRefObject<boolean>;
  delayFrames: number;
}

const TooltipContext = createContext<TooltipContextValue | null>(null);

function useTooltip(part: string): TooltipContextValue {
  const ctx = useContext(TooltipContext);
  if (!ctx) throw new Error(`pocketjs-react: ${part} must be used inside <Tooltip>`);
  return ctx;
}

export interface RootProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  delayDuration?: number;
  children?: ReactNode;
}

export function Root(props: RootProps) {
  const provider = useContext(ProviderContext);
  const [open, setOpen] = useControllableState(props.open, props.defaultOpen ?? false, props.onOpenChange);
  const trigger = useRef<NodeMirror | null>(null);
  const latch = useRef(false);
  const hovered = useRef(false);
  const delayFrames = props.delayDuration !== undefined ? framesFromMs(props.delayDuration) : provider.delayFrames;

  // The pointer over the trigger (web); a leave clears it.
  useLayoutEffect(
    () =>
      onPointerMove((x, y) => {
        const node = trigger.current;
        hovered.current = x !== null && y !== null && node !== null && hitsWithin(node, x, y);
      }),
    [],
  );

  // Focus or pointer on the trigger opens it; leaving closes it (no grace: Risk R2 / skipDelay parked).
  useOpenTiming({
    enabled: props.open === undefined,
    open,
    setOpen,
    want: () => {
      const onTrigger = trigger.current !== null && within(trigger.current, getFocused());
      const base = onTrigger || hovered.current;
      if (!base) latch.current = false;
      return base && !latch.current;
    },
    openFrames: delayFrames,
    closeFrames: 0,
  });

  return (
    <TooltipContext.Provider value={{ open, setOpen, trigger, latch, hovered, delayFrames }}>
      {props.children}
    </TooltipContext.Provider>
  );
}

export interface TriggerProps {
  asChild?: boolean;
  className?: string;
  children?: ReactNode;
}

export function Trigger(props: TriggerProps) {
  const ctx = useTooltip("Tooltip.Trigger");
  return (
    <Pressable
      asChild={props.asChild}
      className={props.className}
      nodeRef={ctx.trigger}
      onPress={() => {
        ctx.latch.current = true;
        ctx.setOpen(false);
      }}
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

/** Text children become labels (a bare string has no colour of its own in the core). */
function labelled(children: ReactNode): ReactNode {
  if (typeof children === "string" || typeof children === "number")
    return <Text className="text-xs text-white">{children}</Text>;
  return children;
}

/** The label, beside its trigger (top, centred, no offset by default). Never takes focus. */
export function Content(props: ContentProps) {
  const ctx = useTooltip("Tooltip.Content");
  const box = useAnchorBox(ctx.open, () => ctx.trigger.current);
  if (!ctx.open || box === null) return null;
  return (
    <PopperPanel
      className={cn("z-50 rounded-md px-3 py-1.5 bg-slate-800 text-white", ownSurface(props.className))}
      anchor={box}
      side={props.side ?? "top"}
      align={props.align ?? "center"}
      sideOffset={props.sideOffset ?? 0}
      alignOffset={props.alignOffset}
      collisionPadding={props.collisionPadding}
    >
      {labelled(props.children)}
    </PopperPanel>
  );
}

/** Radix draws a pointer arrow; the native tooltip does not yet (Risk R2). */
export function Arrow(_props: { className?: string; width?: number; height?: number }) {
  return null;
}
