// Anchored placement shared by every floating panel (C6 and batch 2). A panel that has an anchor
// mounts hidden at the corner (opacity 0.01) so the core lays it out; a frame pump then measures it and
// places it beside the anchor (placePopper). Without an anchor the panel keeps its own flow.
import { getOps, hostViewport } from "@pocketjs/framework/host";
import { BTN, focusNode, getFocused } from "@pocketjs/framework/input";
import {
  type MutableRefObject,
  type ReactNode,
  type Ref,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { type PocketCSSProperties, View } from "../elements.ts";
import { useButton } from "../input/buttons.ts";
import type { NodeMirror } from "../internal/pocket.ts";
import { reconciler } from "../renderer/host-config.ts";
import { addFramePump, getOverlayLayer } from "../renderer/mount.ts";
import { cn } from "../style/cn.ts";
import { type Align, type Box, measureBox, type Placement, placePopper, type Side } from "./anchor.ts";
import { pushLayer } from "./layer-stack.ts";

/** Where a panel goes: the anchor box (null: no placement) and the placement options. */
export interface Anchoring {
  anchor: Box | null;
  side?: Side;
  align?: Align;
  sideOffset?: number;
  alignOffset?: number;
  collisionPadding?: number;
}

/**
 * The absolute style that puts a panel beside its anchor. Null when there is no anchor. Hidden at the
 * corner until the first measured frame, then at its placed spot (never drawn at the corner).
 */
export function usePlacedStyle(
  node: MutableRefObject<NodeMirror | null>,
  anchoring: Anchoring | undefined,
): PocketCSSProperties | undefined {
  const [placed, setPlaced] = useState<Placement | null>(null);
  const anchor = anchoring?.anchor ?? null;
  const side = anchoring?.side;
  const align = anchoring?.align;
  const sideOffset = anchoring?.sideOffset;
  const alignOffset = anchoring?.alignOffset;
  const collisionPadding = anchoring?.collisionPadding;

  // A layout effect: the measuring pump is registered in the commit that mounts the panel.
  useLayoutEffect(() => {
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
          alignOffset,
          collisionPadding,
        }),
      );
    });
  }, [anchor, placed, side, align, sideOffset, alignOffset, collisionPadding, node]);

  if (anchor === null) return undefined;
  return placed
    ? { position: "absolute", left: placed.x, top: placed.y }
    : { position: "absolute", left: 0, top: 0, opacity: 0.01 };
}

// ---- batch 2: floating non-modal panels --------------------------------------------------------------

/** A point as a zero-size box: the anchor of a panel that opens at the pointer (ContextMenu). */
export function pointBox(x: number, y: number): Box {
  return { x, y, w: 0, h: 0 };
}

/** The first focusable node below `node` in tree order, or null. */
export function firstFocusable(node: NodeMirror): NodeMirror | null {
  for (const child of node.children) {
    if (child.focusable) return child;
    const deeper = firstFocusable(child);
    if (deeper) return deeper;
  }
  return null;
}

/** True when `node` is `ancestor` or sits below it. */
export function within(ancestor: NodeMirror, node: NodeMirror | null): boolean {
  for (let n = node; n; n = n.parent) if (n === ancestor) return true;
  return false;
}

/**
 * The box of a trigger, measured on the first frame after `open` turns on, and null while closed. The
 * panel renders only once it has a box (so it never draws at a stale spot). `target` is read each frame.
 */
export function useAnchorBox(open: boolean, target: () => NodeMirror | null): Box | null {
  const [box, setBox] = useState<Box | null>(null);
  useLayoutEffect(() => {
    if (!open) {
      setBox(null);
      return;
    }
    let dispose: (() => void) | undefined;
    dispose = addFramePump(() => {
      const node = target();
      const measured = node ? measureBox(node) : null;
      if (!measured) return;
      dispose?.();
      setBox(measured);
    });
    return () => dispose?.();
    // target is a ref reader; it is read each frame, so it is not a dependency.
    // biome-ignore lint/correctness/useExhaustiveDependencies: see the comment above
  }, [open]);
  return box;
}

export interface PopperPanelProps {
  className?: string;
  /** The trigger's box; the panel renders only with one (see useAnchorBox). */
  anchor: Box;
  side?: Side;
  align?: Align;
  sideOffset?: number;
  alignOffset?: number;
  collisionPadding?: number;
  /** Registers the panel as a layer: a tap outside it calls onDismiss (R-1, swallowed). */
  onDismiss?: () => void;
  /** Moves focus to the first focusable inside on mount. This is not a trap. */
  focusFirst?: boolean;
  /** When the panel unmounts with focus inside it (or lost), focus goes back to this node. */
  restore?: { current: NodeMirror | null };
  /** Receives the panel's node while it is mounted (null after): a hover or focus check reads it. */
  panelRef?: { current: NodeMirror | null };
  children?: ReactNode;
}

/**
 * A non-modal floating panel in the overlay layer, placed beside its anchor. It is a layer only when it
 * has onDismiss. It never traps focus. Mounted per open, so each open starts from its own placement.
 */
export function PopperPanel(props: PopperPanelProps) {
  const node = useRef<NodeMirror | null>(null);
  const style = usePlacedStyle(node, {
    anchor: props.anchor,
    side: props.side,
    align: props.align,
    sideOffset: props.sideOffset,
    alignOffset: props.alignOffset,
    collisionPadding: props.collisionPadding,
  });
  const onDismiss = useRef(props.onDismiss);
  onDismiss.current = props.onDismiss;
  const layered = props.onDismiss !== undefined;
  // CROSS dismisses a layered panel too (the back button, as ModalLayer does).
  useButton(BTN.CROSS, () => onDismiss.current?.(), { enabled: layered });
  // A layout effect: the layer is on the stack in the same commit, so a tap on the next frame sees it.
  useLayoutEffect(() => {
    if (!layered) return;
    return pushLayer({
      panel: () => node.current,
      close: () => onDismiss.current?.(),
    });
  }, [layered]);

  // Mount-only: focus the first focusable, and on unmount give focus back when it sits in the panel.
  const focusFirst = props.focusFirst === true;
  const restore = props.restore;
  useLayoutEffect(() => {
    const panel = node.current;
    if (!panel) return;
    if (focusFirst) {
      const first = firstFocusable(panel);
      if (first) focusNode(first);
    }
    return () => {
      const back = restore?.current;
      const focused = getFocused();
      if (back && (focused === null || within(panel, focused))) focusNode(back);
    };
  }, []);

  const panelRef = props.panelRef;
  const setNode = useCallback(
    (n: NodeMirror | null) => {
      node.current = n;
      if (panelRef) panelRef.current = n;
    },
    [panelRef],
  );

  return reconciler.createPortal(
    <View
      ref={setNode as Ref<NodeMirror>}
      className={cn("absolute", props.className)}
      style={style}
    >
      {props.children}
    </View>,
    getOverlayLayer(),
    null,
  ) as ReactNode;
}
