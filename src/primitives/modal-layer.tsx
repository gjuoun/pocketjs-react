// <ModalLayer>: the modal core shared by <Dialog> and the native dialog/menu/select primitives.
// While open it portals a full-screen shell into the overlay layer above the app, traps d-pad
// focus (FocusScope), and closes on CROSS (back). The shell and panel classes are the caller's;
// the trap and the close are not.

import { BTN } from "@pocketjs/framework/input";
import type { ReactNode } from "react";
import { View } from "../elements.ts";
import { FocusScope } from "../focus/FocusScope.tsx";
import { useButton } from "../input/buttons.ts";
import { reconciler } from "../renderer/host-config.ts";
import { getOverlayLayer } from "../renderer/mount.ts";
import { cn } from "../style/cn.ts";

export interface ModalLayerProps {
  open: boolean;
  onClose: () => void;
  /** Classes for the full-screen shell that centers the panel. */
  shellClassName?: string;
  /** Classes for the focus-trapped panel. */
  panelClassName?: string;
  children?: ReactNode;
}

export function ModalLayer(props: ModalLayerProps) {
  useButton(BTN.CROSS, props.onClose, { enabled: props.open });
  if (!props.open) return null;
  return reconciler.createPortal(
    <View className={cn("absolute inset-0 flex-col items-center justify-center", props.shellClassName)}>
      <FocusScope className={props.panelClassName}>{props.children}</FocusScope>
    </View>,
    getOverlayLayer(),
    null,
  ) as ReactNode;
}
