// C4 on-screen keyboard: a d-pad-navigable QWERTY panel portaled onto the overlay layer
// while a field is open. The keys are focusable views (CIRCLE presses them natively, so
// focus:/active: styles work), d-pad movement is a focus controller running the same
// layout math that rendered the rows, and the app button handlers are muted simply because
// useButton is a last-registered-wins stack. Layout: src/input/osk-layout.ts.
import {
  BTN,
  focusNode,
  pushFocusController,
  pushFocusScope,
} from "@pocketjs/framework/input";
import {
  type ReactNode,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Text, View } from "../elements.ts";
import type { NodeMirror } from "../internal/pocket.ts";
import { reconciler } from "../renderer/host-config.ts";
import { oskTargetIs } from "../renderer/osk-target.ts";
import { useFrame } from "../renderer/use-frame.ts";
import { useButton } from "./buttons.ts";
import { setInputSource } from "./input-source.ts";
import {
  clampPos,
  homePos,
  layoutRows,
  navigate,
  OSK_GAP,
  OSK_H,
  OSK_PAD,
  type OskKeyDef,
  type OskKeyRect,
  type OskLayerName,
  type OskPos,
  oskLayer,
  oskLayerToggle,
  oskMetrics,
  oskRowsTop,
} from "./osk-layout.ts";
import {
  activeField,
  backspace,
  closeField,
  commitField,
  insertText,
  isAttached,
  keyboardMode,
  moveCaret,
  setKeyboardPanel,
  subscribe,
  type TextFieldBinding,
} from "./text-field.ts";

const KEY =
  "absolute rounded-sm items-center justify-center bg-slate-700 focus:bg-blue-600 active:bg-blue-500";
const KEY_SPECIAL =
  "absolute rounded-sm items-center justify-center bg-slate-800 focus:bg-blue-600 active:bg-blue-500";
const PANEL = "absolute bg-slate-900";
const LABEL = "text-xs font-bold text-white";

const SCREEN_W = 480;
const innerWidth = SCREEN_W - 2 * OSK_PAD;

/** The open field whose panel is up. A physical key leaves no panel, so the store reads null then. */
function shownField(): TextFieldBinding | null {
  const field = activeField();
  return field && keyboardMode() === "panel" ? field : null;
}

/** React reads the shown field through the store; the store changes with the field and with the last input's source. */
function useOpenField(): TextFieldBinding | null {
  return useSyncExternalStore(subscribe, shownField, () => null);
}

function OskPanel(props: { field: TextFieldBinding }) {
  const metrics = oskMetrics();
  const [layer, setLayer] = useState<OskLayerName>("lower");
  const pos = useRef<OskPos>({ row: 0, col: 1 });
  const layerRef = useRef(layer);
  layerRef.current = layer;
  const rects = layoutRows(oskLayer(layer), innerWidth, metrics.gap);
  const keyNodes = useRef(new Map<string, NodeMirror>());
  const container = useRef<NodeMirror>(null);

  const registerKey =
    (rect: OskKeyRect) =>
    (node: NodeMirror | null): void => {
      if (node) keyNodes.current.set(rect.row + ":" + rect.col, node);
    };

  const focusKey = (next: OskPos): void => {
    const clamped = clampPos(rects, next);
    pos.current = clamped;
    const node = keyNodes.current.get(clamped.row + ":" + clamped.col);
    if (node) focusNode(node);
  };

  const activate = (key: OskKeyDef): void => {
    const field = props.field;
    setInputSource("onscreen");
    if (key.ch !== undefined) {
      insertText(field, key.ch);
      if (layerRef.current === "upper") setLayer("lower");
      return;
    }
    switch (key.action) {
      case "shift":
        setLayer(layerRef.current === "upper" ? "lower" : "upper");
        break;
      case "layer":
        setLayer(oskLayerToggle(layerRef.current));
        break;
      case "backspace":
        backspace(field);
        break;
      case "enter":
        if (field.input.multiline) insertText(field, "\n");
        else commitField(field);
        break;
      case "left":
        moveCaret(field, -1);
        break;
      case "right":
        moveCaret(field, 1);
        break;
      case "hide":
        closeField(field);
        break;
    }
  };

  // d-pad movement inside the panel runs the layout's own navigation math; edges clamp
  // (the controller returns true so the core never falls through to default traversal).
  useLayoutEffect(() => {
    if (!container.current) return;
    // Key refs registered during the commit that mounted this panel.
    pos.current = homePos(rects);
    const scope = pushFocusScope(container.current as never, {
      autoFocus: false,
      restoreFocus: true,
    });
    const controller = pushFocusController(
      container.current as never,
      (direction) => {
        focusKey(navigate(rects, pos.current, direction));
        return true;
      },
    );
    focusKey(pos.current);
    setKeyboardPanel(container.current);
    return () => {
      setKeyboardPanel(null);
      controller();
      scope();
      keyNodes.current.clear();
    };
  }, []);

  // Chords: SQUARE deletes, TRIANGLE spaces, CROSS closes, START commits, shoulders
  // switch layers. Registered while the panel lives, so they shadow the app's handlers.
  useButton(BTN.SQUARE, () => {
    setInputSource("onscreen");
    backspace(props.field);
  });
  useButton(BTN.TRIANGLE, () => {
    setInputSource("onscreen");
    insertText(props.field, " ");
  });
  useButton(BTN.CROSS, () => closeField(props.field));
  useButton(BTN.START, () => commitField(props.field));
  useButton(BTN.RTRIGGER, () => setLayer(oskLayerToggle(layerRef.current)));
  useButton(BTN.LTRIGGER, () => setLayer(oskLayerToggle(layerRef.current)));

  // The keyboard closes itself when React removes the field element (unbind may not run).
  useFrame(() => {
    if (!isAttached(props.field)) closeField(props.field, false);
  });

  const rowTop = (row: number): number =>
    oskRowsTop(metrics) + row * (metrics.rowH + OSK_GAP);
  return (
    <View
      ref={container}
      className={PANEL}
      style={{ left: 0, bottom: 0, width: SCREEN_W, height: OSK_H }}
    >
      {rects.map((row) =>
        row.map((rect) => (
          <View
            key={rect.row + ":" + rect.col}
            ref={registerKey(rect)}
            className={rect.key.ch === undefined ? KEY_SPECIAL : KEY}
            focusable
            style={{
              left: rect.x,
              top: rowTop(rect.row),
              width: rect.w,
              height: metrics.rowH,
            }}
            onPress={() => activate(rect.key)}
          >
            <Text className={LABEL}>{rect.key.label ?? rect.key.ch ?? ""}</Text>
          </View>
        )),
      )}
    </View>
  );
}

/** Portals the keyboard onto the overlay layer while a field is open. mount() renders
 * one of these next to the app (passing the overlay node) so no app has to know the
 * keyboard exists; Osk.tsx deliberately does not import mount.ts. */
export function OskHost(props: { target: NodeMirror }): ReactNode {
  const field = useOpenField();
  // A direct-typing field (physical keys) has no panel: useOpenField reads null for it.
  if (!field) return null;
  // A root from a disposed mount must not portal a keyboard into the live core.
  if (!oskTargetIs(props.target)) return null;
  return reconciler.createPortal(
    <OskPanel field={field} />,
    props.target,
    null,
  );
}
