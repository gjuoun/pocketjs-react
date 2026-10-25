// <Dialog>: a modal panel portaled into the overlay layer above the app. While open it traps
// d-pad focus (FocusScope), focuses its first focusable, closes on CROSS (back), and on close
// gives focus back to whatever opened it. The trap and close live in ModalLayer (C5).

import type { ReactNode } from "react";
import { Text } from "../elements.ts";
import { ModalLayer } from "../primitives/modal-layer.tsx";
import { cn } from "../style/cn.ts";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  className?: string;
  panelClassName?: string;
  children?: ReactNode;
}

export function Dialog(props: DialogProps) {
  return (
    <ModalLayer
      open={props.open}
      onClose={props.onClose}
      shellClassName={cn("bg-slate-950", props.className)}
      panelClassName={cn(
        "flex-col gap-2 p-3 rounded-xl bg-white",
        props.panelClassName,
      )}
    >
      {props.title ? (
        <Text className="text-base text-slate-950">{props.title}</Text>
      ) : null}
      {props.children}
    </ModalLayer>
  );
}
