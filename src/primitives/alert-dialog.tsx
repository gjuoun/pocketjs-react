// Native AlertDialog (batch 2), shaped like Radix's AlertDialog namespace so the vendored shadcn
// alert-dialog imports it unchanged. It is the Dialog core with two differences: an outside tap is
// swallowed and never closes it (dismissOutside false), and Action and Cancel are the close buttons.
// CROSS closes it (the back button). Cancel has focus on open: it is the first focusable in the footer.

import type { ReactNode } from "react";
import { Text } from "../elements.ts";
import { cn } from "../style/cn.ts";
import { ModalContent, useDialogContext } from "./dialog.tsx";
import { Pressable } from "./press.tsx";

export { Description, Overlay, Portal, Root, Title, Trigger } from "./dialog.tsx";

export interface ContentProps {
  className?: string;
  children?: ReactNode;
  forceMount?: true;
}

/** The centred alert panel: an outside tap does not dismiss it (AlertDialog's contract). */
export function Content(props: ContentProps) {
  return <ModalContent {...props} dismissOutside={false} />;
}

export interface ButtonProps {
  className?: string;
  children?: ReactNode;
  onClick?: () => void;
}

/** A button whose class sets no text colour: its label takes the foreground of its own fill (white on a dark fill, slate-900 on a light one). */
function labelColour(className: string | undefined): string {
  const cls = className ?? "";
  if (/(^|\s)text-(white|black|slate-\d+|red-\d+)(\s|$)/.test(cls)) return "";
  return /(^|\s)bg-(slate-(800|900|950)|red-(600|700)|black)(\s|$)/.test(cls)
    ? "text-white"
    : "text-slate-900";
}

/** A string label is a Text that takes its colour from the button (never from the dialog above it). */
function labelled(children: ReactNode): ReactNode {
  if (typeof children === "string" || typeof children === "number")
    return <Text className="text-sm">{children}</Text>;
  return children;
}

/** Runs onClick, then closes the alert. */
export function Action(props: ButtonProps) {
  const ctx = useDialogContext("AlertDialog.Action");
  return (
    <Pressable
      className={cn("flex items-center justify-center", labelColour(props.className), props.className)}
      onPress={() => {
        props.onClick?.();
        ctx.setOpen(false);
      }}
    >
      {labelled(props.children)}
    </Pressable>
  );
}

/** Closes the alert without running anything else. */
export function Cancel(props: ButtonProps) {
  const ctx = useDialogContext("AlertDialog.Cancel");
  return (
    <Pressable
      className={cn("flex items-center justify-center", labelColour(props.className), props.className)}
      onPress={() => {
        props.onClick?.();
        ctx.setOpen(false);
      }}
    >
      {labelled(props.children)}
    </Pressable>
  );
}
