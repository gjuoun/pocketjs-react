// Native Dialog primitive, shaped like Radix's Dialog namespace so the vendored shadcn dialog
// imports it unchanged (the codemod rewrites only the import specifier). Root holds the open
// state; Content is a ModalLayer; the Portal is a pass-through because ModalLayer already
// portals into the overlay layer.

import { createContext, type ReactNode, useContext } from "react";
import { Pressable } from "./press.tsx";
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

/** Pass-through: Content portals itself into the overlay layer (see ModalLayer). */
export function Portal(props: { children?: ReactNode }) {
  return <>{props.children}</>;
}
