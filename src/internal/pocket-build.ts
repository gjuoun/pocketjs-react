// Build-time and test-time counterpart of pocket.ts: PocketJS compiler, font baker, pak
// writer, the wasm core binding and the headless Chrome driver, imported by path from the
// pinned @pocketjs/framework package. Never imported by guest (runtime) code.
export {
  DEFAULT_FONT_SLOT,
  MONO_FONT_PX,
  compileClasses,
  fontSlotFor,
  generateStylesModule,
  suspectClassLiteral,
  unknownUtilities,
} from "@pocket-internal/framework/compiler/tailwind.ts";
export { bakeAtlases } from "@pocket-internal/framework/compiler/bake-font.ts";
export { KEY_STYLES, PAK_DTYPE, keyFont, pack } from "@pocket-internal/framework/compiler/pak.ts";
export { createWasmUi, FB_H, FB_W } from "@pocket-internal/hosts/web/wasm-ops.js";
export { HeadlessChrome } from "@pocket-internal/tools/headless-chrome.ts";

/** Absolute directory of the installed @pocketjs/framework package. */
export const FRAMEWORK_ROOT = new URL("../../node_modules/@pocketjs/framework/", import.meta.url).pathname;