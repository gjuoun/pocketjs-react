// pocketjs-react public surface.

// Textures: an app that ships pak `ui:img.*` entries registers them at boot on
// hosts that can upload textures, then draws them with <Image src={id}/>.
// Re-exported from the pinned framework instance this package uses, so the app
// and the renderer share one texture table (a second framework copy would
// register into a map nobody reads).
export { getOps, registerTexture } from "@pocketjs/framework";
// Persistence: the host's fs SDK, re-exported so an app repo outside this one can save state.
// The browser host page backs it with localStorage; a host that mounts no fs reports null.
export {
  existsSync,
  file,
  fsHost,
  PocketFile,
  rmSync,
  write,
} from "@pocketjs/framework/fs";
export { BTN } from "@pocketjs/framework/input";
export { entries as pakEntries, get as pakGet } from "@pocketjs/framework/pak";
export {
  bakedGlyphs,
  bundledAsset,
  bundledAssetNames,
} from "./books/assets.ts";
export type { Block } from "./books/blocks.ts";
export { type EpubBook, openEpub, type TocEntry } from "./books/epub.ts";
export { type HostBook, useHostBook } from "./books/host.ts";
export {
  type BookEntry,
  bundledBooks,
  type FileBooks,
  fileBooks,
  openedBook,
} from "./books/source.ts";
// DOM compat (C1): React DOM tags mount on the native tree; what the layer drops or
// cannot map is counted here instead of crashing or disappearing silently.
export {
  type CompatOptions,
  type CompatStats,
  compatStats,
  resetCompatStats,
} from "./compat/index.ts";
export { Dialog, type DialogProps } from "./components/Dialog.tsx";
export { Grid, type GridProps } from "./components/Grid.tsx";
export { LIST_ITEM_CLASS, List, type ListProps } from "./components/List.tsx";
export { Menu, type MenuItem, type MenuProps } from "./components/Menu.tsx";
export { Tabs, type TabsProps } from "./components/Tabs.tsx";
export {
  Image,
  type PocketCSSProperties,
  type PocketHostProps,
  type PocketImageProps,
  Text,
  View,
} from "./elements.ts";
export { FocusScope, type FocusScopeProps } from "./focus/FocusScope.tsx";
export { useButton } from "./input/buttons.ts";
export { takeHostMessages } from "./input/pointer.ts";
export { missingCharacters, missingNotice } from "./reader/coverage.ts";
export {
  createGlyphWarmer,
  hasRuntimeGlyphs,
  useGlyphWarmup,
  WARM_CHUNK,
} from "./reader/glyph-warmer.ts";
export { PageView } from "./reader/PageView.tsx";
export {
  type Anchor,
  anchorOf,
  FONT_SIZES,
  type FontSize,
  type Line,
  type Pages,
  paginate,
} from "./reader/paginate.ts";
export {
  loadState,
  type ReaderState,
  type SavedPosition,
  saveState,
  stateIsPersistent,
} from "./reader/state.ts";
export { type MountOptions, mount } from "./renderer/mount.ts";
export { useFrame } from "./renderer/use-frame.ts";
export { cjkSafe, hasHan } from "./style/cjk.ts";
export { cn } from "./style/cn.ts";
export {
  NO_LINE_END,
  NO_LINE_START,
  type WrappedLine,
  wrapParagraph,
} from "./text/wrap.ts";
