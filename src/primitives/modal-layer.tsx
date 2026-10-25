// <ModalLayer>: the modal core shared by <Dialog> and the native dialog/menu/select primitives.
// While open it portals a full-screen shell into the overlay layer above the app, traps d-pad
// focus (FocusScope), and closes on CROSS (back). The shell and panel classes are the caller's;
// the trap and the close are not.
//
// Anchoring (C6): when the caller passes a trigger box, the panel is placed beside it. It first
// mounts at the top-left corner, invisible (opacity 0.01), so the core lays it out and its box can
// be measured (a hit test, no paint). Then placePopper picks the spot, and the panel is shown there.
// Without an anchor the panel stays centred.

import { getOps, hostViewport } from "@pocketjs/framework/host";
import { BTN } from "@pocketjs/framework/input";
import { type ReactNode, type Ref, useEffect, useRef, useState } from "react";
import { View } from "../elements.ts";
import { FocusScope } from "../focus/FocusScope.tsx";
import { useButton } from "../input/buttons.ts";
import type { NodeMirror } from "../internal/pocket.ts";
import { reconciler } from "../renderer/host-config.ts";
import { addFramePump, getOverlayLayer } from "../renderer/mount.ts";
import { cn } from "../style/cn.ts";
import {
  type Align,
  type Box,
  measureBox,
  type Placement,
  placePopper,
  type Side,
} from "./anchor.ts";

/** Where a panel goes: the trigger's box (null: centred) and the placement options. */
export interface Anchoring {
  anchor: Box | null;
  side?: Side;
  align?: Align;
  sideOffset?: number;
  collisionPadding?: number;
}

export interface ModalLayerProps {
  open: boolean;
  onClose: () => void;
  /** Classes for the full-screen shell that centers the panel. */
  shellClassName?: string;
  /** Classes for the focus-trapped panel. */
  panelClassName?: string;
  /** Trigger box and placement: the panel anchors beside it, else it is centred. */
  anchoring?: Anchoring;
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
      <Panel className={props.panelClassName} anchoring={props.anchoring}>
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
  children?: ReactNode;
}) {
  const node = useRef<NodeMirror | null>(null);
  const [placed, setPlaced] = useState<Placement | null>(null);
  const anchor = props.anchoring?.anchor ?? null;
  const side = props.anchoring?.side;
  const align = props.anchoring?.align;
  const sideOffset = props.anchoring?.sideOffset;
  const collisionPadding = props.anchoring?.collisionPadding;

  useEffect(() => {
    if (!anchor || placed) return;
    return addFramePump(() => {
      const current = node.current;
      const box = current ? measureBox(current) : null;
      const viewport = hostViewport(getOps());
      if (!box || !viewport) return; // not laid out yet: try the next frame
      setPlaced(
        placePopper({
          anchor,
          panel: { w: box.w, h: box.h },
          viewport,
          side,
          align,
          sideOffset,
          collisionPadding,
        }),
      );
    });
  }, [anchor, placed, side, align, sideOffset, collisionPadding]);

  const style =
    anchor === null
      ? undefined
      : placed
        ? { position: "absolute" as const, left: placed.x, top: placed.y }
        : { position: "absolute" as const, left: 0, top: 0, opacity: 0.01 };
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
