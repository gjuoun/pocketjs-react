// AlertDialog: the Dialog shell for a decision the user must make. It portals a scrim and a focus-trapped panel into the
// overlay layer, but it does NOT dismiss on its own: CROSS does nothing and a tap outside the panel is swallowed (it never
// reaches the app behind) while the panel stays open. Only an action does: AlertDialogCancel (outline) and
// AlertDialogAction (default or destructive) report their press and close. The layer is pushed with dismissOutside false,
// the flag the layer stack reads for exactly this case.
import { createContext, type ReactNode, useContext, useLayoutEffect, useRef } from "react";
import { Text, View } from "../elements.ts";
import { FocusScope } from "../focus/FocusScope.tsx";
import type { NodeMirror } from "../internal/pocket.ts";
import { pushLayer } from "../primitives/layer-stack.ts";
import { useControllableState } from "../primitives/state.ts";
import { reconciler } from "../renderer/host-config.ts";
import { getOverlayLayer } from "../renderer/mount.ts";
import { Button } from "./button.tsx";
import { useTokens } from "./theme.tsx";

interface AlertDialogContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}
const Ctx = createContext<AlertDialogContextValue | null>(null);

function useAlertDialog(part: string): AlertDialogContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("pocketjs-react native: " + part + " must be used inside <AlertDialog>");
  return ctx;
}

export interface AlertDialogProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
}

export function AlertDialog(props: AlertDialogProps) {
  const [open, setOpen] = useControllableState(props.open, props.defaultOpen ?? false, props.onOpenChange);
  return <Ctx.Provider value={{ open, setOpen }}>{props.children}</Ctx.Provider>;
}

export function AlertDialogTrigger(props: { children?: string; onPress?: () => void }) {
  const ctx = useAlertDialog("AlertDialogTrigger");
  return (
    <Button onPress={() => { props.onPress?.(); ctx.setOpen(true); }}>{props.children}</Button>
  );
}

export function AlertDialogTitle(props: { children?: string }) {
  const T = useTokens() as Record<string, string>;
  return <Text className={T["alert-dialog.title"]}>{props.children}</Text>;
}

export function AlertDialogDescription(props: { children?: string }) {
  const T = useTokens() as Record<string, string>;
  return <Text className={T["alert-dialog.description"]}>{props.children}</Text>;
}

export function AlertDialogFooter(props: { children?: ReactNode }) {
  const T = useTokens() as Record<string, string>;
  return <View className={T["alert-dialog.actions"]}>{props.children}</View>;
}

/** The layer: a scrim and a focus-trapped panel that stays open on CROSS and on an outside tap. */
function AlertDialogLayer(props: { children?: ReactNode }) {
  const T = useTokens() as Record<string, string>;
  const ctx = useAlertDialog("AlertDialogContent");
  const node = useRef<NodeMirror | null>(null);
  const close = useRef<() => void>(() => {});
  close.current = () => ctx.setOpen(false);
  // No CROSS handler: the back button is not an answer here. dismissOutside false: an outside tap is swallowed and the
  // panel stays, so the only way out is an action.
  useLayoutEffect(
    () => pushLayer({ panel: () => node.current, close: () => close.current(), dismissOutside: false }),
    [],
  );
  return (
    <View className={T["alert-dialog.shell"]}>
      <View className={T["alert-dialog.scrim"]} />
      <FocusScope className={T["alert-dialog.panel"]} nodeRef={node} autoFocus debugName="alert-dialog-panel">
        {props.children}
      </FocusScope>
    </View>
  );
}

export function AlertDialogContent(props: { children?: ReactNode }) {
  const ctx = useAlertDialog("AlertDialogContent");
  if (!ctx.open) return null;
  return reconciler.createPortal(<AlertDialogLayer>{props.children}</AlertDialogLayer>, getOverlayLayer(), null) as ReactNode;
}

export interface AlertDialogActionProps {
  /** A red action (Delete, Discard), the one the dialog exists to offer. */
  destructive?: boolean;
  onPress?: () => void;
  children?: string;
}

export function AlertDialogAction(props: AlertDialogActionProps) {
  const ctx = useAlertDialog("AlertDialogAction");
  return (
    <Button
      variant={props.destructive ? "destructive" : "default"}
      onPress={() => { props.onPress?.(); ctx.setOpen(false); }}
    >
      {props.children}
    </Button>
  );
}

export function AlertDialogCancel(props: { onPress?: () => void; children?: string }) {
  const ctx = useAlertDialog("AlertDialogCancel");
  return (
    <Button variant="outline" onPress={() => { props.onPress?.(); ctx.setOpen(false); }}>
      {props.children}
    </Button>
  );
}
