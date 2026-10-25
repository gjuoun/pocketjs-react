// Build-time and test-time counterpart of pocket.ts: PocketJS compiler, font baker, pak
// writer, the wasm core binding and the headless Chrome driver, imported by path from the
// pinned @pocketjs/framework package. Never imported by guest (runtime) code.

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export { PSM } from "@pocket-internal/contracts/spec/spec.ts";
export { bakeAtlases } from "@pocket-internal/framework/compiler/bake-font.ts";
export {
  type DecodedImage,
  decodePng,
  encodeImageEntry,
  KEY_STYLES,
  keyFont,
  keyImage,
  PAK_DTYPE,
  type PakBlob,
  pack,
  unpack,
} from "@pocket-internal/framework/compiler/pak.ts";
export {
  compileClasses,
  DEFAULT_FONT_SLOT,
  fontSlotFor,
  generateStylesModule,
  MONO_FONT_PX,
  suspectClassLiteral,
  unknownUtilities,
} from "@pocket-internal/framework/compiler/tailwind.ts";
/**
 * Absolute directory of the PocketJS core root. POCKETJS_CORE_ROOT selects a core overlay built by
 * tools/core-overlay.ts; unset, it is the pinned @pocketjs/framework package in node_modules.
 */
export const FRAMEWORK_ROOT = (
  process.env.POCKETJS_CORE_ROOT
    ? resolve(process.env.POCKETJS_CORE_ROOT)
    : new URL("../../node_modules/@pocketjs/framework/", import.meta.url)
        .pathname
).replace(/\/?$/, "/");

// The web host binding (wasm-ops.js) comes from the same root as the wasm it drives: an overlay's
// binding is the one that knows its ops (nodeRect). Type-only import from the pinned package; the
// runtime load is the root's file. Build and test code only; guest code never imports this module.
import type * as WebOps from "@pocket-internal/hosts/web/wasm-ops.js";

const host = (await import(
  pathToFileURL(FRAMEWORK_ROOT + "hosts/web/wasm-ops.js").href
)) as typeof WebOps;

export { HeadlessChrome } from "@pocket-internal/tools/headless-chrome.ts";

export const createWasmUi = host.createWasmUi;
export const FB_H = host.FB_H;
export const FB_W = host.FB_W;
