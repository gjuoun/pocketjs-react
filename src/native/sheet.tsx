// Sheet: a panel docked to one edge of the screen, over a scrim. Modal: a focus scope takes focus on open and keeps it
// inside; CROSS and a tap on the scrim close it through the layer stack; focus goes back to the trigger. The panel's size is a
// percentage of the screen along its edge (size, 0..100), resolved by the library (useParentExtent) because the core has no
// percent sizes. Mounted only while open. Controlled: open and onOpenChange(open); or uncontrolled with defaultOpen.
import { createContext, type ReactNode, useContext, useEffect, useRef } from "react";
import { BTN } from "@pocketjs/framework/input";
import { Text, View } from "../elements.ts";
import { FocusScope } from "../focus/FocusScope.tsx";
import { useButton } from "../input/buttons.ts";
import type { NodeMirror } from "../internal/pocket.ts";
import { pushLayer } from "../primitives/layer-stack.ts";
import { useControllableState } from "../primitives/state.ts";
import { reconciler } from "../renderer/host-config.ts";
import { getOverlayLayer } from "../renderer/mount.ts";
import { Button } from "./button.tsx";
import { useParentExtent } from "./percent.ts";
import { useTokens } from "./theme.tsx";

interface SheetContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}
const Ctx = createContext<SheetContextValue | null>(null);

function useSheet(part: string): SheetContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("pocketjs-react native: " + part + " must be used inside <Sheet>");
  return ctx;
}

export type SheetSide = "left" | "right" | "top" | "bottom";

export interface SheetProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
}

export function Sheet(props: SheetProps) {
  const [open, setOpen] = useControllableState(props.open, props.defaultOpen ?? false, props.onOpenChange);
  return <Ctx.Provider value={{ open, setOpen }}>{props.children}</Ctx.Provider>;
}

export function SheetTrigger(props: { children?: string; onPress?: () => void }) {
  const ctx = useSheet("SheetTrigger");
  return <Button onPress={() => { props.onPress?.(); ctx.setOpen(true); }}>{props.children}</Button>;
}

export function SheetClose(props: { children?: string }) {
  const ctx = useSheet("SheetClose");
  return <Button variant="outline" onPress={() => ctx.setOpen(false)}>{props.children}</Button>;
}

export function SheetTitle(props: { children?: string }) {
  const T = useTokens() as Record<string, string>;
  return <Text className={T["sheet.title"]}>{props.children}</Text>;
}

export function SheetDescription(props: { children?: string }) {
  const T = useTokens() as Record<string, string>;
  return <Text className={T["sheet.description"]}>{props.children}</Text>;
}

export function SheetFooter(props: { children?: ReactNode }) {
  const T = useTokens() as Record<string, string>;
  return <View className={T["sheet.footer"]}>{props.children}</View>;
}

export interface SheetContentProps {
  side?: SheetSide;
  /** The panel's extent along its edge, as a percent of the screen (default 75). */
  size?: number;
  children?: ReactNode;
}

/** The layer: a scrim and a docked, focus-scoped panel. Mounted only while the sheet is open. */
function SheetLayer(props: { side: SheetSide; size: number; children?: ReactNode }) {
  const T = useTokens() as Record<string, string>;
  const ctx = useSheet("SheetContent");
  const panel = useRef<NodeMirror | null>(null);
  const close = useRef<() => void>(() => {});
  close.current = () => ctx.setOpen(false);
  const horizontal = props.side === "left" || props.side === "right";
  const px = useParentExtent(panel, horizontal ? "w" : "h", props.size);
  const style = px === null ? { opacity: 0.01 } : horizontal ? { width: px } : { height: px };
  useButton(BTN.CROSS, () => close.current());
  useEffect(() => pushLayer({ panel: () => panel.current, close: () => close.current(), dismissOutside: true }), []);
  return (
    <View className={[T["sheet.shell"], T["sheet.side." + props.side]].join(" ")}>
      <View className={T["sheet.scrim"]} />
      <FocusScope
        className={horizontal ? T["sheet.panel.row"] : T["sheet.panel.col"]}
        nodeRef={panel}
        autoFocus
        style={style}
        debugName="sheet-panel"
      >
        {props.children}
      </FocusScope>
    </View>
  );
}

export function SheetContent(props: SheetContentProps) {
  const ctx = useSheet("SheetContent");
  if (!ctx.open) return null;
  const layer = <SheetLayer side={props.side ?? "right"} size={props.size ?? 75}>{props.children}</SheetLayer>;
  return reconciler.createPortal(layer, getOverlayLayer(), null) as ReactNode;
}
