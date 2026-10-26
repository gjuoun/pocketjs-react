// mount(): bind React to the PocketJS host. Mirrors the framework's own Octane/Solid mount
// (host detection, pak styles and fonts, app + overlay layers, input roots) and owns the
// frame loop: button dispatch runs at discrete priority and is flushed synchronously, so a
// press commits in the frame that caused it, then the native sweep runs.

import {
  detectHost,
  type HostOps,
  hostViewport,
  installFrameHandler,
  installHost,
} from "@pocketjs/framework/host";
import {
  hasPack,
  loadPack,
  entries as pakEntries,
  get as pakGet,
} from "@pocketjs/framework/pak";
import {
  Fragment,
  type ReactNode,
  createElement as reactCreateElement,
} from "react";
import { DiscreteEventPriority } from "react-reconciler/constants";
import { type CompatOptions, installCompat } from "../compat/index.ts";
import { OskHost } from "../input/Osk.tsx";
import { installFocusRing } from "../focus/ring.ts";
import { installPointer } from "../input/pointer.ts";
import { installTextEntry } from "../input/text-entry.ts";
import { resetTextFields } from "../input/text-field.ts";
import {
  createElement,
  ENUMS,
  handleFrame,
  insertNode,
  type NodeMirror,
  registerStyles,
  registerTexture,
  removeNode,
  resolveStyle,
  rootMirror,
  runSweep,
  SCREEN_H,
  SCREEN_W,
  setHitRoot,
  setInputRoot,
  setProp,
  setStyleResolver,
} from "../internal/pocket.ts";
import {
  buildStyleBin,
  buildStyleIds,
  buildStyleTokens,
} from "../style/build-styles.ts";
import { initClassRuntime } from "../style/class-runtime.ts";
import { installStyleLayer, syncIconColours } from "../style/props.ts";
import { forgetIconVariants, registerIconVariant } from "../style/icon-colour.ts";
import { reconciler, withPriority } from "./host-config.ts";
import { setOskTarget } from "./osk-target.ts";

const PAK_IMAGE_PREFIX = "ui:img.";

/** Upload one pak IMG entry (a baked icon variant) and register its handle under the key without the prefix. */
function uploadPakImage(ops: HostOps, key: string): void {
  const blob = pakGet(key);
  let handle: number;
  if (ops.uploadImgEntry) {
    handle = ops.uploadImgEntry(blob);
  } else {
    const dv = new DataView(blob.buffer, blob.byteOffset, blob.byteLength);
    handle = ops.uploadTexture(blob.subarray(8), dv.getUint16(0, true), dv.getUint16(2, true), blob[4]);
  }
  if (handle < 0) return;
  const name = key.slice(PAK_IMAGE_PREFIX.length);
  registerTexture(name, handle);
  if (name.startsWith("icon.")) registerIconVariant(name, handle);
}

export interface MountOptions {
  /** Class literal -> style id table; defaults to the table tools/build.ts compiled. */
  styles?: Record<string, number>;
  /** styles.bin the host loaded; defaults to the build's. Without it, runtime class strings are not compiled. */
  styleBin?: Uint8Array;
  /** Host ops; defaults to globalThis.ui. */
  ops?: HostOps;
  /** DOM compat policy (tag/prop mapping is always on; this only tunes failure modes). */
  compat?: CompatOptions;
}

type FrameListener = (pressed: number, buttons: number) => void;
const frameListeners: FrameListener[] = [];
const framePumps: (() => void)[] = [];

/** Register work that runs every frame, before button handling (e.g. draining pointer events). */
export function addFramePump(fn: () => void): () => void {
  framePumps.push(fn);
  return () => {
    const i = framePumps.indexOf(fn);
    if (i >= 0) framePumps.splice(i, 1);
  };
}

/** Register a pressed-edge listener that runs before focus navigation each frame. */
export function addFrameListener(fn: FrameListener): () => void {
  frameListeners.push(fn);
  return () => {
    const i = frameListeners.lastIndexOf(fn);
    if (i >= 0) frameListeners.splice(i, 1);
  };
}

let overlayLayer: NodeMirror | null = null;

/** The full-screen layer above the app; dialogs portal into it. */
export function getOverlayLayer(): NodeMirror {
  if (!overlayLayer) throw new Error("pocketjs-react: mount() has not run");
  return overlayLayer;
}

