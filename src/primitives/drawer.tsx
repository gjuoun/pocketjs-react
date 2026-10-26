// Native Drawer, the vaul shim (batch 2). Shaped like vaul's Drawer namespace so the vendored shadcn drawer
// imports it unchanged (the R8 remap points `vaul` here). A drawer is a Dialog docked to the bottom edge:
// full width, the panel at the bottom of the overlay, no drag and no snap points (parked), all four corners
// rounded (per-corner radius is not in the core's class map). CROSS and a
// scrim tap close it, as Dialog does. Direction is accepted and only `bottom` is drawn.

import type { ReactNode } from "react";
import { ModalLayer } from "./modal-layer.tsx";
import { cn } from "../style/cn.ts";
import { ownSurface } from "./surface.ts";
import { useDialogContext } from "./dialog.tsx";

export { Close, Description, Overlay, Portal, Root, Title, Trigger } from "./dialog.tsx";

export interface ContentProps {
  className?: string;
  children?: ReactNode;
}

/** The bottom sheet: docked to the bottom edge, full width, above the scrim. */
export function Content(props: ContentProps) {
  const ctx = useDialogContext("Drawer.Content");
  return (
    <ModalLayer
      open={ctx.open}
      onClose={() => ctx.setOpen(false)}
      shellClassName="justify-end"
      panelClassName={cn("flex-col w-full rounded-xl bg-slate-800 text-white", ownSurface(props.className))}
    >
      {props.children}
    </ModalLayer>
  );
}

