// HoverCard: an anchored panel of supplementary content shown while its trigger holds focus (the ruling: focus in, blur
// out; a pointer over the trigger is the trigger's own press, which focuses it). It opens on the frame the trigger gains
// focus and closes on the frame focus leaves, or on an outside press (the panel is a layer, so that press is swallowed).
// The panel never takes focus: it holds no controls, and it is placed beside the trigger by the shared placement
// (side bottom by default). Controlled: open and onOpenChange(open); or defaultOpen. Mounted only while open.
import { createContext, type ReactNode, useContext, useRef } from "react";
import { getFocused } from "@pocketjs/framework/input";
import { Text, View } from "../elements.ts";
import type { NodeMirror } from "../internal/pocket.ts";
import { type Align, type Side } from "../primitives/anchor.ts";
import { PopperPanel, useAnchorBox, within } from "../primitives/anchored.tsx";
import { useOpenTiming } from "../primitives/open-timing.ts";
import { useControllableState } from "../primitives/state.ts";
import { Focusable } from "./focusable.tsx";
import { useTokens } from "./theme.tsx";

interface HoverCardContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  trigger: { current: NodeMirror | null };
  /** An outside press closed the card: it stays closed until focus leaves the trigger (else it would reopen at once). */
  latch: { current: boolean };
}
const Ctx = createContext<HoverCardContextValue | null>(null);

function useHoverCard(part: string): HoverCardContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("pocketjs-react native: " + part + " must be used inside <HoverCard>");
  return ctx;
}

export interface HoverCardProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
}

export function HoverCard(props: HoverCardProps) {
  const [open, setOpen] = useControllableState(props.open, props.defaultOpen ?? false, props.onOpenChange);
  const trigger = useRef<NodeMirror | null>(null);
  const latch = useRef(false);
  // Focus on (or inside) the trigger keeps it open; focus anywhere else closes it on the next frame and releases the latch.
  useOpenTiming({
    enabled: props.open === undefined,
    open,
    setOpen,
    want: () => {
      const onTrigger = trigger.current !== null && within(trigger.current, getFocused() as unknown as NodeMirror | null);
      if (!onTrigger) latch.current = false;
      return onTrigger && !latch.current;
    },
    openFrames: 0,
    closeFrames: 0,
  });
  return <Ctx.Provider value={{ open, setOpen, trigger, latch }}>{props.children}</Ctx.Provider>;
}

/** The trigger: a focusable label. Gaining focus is the open gesture (no press needed). */
export function HoverCardTrigger(props: { children?: string }) {
  const T = useTokens() as Record<string, string>;
  const ctx = useHoverCard("HoverCardTrigger");
  return (
    <Focusable
      look={[T["hover-card.trigger"], T["hover-card.focus"]].join(" ")}
      nodeRef={ctx.trigger}
      debugName="hover-card-trigger"
    >
      <Text className={T["hover-card.text"]}>{props.children}</Text>
    </Focusable>
  );
}

export interface HoverCardContentProps {
  side?: Side;
  align?: Align;
  sideOffset?: number;
  children?: ReactNode;
}

/** The layer: an anchored panel beside the trigger. Mounted only while open. */
function HoverCardLayer(props: Required<Pick<HoverCardContentProps, "side" | "align" | "sideOffset">> & { children?: ReactNode }) {
  const T = useTokens() as Record<string, string>;
  const ctx = useHoverCard("HoverCardContent");
  const anchor = useAnchorBox(true, () => ctx.trigger.current);
  if (!anchor) return null;
  return (
    <PopperPanel
      anchor={anchor}
      side={props.side}
      align={props.align}
      sideOffset={props.sideOffset}
      onDismiss={() => { ctx.latch.current = true; ctx.setOpen(false); }}
    >
      <View className={T["hover-card.panel"]} debugName="hover-card-panel">{props.children}</View>
    </PopperPanel>
  );
}

export function HoverCardContent(props: HoverCardContentProps) {
  const ctx = useHoverCard("HoverCardContent");
  if (!ctx.open) return null;
  return (
    <HoverCardLayer
      side={props.side ?? "bottom"}
      align={props.align ?? "start"}
      sideOffset={props.sideOffset ?? 4}
    >
      {props.children}
    </HoverCardLayer>
  );
}
