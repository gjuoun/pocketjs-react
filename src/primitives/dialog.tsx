// Native Dialog primitive, shaped like Radix's Dialog namespace so the vendored shadcn dialog
// imports it unchanged (the codemod rewrites only the import specifier). Root holds the open
// state; Content is a ModalLayer; Overlay is a full-screen scrim that closes on tap (F5); the
// Portal is a pass-through because the layers already portal into the overlay layer.

import { createContext, type ReactNode, useContext } from "react";
import { Text, View } from "../elements.ts";
import { reconciler } from "../renderer/host-config.ts";
import { getOverlayLayer } from "../renderer/mount.ts";
import { cn } from "../style/cn.ts";
import { ModalLayer } from "./modal-layer.tsx";
import { Pressable } from "./press.tsx";
import { ownSurface } from "./surface.ts";
import { useControllableState } from "./state.ts";

interface DialogContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DialogContext = createContext<DialogContextValue | null>(null);

export function useDialogContext(part: string): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("pocketjs-react: " + part + " must be used inside <Dialog>");
  return ctx;
}

export interface DialogProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
}

export function Root(props: DialogProps) {
  const [open, setOpen] = useControllableState(
    props.open,
    props.defaultOpen ?? false,
    props.onOpenChange,
  );
  return (
    <DialogContext.Provider value={{ open, setOpen }}>
      {props.children}
    </DialogContext.Provider>
  );
}

export interface TriggerProps {
  asChild?: boolean;
  className?: string;
  children?: ReactNode;
}

export function Trigger(props: TriggerProps) {
  const ctx = useDialogContext("Dialog.Trigger");
  return (
    <Pressable
      asChild={props.asChild}
      className={props.className}
      onPress={() => ctx.setOpen(!ctx.open)}
    >
      {props.children}
    </Pressable>
  );
}

export function Close(props: TriggerProps) {
  const ctx = useDialogContext("Dialog.Close");
  return (
    <Pressable
      asChild={props.asChild}
      className={props.className}
      onPress={() => ctx.setOpen(false)}
    >
      {props.children}
    </Pressable>
  );
}

/** Pass-through: Overlay and Content portal themselves into the overlay layer. */
export function Portal(props: { children?: ReactNode }) {
  return <>{props.children}</>;
}

export interface OverlayProps {
  className?: string;
}

/** Full-screen scrim above the app, below the panel. Tapping it closes the dialog (F5). */
export function Overlay(_props: OverlayProps) {
  const ctx = useDialogContext("Dialog.Overlay");
  if (!ctx.open) return null;
  return reconciler.createPortal(
    <View
      className="absolute inset-0 bg-slate-950"
      onPress={() => ctx.setOpen(false)}
    />,
    getOverlayLayer(),
    null,
  ) as ReactNode;
}

export interface ContentProps {
  className?: string;
  children?: ReactNode;
  /** Radix positioning and focus hooks: accepted for the vendored types, not implemented (C6, C9). */
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  sideOffset?: number;
  onOpenAutoFocus?: (event: Event) => void;
  onCloseAutoFocus?: (event: Event) => void;
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
  onPointerDownOutside?: (event: Event) => void;
  onInteractOutside?: (event: Event) => void;
  forceMount?: true;
}

/** The centered panel; it traps focus and closes on CROSS (ModalLayer). */
export function Content(props: ContentProps) {
  const ctx = useDialogContext("Dialog.Content");
  return (
    <ModalLayer
      open={ctx.open}
      onClose={() => ctx.setOpen(false)}
      panelClassName={cn("flex-col gap-2 p-3 rounded-xl bg-slate-800 w-[300px]", ownSurface(props.className))}
    >
      {props.children}
    </ModalLayer>
  );
}

export function Title(props: { className?: string; children?: ReactNode }) {
  return (
    <Text className={cn("text-base text-white", props.className)}>{props.children}</Text>
  );
}

export function Description(props: { className?: string; children?: ReactNode }) {
  return (
    <Text className={cn("text-sm text-slate-300", props.className)}>{props.children}</Text>
  );
}
