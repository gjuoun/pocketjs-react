// <ModalLayer>: the modal core shared by <Dialog> and the native dialog/menu/select primitives.
// While open it portals a full-screen shell into the overlay layer above the app, traps d-pad
// focus (FocusScope), and closes on CROSS (back) or a tap outside its panel (C6). The shell and panel
// classes are the caller's; the trap and the close are not. dismissOutside=false (AlertDialog) keeps a
// tap outside from closing; the tap is still swallowed.
//
// Anchoring (C6): when the caller passes a trigger box, the panel is placed beside it (usePlacedStyle).
// Without an anchor the panel stays centred.

import { BTN, type FocusDirection, pushFocusController } from "@pocketjs/framework/input";
import { type ReactNode, type Ref, useEffect, useRef } from "react";
import { View } from "../elements.ts";
import { FocusScope } from "../focus/FocusScope.tsx";
import { useButton } from "../input/buttons.ts";
import type { NodeMirror } from "../internal/pocket.ts";
import { reconciler } from "../renderer/host-config.ts";
import { getOverlayLayer } from "../renderer/mount.ts";
import { cn } from "../style/cn.ts";
import { type Anchoring, usePlacedStyle } from "./anchored.tsx";
import { pushLayer } from "./layer-stack.ts";

export type { Anchoring } from "./anchored.tsx";

export interface ModalLayerProps {
  open: boolean;
  onClose: () => void;
  /** Classes for the full-screen shell that centers the panel. */
  shellClassName?: string;
  /** Classes for the focus-trapped panel. */
  panelClassName?: string;
  /** Trigger box and placement: the panel anchors beside it, else it is centred. */
  anchoring?: Anchoring;
  /** A tap outside the panel closes the layer (default). false: the tap is swallowed and nothing closes. */
  dismissOutside?: boolean;
  /** The panel's own d-pad hook (C9 sub-menus): return true to take the direction, false to fall through. */
  onDirection?: (direction: FocusDirection) => boolean;
  children?: ReactNode;
}

export function ModalLayer(props: ModalLayerProps) {
  useButton(BTN.CROSS, props.onClose, { enabled: props.open });
  if (!props.open) return null;
  return reconciler.createPortal(
    <View
      className={cn(
        "absolute inset-0 flex-col items-center justify-center",
        props.shellClassName,
      )}
    >
      <Panel
        className={props.panelClassName}
        anchoring={props.anchoring}
        dismissOutside={props.dismissOutside}
        onClose={props.onClose}
        onDirection={props.onDirection}
      >
        {props.children}
      </Panel>
    </View>,
    getOverlayLayer(),
    null,
  ) as ReactNode;
}

/** The focus-trapped panel. Mounted per open, so each open starts from its own placement. */
function Panel(props: {
  className?: string;
  anchoring?: Anchoring;
  dismissOutside?: boolean;
  onClose: () => void;
  onDirection?: (direction: FocusDirection) => boolean;
  children?: ReactNode;
}) {
  const node = useRef<NodeMirror | null>(null);
  // The panel's d-pad hook is registered once per open; the hook it calls is always the latest prop.
  const onDirection = useRef(props.onDirection);
  onDirection.current = props.onDirection;
  // Only a panel that declares a hook registers one: the focus manager takes the topmost matching
  // controller, so a no-op registration from an enclosing panel would shadow an inner sub-menu's.
  useEffect(() => {
    if (!props.onDirection || !node.current) return;
    return pushFocusController(node.current as never, (direction) =>
      onDirection.current ? onDirection.current(direction) : false,
    );
  }, []);
  // The layer registers once per open; the close it calls is always the latest prop.
  const onClose = useRef(props.onClose);
  onClose.current = props.onClose;
  const dismissOutside = props.dismissOutside;
  useEffect(
    () =>
      pushLayer({
        panel: () => node.current,
        close: () => onClose.current(),
        dismissOutside,
      }),
    [],
  );

  const style = usePlacedStyle(node, props.anchoring);
  return (
    <FocusScope
      className={props.className}
      style={style}
      nodeRef={node as Ref<NodeMirror>}
    >
      {props.children}
    </FocusScope>
  );
}