function layer(style: Record<string, number>): NodeMirror {
  const node = createElement("view");
  setProp(node, "style", style);
  return node;
}

export function mount(element: ReactNode, opts: MountOptions = {}): () => void {
  const ops = opts.ops ?? (globalThis as { ui?: HostOps }).ui;
  if (!ops)
    throw new Error("pocketjs-react: mount() needs globalThis.ui or opts.ops");
  const host = detectHost(ops);
  installHost(host);
  // Icon variant handles belong to the core that uploaded them; a new mount re-registers its own.
  forgetIconVariants();
  setStyleResolver(resolveStyle);
  registerStyles(opts.styles ?? buildStyleIds());
  initClassRuntime(
    opts.styleBin ?? (opts.styles ? new Uint8Array(0) : buildStyleBin()),
    buildStyleTokens(),
  );
  installStyleLayer();
  installCompat(opts.compat);
  const removePointer = installPointer();
  const removeRing = installFocusRing(addFramePump);
  const removeTextEntry = installTextEntry();
  // A fresh mount starts with no keyboard, even if a previous mount left one open.
  resetTextFields();

  const nativeTextures =
    host.kind === "native"
      ? (host.ops as HostOps & { __textures?: Record<string, number> })
          .__textures
      : undefined;
  if (nativeTextures)
    for (const key in nativeTextures) registerTexture(key, nativeTextures[key]);
  if (host.kind === "injected" || nativeTextures === undefined) {
    const pak = (globalThis as { __pak?: ArrayBuffer }).__pak;
    if (pak) loadPack(pak);
    if (hasPack()) {
      for (const key of pakEntries()) {
        if (key === "ui:styles") host.ops.loadStyles?.(pakGet(key));
        else if (key.startsWith("ui:font."))
          host.ops.loadFontAtlas?.(pakGet(key));
        else if (key.startsWith(PAK_IMAGE_PREFIX)) uploadPakImage(host.ops, key);
      }
    }
  }

  const viewport = hostViewport(host.ops);
  const w = viewport?.w ?? SCREEN_W;
  const h = viewport?.h ?? SCREEN_H;
  const appLayer = layer({
    width: w,
    height: h,
    overflow: ENUMS.Overflow.Hidden,
  });
  const overlay = layer({
    width: w,
    height: h,
    posType: ENUMS.PosType.Absolute,
    insetT: 0,
    insetR: 0,
    insetB: 0,
    insetL: 0,
    zIndex: 1000,
    hitPass: 1,
  });
  insertNode(rootMirror, appLayer);
  insertNode(rootMirror, overlay);
  overlayLayer = overlay;
  setOskTarget(overlay);
  setInputRoot(rootMirror);
  setHitRoot(rootMirror);

  const errors: unknown[] = [];
  const report = (error: unknown) => {
    errors.push(error);
    console.error("pocketjs-react: " + String(error));
  };
  const container = reconciler.createContainer(
    appLayer,
    1,
    null,
    false,
    null,
    "",
    report,
    report,
    report,
    () => {},
    null,
  );

  let prevButtons = 0;
  installFrameHandler((buttons: number) => {
    const pressed = buttons & ~prevButtons;
    prevButtons = buttons;
    withPriority(DiscreteEventPriority, () => {
      for (const pump of [...framePumps]) pump();
      if (pressed) for (const fn of [...frameListeners]) fn(pressed, buttons);
      handleFrame(buttons);
    });
    syncIconColours();
    reconciler.flushSyncWork();
    runSweep();
  });

  reconciler.updateContainerSync(
    reactCreateElement(
      Fragment,
      null,
      element,
      reactCreateElement(OskHost, { target: overlay }),
    ) as never,
    container,
    null,
    null,
  );
  reconciler.flushSyncWork();
  if (errors.length > 0) throw errors[0];

  return () => {
    reconciler.updateContainerSync(null, container, null, null);
    reconciler.flushSyncWork();
    removeRing();
    for (const child of [appLayer, overlay]) removeNode(rootMirror, child);
    runSweep();
    setInputRoot(null);
    setHitRoot(null);
    overlayLayer = null;
    setOskTarget(null);
    removePointer();
    removeTextEntry();
    resetTextFields();
    (globalThis as { frame?: unknown }).frame = undefined;
  };
}
