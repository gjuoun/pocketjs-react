// <Dialog>: a modal panel portaled into the overlay layer above the app. While open it traps
// d-pad focus (FocusScope), focuses its first focusable, closes on CROSS (back), and on close
// gives focus back to whatever opened it.
import type { ReactNode } from "react";
import { BTN } from "@pocketjs/framework/input";
import { Text, View } from "../elements.ts";
import { FocusScope } from "../focus/FocusScope.tsx";
import { useButton } from "../input/buttons.ts";
import { reconciler } from "../renderer/host-config.ts";
import { getOverlayLayer } from "../renderer/mount.ts";
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
  useButton(BTN.CROSS, props.onClose, { enabled: props.open });
  if (!props.open) return null;
  return reconciler.createPortal(
    <View className={cn("absolute inset-0 flex-col items-center justify-center bg-slate-950", props.className)}>
      <FocusScope className={cn("flex-col gap-2 p-3 rounded-xl bg-white", props.panelClassName)}>
        {props.title ? <Text className="text-base text-slate-950">{props.title}</Text> : null}
        {props.children}
      </FocusScope>
    </View>,
    getOverlayLayer(),
    null,
  ) as ReactNode;
}
