// Dialog: a controlled root, a trigger, and content that portals a scrim and a focus-trapped panel into the
// overlay layer. CROSS closes it; a tap outside the panel closes it through the layer stack; the focus scope
// restores focus to the trigger on close. The panel is mounted only while open.
import { createContext, type ReactNode, useContext, useEffect, useRef } from "react";
import { BTN } from "@pocketjs/framework/input";
import { Text, View } from "../elements.ts";
import { FocusScope } from "../focus/FocusScope.tsx";
import { useButton } from "../input/buttons.ts";
import type { NodeMirror } from "../internal/pocket.ts";
import { reconciler } from "../renderer/host-config.ts";
import { getOverlayLayer } from "../renderer/mount.ts";
import { pushLayer } from "../primitives/layer-stack.ts";
import { useControllableState } from "../primitives/state.ts";
import { Button } from "./button.tsx";
import { useTokens } from "./theme.tsx";

interface DialogContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}
const Ctx = createContext<DialogContextValue | null>(null);

function useDialog(part: string): DialogContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("pocketjs-react native: " + part + " must be used inside <Dialog>");
  return ctx;
}

export interface DialogProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
}

export function Dialog(props: DialogProps) {
  const [open, setOpen] = useControllableState(props.open, props.defaultOpen ?? false, props.onOpenChange);
  return <Ctx.Provider value={{ open, setOpen }}>{props.children}</Ctx.Provider>;
}

export function DialogTrigger(props: { children?: string; onPress?: () => void }) {
  const ctx = useDialog("DialogTrigger");
  return (
    <Button onPress={() => { props.onPress?.(); ctx.setOpen(true); }}>{props.children}</Button>
  );
}

export function DialogClose(props: { children?: string }) {
  const ctx = useDialog("DialogClose");
  return <Button variant="outline" onPress={() => ctx.setOpen(false)}>{props.children}</Button>;
}

export function DialogTitle(props: { children?: string }) {
  const T = useTokens() as Record<string, string>;
  return <Text className={T["dialog.title"]}>{props.children}</Text>;
}

export function DialogDescription(props: { children?: string }) {
  const T = useTokens() as Record<string, string>;
  return <Text className={T["dialog.description"]}>{props.children}</Text>;
}

export function DialogFooter(props: { children?: ReactNode }) {
  const T = useTokens() as Record<string, string>;
  return <View className={T["dialog.footer"]}>{props.children}</View>;
}

/** The layer: a scrim and a focus-trapped panel. Mounted only while the dialog is open. */
function DialogLayer(props: { children?: ReactNode }) {
  const T = useTokens() as Record<string, string>;
  const ctx = useDialog("DialogContent");
  const node = useRef<NodeMirror | null>(null);
  const close = useRef<() => void>(() => {});
  close.current = () => ctx.setOpen(false);
  useButton(BTN.CROSS, () => close.current());
  useEffect(
    () => pushLayer({ panel: () => node.current, close: () => close.current(), dismissOutside: true }),
    [],
  );
  return (
    <View className={T["dialog.shell"]}>
      <View className={T["dialog.scrim"]} />
      <FocusScope className={T["dialog.panel"]} nodeRef={node} autoFocus>
        {props.children}
      </FocusScope>
    </View>
  );
}

export function DialogContent(props: { children?: ReactNode }) {
  const ctx = useDialog("DialogContent");
  if (!ctx.open) return null;
  return reconciler.createPortal(<DialogLayer>{props.children}</DialogLayer>, getOverlayLayer(), null) as ReactNode;
}
