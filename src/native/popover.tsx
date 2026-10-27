// Popover: an anchored panel opened by a press on its trigger. The panel is placed beside the trigger by the shared placement
// (side bottom by default, 4 px clear of the trigger, so it never covers it), in the overlay layer. It is a layer: a tap outside
// it closes it and is swallowed (the app behind does not see the tap), and CROSS closes it. Focus moves into the content when it
// opens and goes back to the trigger when it closes. Mounted only while open. Controlled: open and onOpenChange(open).
import { createContext, type ReactNode, useContext, useRef } from "react";
import { View } from "../elements.ts";
import type { NodeMirror } from "../internal/pocket.ts";
import { type Align, type Side } from "../primitives/anchor.ts";
import { PopperPanel, useAnchorBox } from "../primitives/anchored.tsx";
import { useControllableState } from "../primitives/state.ts";
import { Button } from "./button.tsx";
import { useTokens } from "./theme.tsx";

interface PopoverContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  trigger: { current: NodeMirror | null };
}
const Ctx = createContext<PopoverContextValue | null>(null);

function usePopover(part: string): PopoverContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("pocketjs-react native: " + part + " must be used inside <Popover>");
  return ctx;
}

export interface PopoverProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
}

export function Popover(props: PopoverProps) {
  const [open, setOpen] = useControllableState(props.open, props.defaultOpen ?? false, props.onOpenChange);
  const trigger = useRef<NodeMirror | null>(null);
  return <Ctx.Provider value={{ open, setOpen, trigger }}>{props.children}</Ctx.Provider>;
}

export function PopoverTrigger(props: { children?: string; onPress?: () => void }) {
  const ctx = usePopover("PopoverTrigger");
  return (
    <Button nodeRef={ctx.trigger as never} onPress={() => { props.onPress?.(); ctx.setOpen(true); }}>
      {props.children}
    </Button>
  );
}

export interface PopoverContentProps {
  side?: Side;
  align?: Align;
  /** Gap in px between the trigger and the panel (default 4). */
  sideOffset?: number;
  /** A 264 px panel instead of 220 px, for content that is wider than the default (a Combobox's Command). */
  wide?: boolean;
  children?: ReactNode;
}

/** The layer: the panel placed beside the trigger. Mounted only while the popover is open. */
function PopoverLayer(props: Required<Pick<PopoverContentProps, "side" | "align" | "sideOffset">> & { wide: boolean; children?: ReactNode }) {
  const T = useTokens() as Record<string, string>;
  const ctx = usePopover("PopoverContent");
  const trigger = useAnchorBox(true, () => ctx.trigger.current);
  if (!trigger) return null; // the trigger is measured on the first frame; the panel mounts then, placed
  return (
    <PopperPanel
      anchor={trigger}
      side={props.side}
      align={props.align}
      sideOffset={props.sideOffset}
      onDismiss={() => ctx.setOpen(false)}
      focusFirst
      restore={ctx.trigger}
    >
      <View className={T[props.wide ? "popover.panel.wide" : "popover.panel"]} debugName="popover-panel">{props.children}</View>
    </PopperPanel>
  );
}

export function PopoverContent(props: PopoverContentProps) {
  const ctx = usePopover("PopoverContent");
  if (!ctx.open) return null;
  return (
    <PopoverLayer side={props.side ?? "bottom"} align={props.align ?? "center"} sideOffset={props.sideOffset ?? 4} wide={props.wide === true}>
      {props.children}
    </PopoverLayer>
  );
}
