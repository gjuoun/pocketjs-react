// Build-time and test-time counterpart of pocket.ts: PocketJS compiler, font baker, pak
// writer, the wasm core binding and the headless Chrome driver, imported by path from the
// pinned @pocketjs/framework package. Never imported by guest (runtime) code.

import { existsSync } from "node:fs";
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
import { registerAnimationTheme } from "@pocket-internal/framework/compiler/animation.ts";
import { ANIMATION_THEME } from "./animation-theme.ts";

// The app's timelines (spin-arc) are registered once, before any class literal compiles: every consumer of this module
// (the build, the tests, the judge) compiles through the same theme. Registering again would reset the baked table.
registerAnimationTheme(ANIMATION_THEME);

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

/**
 * The web host directory of the core root. The upstream layout keeps the binding and the wasm in
 * platforms/web; the pinned npm package keeps them in hosts/web. Detected by the binding file.
 */
const WEB_HOST_DIRS = ["platforms/web/", "hosts/web/"] as const;
const webHostRel = WEB_HOST_DIRS.find((dir) =>
  existsSync(FRAMEWORK_ROOT + dir + "wasm-ops.js"),
);
if (!webHostRel) {
  throw new Error(
    `no wasm-ops.js under ${FRAMEWORK_ROOT} (looked in ${WEB_HOST_DIRS.join(", ")})`,
  );
}
/** The web host directory of the selected core root. */
export const WEB_HOST_DIR = FRAMEWORK_ROOT + webHostRel;
/** The core's prebuilt wasm, beside its binding. */
export const WEB_WASM_PATH = WEB_HOST_DIR + "pocketjs.wasm";
/** The host page's own assets: upstream keeps app-instance.js in programs/web, the npm package beside the binding. */
export const WEB_PAGE_DIR = existsSync(
  FRAMEWORK_ROOT + "programs/web/app-instance.js",
)
  ? FRAMEWORK_ROOT + "programs/web/"
  : WEB_HOST_DIR;

/**
 * Directories a browser host page is served from, in lookup order: the page's own assets (upstream
 * programs/web, or the npm package's hosts/web), the binding directory (the wasm), then the core root
 * (the binding imports its modules from the root, e.g. /engine/guest-web/).
 */
export const WEB_HOST_SEARCH: readonly string[] = [
  WEB_PAGE_DIR,
  WEB_HOST_DIR,
  FRAMEWORK_ROOT,
];

/**
 * The playground page the stock browser run drives (its demo picker and virtual buttons): upstream keeps it under
 * programs/web/dev with its engine module; the npm package keeps index.html and engine.js beside the binding.
 */
export const WEB_PLAYGROUND: { page: string; engine: string } = existsSync(
  FRAMEWORK_ROOT + "programs/web/dev/engine.js",
)
  ? {
      page: "programs/web/dev/index.html",
      engine: "/programs/web/dev/engine.js",
    }
  : { page: "index.html", engine: "/engine.js" };

/** The file a host-page URL path (relative, no leading slash) resolves to; the first existing candidate wins. */
export function webHostFile(rel: string): string {
  return (
    WEB_HOST_SEARCH.map((dir) => dir + rel).find((file) => existsSync(file)) ??
    WEB_PAGE_DIR + rel
  );
}

const host = (await import(
  pathToFileURL(WEB_HOST_DIR + "wasm-ops.js").href
)) as typeof WebOps;

export { HeadlessChrome } from "@pocket-internal/tools/headless-chrome.ts";

export const createWasmUi = host.createWasmUi;
export const FB_H = host.FB_H;
export const FB_W = host.FB_W;
