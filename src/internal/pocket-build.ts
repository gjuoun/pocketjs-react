// Build-time and test-time counterpart of pocket.ts: PocketJS compiler, font baker, pak
// writer, the wasm core binding and the headless Chrome driver, imported by path from the
// pinned @pocketjs/framework package. Never imported by guest (runtime) code.

export { bakeAtlases } from "@pocket-internal/framework/compiler/bake-font.ts";
export {
  type DecodedImage,
  decodePng,
  encodeImageEntry,
  KEY_STYLES,
  keyFont,
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
export {
  createWasmUi,
  FB_H,
  FB_W,
} from "@pocket-internal/hosts/web/wasm-ops.js";
export { HeadlessChrome } from "@pocket-internal/tools/headless-chrome.ts";

/** Absolute directory of the installed @pocketjs/framework package. */
export const FRAMEWORK_ROOT = new URL(
  "../../node_modules/@pocketjs/framework/",
  import.meta.url,
).pathname;
