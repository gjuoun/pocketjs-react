// Tooltip: a short line beside a focusable trigger. It opens once the trigger has focus for delayMs (frame-counted: 300 ms is
// 18 frames at 60 Hz, on the frame pump) and closes at once when focus moves elsewhere. It is not a layer and takes no focus:
// its panel is not focusable and no pointer dismissal is registered, so a tap goes on to whatever is under it. Placed beside
// the trigger by the shared placement (side top by default). Mounted only while open.
// Open needs the trigger to be laid out, not only focused: a page that is hidden (display: none) keeps its focused trigger
// (the core moves focus only when a node is removed), so focus alone would leave the panel drawn over the next page.
import { createContext, type ReactNode, useContext, useRef, useState } from "react";
import { getFocused } from "@pocketjs/framework/input";
import { Text, View } from "../elements.ts";
import type { NodeMirror } from "../internal/pocket.ts";
import { measureBox, type Side } from "../primitives/anchor.ts";
import { PopperPanel, useAnchorBox } from "../primitives/anchored.tsx";
import { framesFromMs, useOpenTiming } from "../primitives/open-timing.ts";
import { Button } from "./button.tsx";
import { useTokens } from "./theme.tsx";

interface TooltipContextValue {
  open: boolean;
  trigger: { current: NodeMirror | null };
}
const Ctx = createContext<TooltipContextValue | null>(null);

export interface TooltipProps {
  /** Milliseconds the trigger must hold focus before the tooltip opens (default 300). */
  delayMs?: number;
  children?: ReactNode;
}

/** The trigger has focus and a box: a hidden or off-screen trigger (no box) cannot hold an open tooltip. */
function isShowing(node: NodeMirror | null): boolean {
  if (node === null || getFocused() !== (node as unknown as ReturnType<typeof getFocused>)) return false;
  return measureBox(node) !== null;
}

export function Tooltip(props: TooltipProps) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<NodeMirror | null>(null);
  useOpenTiming({
    enabled: true,
    open,
    setOpen,
    want: () => isShowing(trigger.current),
    openFrames: framesFromMs(props.delayMs ?? 300),
    closeFrames: 0,
  });
  return <Ctx.Provider value={{ open, trigger }}>{props.children}</Ctx.Provider>;
}

export function TooltipTrigger(props: { children?: string }) {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("pocketjs-react native: TooltipTrigger must be used inside <Tooltip>");
  return <Button nodeRef={ctx.trigger as never}>{props.children}</Button>;
}

export interface TooltipContentProps {
  side?: Side;
  sideOffset?: number;
  children?: string;
}

function TooltipLayer(props: { side: Side; sideOffset: number; children?: string }) {
  const T = useTokens() as Record<string, string>;
  const ctx = useContext(Ctx)!;
  const anchor = useAnchorBox(true, () => ctx.trigger.current);
  if (!anchor) return null;
  return (
    <PopperPanel anchor={anchor} side={props.side} sideOffset={props.sideOffset}>
      <View className={T["tooltip.panel"]} debugName="tooltip-panel">
        <Text className={T["tooltip.text"]}>{props.children}</Text>
      </View>
    </PopperPanel>
  );
}

export function TooltipContent(props: TooltipContentProps) {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("pocketjs-react native: TooltipContent must be used inside <Tooltip>");
  if (!ctx.open) return null;
  return <TooltipLayer side={props.side ?? "top"} sideOffset={props.sideOffset ?? 4}>{props.children}</TooltipLayer>;
}
