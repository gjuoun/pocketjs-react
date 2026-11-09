// Drawer: a panel docked to the bottom of the screen, over a scrim. It is the Sheet's machinery pinned to side "bottom"
// with drawer tokens: a rounded surface (the core gives a node one radius, so the top corners are rounded by rounding the
// whole surface), a 32 px handle bar centred at the top, and a default extent of 60 percent of the screen height. CROSS
// and a tap on the scrim close it, and focus goes back to the trigger, exactly as the Sheet does. Mounted only while open.
// Controlled: open and onOpenChange(open); or defaultOpen. The panel carries debugName "drawer-panel".
import { type ReactNode } from "react";
import { View } from "../elements.ts";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetTitle, SheetTrigger } from "./sheet.tsx";
import { useTokens } from "./theme.tsx";

/** The drawer's extent along the bottom, as a percent of the screen height. */
export const DRAWER_SIZE = 60;

export interface DrawerProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
}

export function Drawer(props: DrawerProps) {
  return (
    <Sheet open={props.open} defaultOpen={props.defaultOpen} onOpenChange={props.onOpenChange}>
      {props.children}
    </Sheet>
  );
}

export function DrawerTrigger(props: { children?: string; onPress?: () => void }) {
  return <SheetTrigger onPress={props.onPress}>{props.children}</SheetTrigger>;
}

export function DrawerClose(props: { children?: string }) {
  return <SheetClose>{props.children}</SheetClose>;
}

export function DrawerTitle(props: { children?: string }) {
  return <SheetTitle>{props.children}</SheetTitle>;
}

export function DrawerDescription(props: { children?: string }) {
  return <SheetDescription>{props.children}</SheetDescription>;
}

export function DrawerFooter(props: { children?: ReactNode }) {
  const T = useTokens() as Record<string, string>;
  return <View className={T["drawer.footer"]}>{props.children}</View>;
}

export interface DrawerContentProps {
  /** The panel's extent along the bottom, as a percent of the screen height (default 60). */
  size?: number;
  children?: ReactNode;
}

/** The panel: the handle bar over the content, docked bottom. */
export function DrawerContent(props: DrawerContentProps) {
  const T = useTokens() as Record<string, string>;
  return (
    <SheetContent
      side="bottom"
      size={props.size ?? DRAWER_SIZE}
      panelClass={T["drawer.panel"]}
      panelName="drawer-panel"
    >
      <View className={T["drawer.handle.row"]}>
        <View className={T["drawer.handle"]} debugName="drawer-handle" />
      </View>
      {props.children}
    </SheetContent>
  );
}
