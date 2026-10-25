// The ONLY runtime module that imports @pocketjs/framework files outside its public
// `exports`. PocketJS does not publish raw native-node creation, the per-frame input
// loop, the class-string resolver or the class compiler, so a third-party React renderer
// imports them by path. The package version is pinned exactly in package.json; when an
// upgrade moves any of these, imports fail here (and in bun test) instead of at runtime.
import "@pocket-internal/framework/src/scheduler-polyfill.ts";

export {
  decodeStyleTable,
  ENUMS,
  encodeStyleTable,
  NODE_TYPE,
  PROP,
  PROP_VALUE_KIND,
  type PropName,
  SCREEN_H,
  SCREEN_W,
  SIZE_FULL,
  STYLE_ID_NONE,
  type StyleRecord,
  VALUE_KIND,
} from "@pocket-internal/contracts/spec/spec.ts";
export {
  parseClassLiteral,
  unknownUtilities,
} from "@pocket-internal/framework/compiler/tailwind.ts";
export {
  handleFrame,
  setHitRoot,
  setInputRoot,
} from "@pocket-internal/framework/src/input.ts";
export {
  applyProps,
  createElement,
  createTextNode,
  insertNode,
  missCounters,
  type NodeMirror,
  registerTexture,
  removeNode,
  replaceText,
  resetRendererState,
  resolveTexture,
  rootMirror,
  runSweep,
  setDebugName,
  setProp,
  setStyleResolver,
} from "@pocket-internal/framework/src/native-tree.ts";
export {
  registerStyles,
  resetStyles,
  resolveStyle,
} from "@pocket-internal/framework/src/styles.ts";
