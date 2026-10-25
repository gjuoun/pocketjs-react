# pocketjs-react

React on [PocketJS](https://github.com/pocket-nexus/pocketjs): a UI framework base for screens driven by a d-pad and a few buttons.

> Early exploration. Unofficial: not affiliated with or endorsed by Pocket Nexus.

![The e-book reader app: an English book, then a Chinese book](./docs/demo.gif)

[Full-quality video](./docs/demo.mp4)

The demo above shows an English and a simplified Chinese book in the macOS app.

## What exists

- **Renderer** — real `react` (19.3.1) through a custom `react-reconciler` (0.34.0) renderer that writes PocketJS's native View/Text/Image tree. No DOM, no CSS engine, no WebView.
- **Tailwind + clsx + cn** — `className` takes any string React code builds: literals, ternaries, `clsx(...)`, `cn(...)` (clsx + tailwind-merge). Each class combination becomes a native style record, so `focus:`, `active:` and transitions stay native.
- **Inline styles** — the standard React `style` prop with camelCase CSS names, mapped to the core's properties.
- **D-pad input** — `FocusScope` (traps focus, restores it on close) and `useButton` (face and shoulder buttons, innermost handler wins), built on PocketJS's own focus manager. Confirm = CIRCLE, back = CROSS.
- **DOM compat (C1)** — plain React DOM tags mount: `div/section/main/header/footer/nav/aside/ul/ol/li` → view, `span/p/label/strong/em/code/pre/h1..h6` → text, `button/a` → focusable view (CIRCLE presses), `input`/`textarea` are editable text entries with a d-pad keyboard (C4). DOM-only props (`data-*`, `aria-*`, `type`, `disabled`, …) are dropped and counted, `onClick` becomes a press. See "DOM compat" below.
- **Semantic token map (C2)** — shadcn's semantic colors and utilities (`bg-primary`, `text-muted-foreground`, `border-input`, `hover:` …) are rewritten onto the fixed 19-family palette at build and run time, so verbatim shadcn components render styled instead of unstyled-but-correct. What the map drops is counted in `compatStats().tokenMap`. See "Semantic token map (C2)" below.
- **Vendored shadcn (C3)** — registry source lands in the app tree and one compiler-aware codemod rewrites it into PocketJS vocabulary (`unknownUtilities()` at generation time), so button/badge/input/card render styled and the Radix dialog reports its Portal limit honestly. See "Vendor + codemod (C3)" below.
- **Components** — `List` (d-pad-operable rows, optionally a scrolling window), `Dialog` (portaled overlay that traps focus and closes on back), `Grid` (row/column d-pad movement), `Tabs` (shoulder buttons switch, focus remembered per tab) and `Menu`.
- **Mouse as a second layer** — a click focuses and presses what it points at, through the same focus system (an open dialog keeps clicks behind it inert).
- **Per-frame hook** — `useFrame(cb)` runs once per host frame with a 0-based counter (the React counterpart of the framework's frame pump), for games and animations.
- **E-book reader example** — `examples/reader`: an EPUB reader with the Bitcoin whitepaper bundled, which also reads Chinese EPUBs on both hosts (see below).
- **ASCII animation example** — `examples/ascii-anim`: a 40×18 monospace plasma (`text-xs font-mono`) redrawn every frame; CROSS pauses and restarts. Measured by `bun run measure:web --app=ascii-anim`.
- **macOS app** — `bun run build:app` packages the reader and the desktop host as a double-clickable, ad-hoc-signed `PocketReader.app` that opens an EPUB from disk (see below).
- **Build** — `tools/build.ts` turns TSX and Tailwind class strings into one guest bundle and a `.pak` (styles + baked font atlases), using PocketJS's own compiler.
- **Two hosts** — the browser WASM host and the macOS desktop host. Both run the same example with measured numbers (below).

Not here yet: handhelds and phones, touch input, toggles, geometric spatial navigation (the core has no node-rect query), and full Tailwind (see the inventory).

## Quick start

```sh
bun install
bun run typecheck
bun test                                          # every suite runs on the real PocketJS wasm core
bun run build examples/list-dialog/main.tsx       # dist/list-dialog.js + dist/list-dialog.pak
bun run measure:web                               # example in the browser host (headless Chrome)
POCKETJS_ROOT=../pocketjs bun run measure:desktop # example on the macOS desktop host
POCKETJS_ROOT=../pocketjs bun run measure:desktop-shot
```

The desktop host is not part of the npm package. Clone [PocketJS](https://github.com/pocket-nexus/pocketjs) next to this repo at the version pinned in `package.json`, run `bun install && bun run macos hero --build-only` there once, and point `POCKETJS_ROOT` at it. The measure scripts refuse a checkout whose version differs from the pinned package.

```tsx
import { useState } from "react";
import { clsx } from "clsx";
import { cn, Dialog, List, mount, Text, View } from "pocketjs-react";

function App() {
  const [on, setOn] = useState(false);
  return (
    <View className="w-full h-full flex-col p-4 bg-slate-900">
      <View
        className={cn(
          "px-3 py-1 rounded-lg bg-slate-800 focus:bg-blue-600",
          on && "px-6 bg-emerald-700",
        )}
        focusable
        onPress={() => setOn((v) => !v)}
      >
        <Text className={clsx("text-sm text-white", { "font-bold": on })}>
          Toggle
        </Text>
      </View>
      <View className="w-[120px] h-[10px] bg-slate-700">
        <View
          style={{
            width: on ? 120 : 20,
            height: 10,
            backgroundColor: "#22c55e",
          }}
        />
      </View>
    </View>
  );
}

mount(<App />);
```

`View`, `Text` and `Image` are the host elements. React's DOM typings already claim lowercase `view`/`text`/`image` for SVG, so they are exported as components. At runtime each one is the host type string, with no wrapper.

## E-book reader

```sh
bun run build:reader      # dist/reader.js + dist/reader.pak, with the whitepaper EPUB bundled
bun run serve:reader      # browser host page: http://127.0.0.1:8140/ (file picker, saved state, mouse)
bun tools/web/shots.ts    # screenshots of library, contents and two reading pages in headless Chrome
POCKETJS_ROOT=../pocketjs bun run measure:desktop -- --app reader
```

- **Screens** — library (Bundled / Files tabs), contents, reading view, and a START menu with settings (font size S/M/L, light/dark).
- **Controls** — the d-pad moves focus, CIRCLE confirms, CROSS goes back. In the reading view LEFT/RIGHT turn pages, UP/DOWN scroll three lines and L/R switch chapters. A mouse click presses what it points at; clicking the left or right half of a page turns it.
- **Keys** — desktop: arrows, X = CIRCLE, Z = CROSS, Q/W = L/R, Space = START. Browser host page: arrows, Enter/Z = CIRCLE, X = CROSS, Q/E = L/R, Space = START.
- **Formats** — EPUB (2 and 3, reflowable). Chapters are read lazily: opening a book inflates only its package files. Images in books are shown as their caption or alt text. PDF, TXT and Markdown are not supported yet.
- **Where books come from**:
  - Bundled: `tools/build.ts --asset name=file.epub` embeds a book in the app.
  - Files (browser host page): EPUBs picked with the page's file input appear under `books/`.
  - The desktop host mounts no file system for apps. It shows bundled books, plus the one book the macOS app's launcher hands it at launch (see below).
- **Saved state** — font size, theme and the reading position per book are saved where the host offers a writable file system (the browser host page, backed by localStorage), and the app reopens on the saved page. On the desktop host they last for the session.
- **Characters** — book text arrives at runtime, so the build bakes ASCII, Latin-1, General Punctuation and every character of the bundled book (`--glyphs`). Chinese, Japanese and Korean text is covered per host (next section).
- **Bundled book** — _Bitcoin: A Peer-to-Peer Electronic Cash System_ (Satoshi Nakamoto, 2008), an EPUB 3 edition built in this repo from the PDF distributed by bitcoin.org under the MIT licence. Figures are described by captions. Source, hashes and licence: [assets/books/NOTICE.md](./assets/books/NOTICE.md).

Measured with the minified reader, 3 runs per host, on the same machine as below:

| Host                         | Command                                                             | First render | Page turn (median / max) | Chapter switch | Opening a chapter |
| ---------------------------- | ------------------------------------------------------------------- | ------------ | ------------------------ | -------------- | ----------------- |
| Browser WASM host            | `bun run measure:web -- --app reader`                               | 20.8–21.4 ms | 0.7–1.1 / ≤2.7 ms        | 1.7–2.3 ms     | 2.1–5.8 ms        |
| macOS desktop host (QuickJS) | `POCKETJS_ROOT=../pocketjs bun run measure:desktop -- --app reader` | 30.6–31.4 ms | 4.2–4.4 / ≤10.0 ms       | 9.8–10.3 ms    | 12.9–17.6 ms      |

Reader bundle 302,067 bytes minified (110,981 gzip); pak 907,760 bytes (eight font slots with Latin-1 and punctuation).

### Chinese text

Each host draws CJK text its own way, picked by measurement (no PocketJS change):

| Host               | How                                                                                                                                                                                               | Coverage                                                                                                                                 | Cost                                                                                                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Browser host page  | The page runs the app through the npm package's `hosts/web/app-instance.js` with `text.glyphs.runtime`: a character no atlas has is drawn with the browser's fonts the first time it is measured. | Any script the browser has a font for.                                                                                                   | No pak growth. A cold first chapter of ~1,000 new characters takes one 250–500 ms frame; the next chapter's characters are warmed while reading (≤50 per frame), so a chapter switch is ~30 ms. |
| macOS desktop host | `bun run build:reader -- --cjk` bakes a fixed set into the body slots (S/M/L, regular weight) from a committed Noto Sans SC subset.                                                               | 8,836 hanzi (GB2312 levels 1+2 ∪ Big5 level 1: simplified and traditional) plus 215 CJK punctuation, full-width and compatibility forms. | Reader pak 0.91 MB → 9.95 MB; host start-up to ready measured the same as without it (probe).                                                                                                   |
- **Coverage of a real novel** — _三國志演義_ (traditional, 4,107 distinct hanzi): the baked set covers **99.53 %** of its hanzi occurrences (3,857 of 4,107 distinct). A simplified-only set covers 71.4 % (GB2312 1+2) or 68.8 % (GB2312 level 1), which is why the set is the union.
- **Missing characters** — where glyphs are baked, a character outside the set draws as the core's placeholder box, and the reading view's footer says `N characters cannot be shown on this host`. Chapter 1 of the novel has 10 such characters (rare names) on the desktop build. The browser page never shows the footer.
- **Text rules** — a line break in the source between two CJK characters is dropped instead of becoming a space (EPUBs often keep a source's hard wraps). No line starts with closing punctuation (`，。、；：？！」』）》〉】…`) and none ends with an opening bracket: the character moves down a line, and the rest is wrapped again, so lines still fit.
- **Weights** — Han text draws in regular weight: bold slots carry no CJK (it would double the pak), so `cjkSafe(className, text)` drops `font-bold` from Han titles and headings. Per mille signs (‰ ‱) are left out of the CJK slots, because an atlas cell is as wide as its widest glyph.
- **Not supported** — vertical text, ruby, regional glyph variants (one SC rendition), CJK weights other than regular, GBK/Big5-encoded files.
- **Fonts and test book** — Noto Sans SC (SIL OFL 1.1), subset reproducibly from a pinned upstream commit: [assets/fonts/NOTICE.md](./assets/fonts/NOTICE.md). The Chinese test book is chapters 1–3 of Project Gutenberg #23950, public domain in the US: [test/fixtures/books/NOTICE.md](./test/fixtures/books/NOTICE.md).

```sh
bun run build:reader -- --cjk                    # desktop build with the CJK set baked
bun tools/web/shots.ts --book test/fixtures/books/sanguo.epub   # Chinese book picked on the browser page
bun run measure:web -- --app reader-cjk          # both hosts, with the Chinese book bundled
POCKETJS_ROOT=../pocketjs bun run measure:desktop -- --app reader-cjk
```

| Host (`--app reader-cjk`, 3 runs)  | First render | Opening chapter 1        | Page turn (median) | Chapter switch |
| ---------------------------------- | ------------ | ------------------------ | ------------------ | -------------- |
| Browser host page (runtime glyphs) | 38.4–39.1 ms | 254–269 ms (cold glyphs) | 0.7–0.8 ms         | 3.5–9.4 ms     |
| macOS desktop host (baked set)     | 46.3–46.8 ms | 30.6–33.1 ms             | 2.0–2.6 ms         | 30.2–38.0 ms   |

## macOS app (desktop host)

```sh
POCKETJS_ROOT=../pocketjs bun run build:app   # dist/PocketReader.app
open dist/PocketReader.app                    # or double-click it in Finder
```

`PocketReader.app` runs the reader on PocketJS's own desktop host: a Metal window with a QuickJS guest, and no WebView. The bundle is about 12.7 MB.
- **Bundle contents**:
  - `Contents/MacOS/PocketReader` — a shell launcher, the bundle's executable.
  - `Contents/MacOS/pocket-desktop-host` — the host built in `POCKETJS_ROOT`, copied unchanged (the build checks the hash).
  - `Contents/Resources/` — `reader.js`, `reader.pak` and `AppIcon.icns`.
- **Opening a book** — at launch the app asks for an EPUB with the system file chooser. The host reads `--file` as text, so the launcher sends the EPUB as base64 text. The reader decodes it and opens the book at its contents. Cancel the chooser to get the library with the bundled book. One book per launch: to read another, quit and open the app again.
- **Signature** — ad-hoc (`codesign -s -`), which is enough on the Mac that built it. There is no Developer ID signature and no notarization, so on another Mac Gatekeeper refuses it until it is opened with right-click → Open.

How large a book survives that delivery was measured with one window per run. Each EPUB was the bundled book plus an incompressible stored file, the way image-heavy books are large. The pad is never inflated, so these numbers measure transport and decoding, not parsing:

| EPUB  | Arrived intact | Decode (base64 → bytes) | Open (package files) | Peak memory (host process) |
| ----- | -------------- | ----------------------- | -------------------- | -------------------------- |
| 1 MB  | yes            | 131–137 ms              | 2.0 ms               | 99 MB                      |
| 5 MB  | yes            | 670 ms                  | 2.1 ms               | 126 MB                     |
| 20 MB | yes            | 2.7 s                   | 2.3 ms               | 226 MB                     |

Decoding costs about 134 ms per MB in QuickJS. It happens once, in the first frames, so a 20 MB book shows its contents after about 2.7 s. Through the built app, launched the same way a double-click does, a 17 KB EPUB opened in 4.2 ms and the 20 MB one in 2.7 s.

Known gaps on the desktop host, from its source and the runs above:

| Area          | State                                                                                                                                                                                                                                               |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Menu bar      | 🟡 the default menu of the host's windowing library only. No app-specific menus.                                                                                                                                                                    |
| File chooser  | 🟢 at launch, from the launcher (`osascript`). Not available once the window is open.                                                                                                                                                               |
| Drag and drop | 🔴 the host has no dropped-file handler. Dropping onto the window does nothing. Dock-icon drop and "Open With" would need a native launcher, not a shell script.                                                                                    |
| Dark mode     | 🟡 the reader's own light/dark setting. The host does not forward the system appearance.                                                                                                                                                            |
| Window size   | 🟢 fixed 480×272 viewport at 2× density, which is the size the reader paginates for. macOS may show the window slightly smaller than requested (432×275 points for 480×272). A plain AppKit window shows the same scaling, so this is not the host. |
| IME           | 🟢 the host handles composition (preedit/commit) events. The reader has no text input.                                                                                                                                                              |

## The className rule

Write Tailwind utilities as on the web: static strings, ternaries, template literals, `clsx(...)` and `cn(...)` all work.

**The one limit is Tailwind's own: every utility name must appear as a complete token somewhere in the source** (`p-4`, `bg-blue-600`, `w-[120px]`). A name assembled at runtime, such as `` `p-${n}` `` or `"w-[" + n + "px]"`, cannot be found by the build scan. It is not supported. On the browser host it throws with the token named; on the desktop host it is reported and dropped. Use a lookup of complete names instead, or the `style` prop for values that are truly dynamic.
- **Conflicts** — the last utility in the string wins. `cn` (clsx + tailwind-merge) removes conflicting earlier utilities, so it gives the same result as on the web.
- **Variants** — `focus:` and `active:` are applied natively. `hover:` is an error (there is no pointer yet).
- **Fonts** — text sizes and weights are baked atlases. The build bakes every size × weight pair whose tokens appear in the source, so `cn("text-sm", bold && "font-bold")` draws.
- **How it works** — the build compiles every complete class string into a style table. At runtime any other combination of source tokens is compiled by PocketJS's own Tailwind compiler, appended to the table, and loaded once per React commit.

### Supported utilities (PocketJS compiler subset)

| Family    | Utilities                                                                                                                                                                                                                       |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Layout    | `flex flex-row flex-col flex-wrap flex-1 grow grow-0 shrink-0 basis-N gap-N justify-{start,center,end,between,around} items-{start,center,end,stretch} hidden overflow-hidden`                                                  |
| Box       | `w-/h-{N,full,[px]} min-w/min-h/max-w/max-h-N p/px/py/pt/pr/pb/pl-N m/mx/my/mt/mr/mb/ml-N absolute relative inset/top/right/bottom/left-N z-N`                                                                                  |
| Visual    | `bg-{color} bg-gradient-to-{t,b,l,r} from-/via-/to-{color} rounded rounded-{sm,md,lg,xl,[N]} rounded-full` (needs `w-N h-N` in the same string) `border border-{2,4,8,[N]} border-{color} opacity-N shadow shadow-md shadow-lg` |
| Text      | `text-{color} text-{2xs,xs,sm,base,lg,xl,2xl,4xl,5xl} font-bold font-mono text-{left,center,right} leading-N tracking-wide`                                                                                                     |
| Transform | `translate-x/y-N scale-N scale-x/y-N rotate-N origin-* perspective-[N] rotate-x/y-[N] translate-z-[N] skew-x-[N]`                                                                                                               |
| Motion    | `transition transition-{all,colors,opacity,transform} duration-N delay-N ease-{linear,in,out,in-out,spring,out-back}`                                                                                                           |

Spacing is N × 4 px. Arbitrary values `[Npx]` work on every numeric utility (negatives only in arbitrary form). Colors are the 19 Tailwind v3 families × 11 shades, white/black/transparent, and arbitrary `[#rgb]`/`[#rrggbb]`/`[#rrggbbaa]`.

**Not supported** (examples):
- responsive and state variants (`sm:`, `dark:`, `group-*`, `disabled:`);
- grid, `*-reverse`, `self-*`, `order-*`, fractions (`w-1/2`), `w-auto`, `space-*`;
- per-side borders, per-corner radius, `ring-*`, `shadow-sm/xl`, opacity modifiers (`bg-blue-600/50`), `neutral`/`stone`;
- font weights other than bold, italic, decoration, `truncate`;
- filters, background images, `fixed`/`sticky`, scrolling.

Most of these need new drawing features in the PocketJS core (it lays out with flexbox only and draws rects, gradients, rounded rects, inset borders, four baked shadows, baked bitmap fonts, images and transforms), not something this repo can add on its own.

## DOM compat

JSX written with plain React DOM tags runs on the native tree, so components written in DOM vocabulary (for example shadcn/ui sources) mount without rewriting their tags:

| DOM tag                                                               | Mounts as                                                                      |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `div` `section` `main` `header` `footer` `nav` `aside` `ul` `ol` `li` | view                                                                           |
| `button` `a`                                                          | view + focusable (`onClick` fires on CIRCLE or a click; `a` navigates nowhere) |
| `span` `p` `label` `strong` `em` `code` `pre` `h1`–`h6`               | text                                                                           |
| `input` `textarea`                                                    | view + text entry: value/onChange/placeholder (C4, see "Text input (C4)")       |

Each mapped element carries its DOM tag as its `debugName`, so DevTools and errors still say `button`. Tags outside the table throw, naming the tag and the table.

**Props** land in one of four buckets: `onClick` aliases to `onPress`; `data-*`/`aria-*` and the DOM surface PocketJS has no answer for yet (`role`, `id`, `type`, `disabled`, `tabIndex`, `href`, `value`, `onChange`, `onFocus`, …) are **dropped and counted**; the PocketJS surface (`className`, `style`, `focusable`, `onPress`, `debugName`, `ref`) passes through; anything unrecognized **throws by default** — pass `mount(el, { compat: { unknownProps: "drop" } })` to drop and count instead. Note a dropped `disabled` still focuses and presses (no disabled semantics yet).

**What the layer accepted is inspectable**: `compatStats()` reports dropped and unknown attrs per name, unknown tags, and class-miss counts (`resetCompatStats()` clears). Nothing disappears silently.

**shadcn-style class strings** are mapped since C2 (next section): the fixed table rewrites them at build time and again at run time, and what it drops is counted. `mount(el, { compat: { classMiss: "drop" } })` stays as the safety net for tokens neither the map nor the compiler knows — it keeps the supported subset, counts the rest and never crashes the browser host.

### Semantic token map (C2)

shadcn's vocabulary is rewritten through one fixed table (`src/compat/tokens.ts`), used twice: `tools/build.ts` rewrites every scanned literal before compiling the style table, and the runtime rewrites an incoming `className` the same way before resolving it, so a runtime rewrite is an exact table hit (a `twMerge` reorder falls back to the runtime compiler). Values are fixed — the existing 19-family Tailwind v3 palette, one light theme, no build-time theme table and no dark variant.

| shadcn                                                                                                     | PocketJS           | shadcn                        | PocketJS           |
| ---------------------------------------------------------------------------------------------------------- | ------------------ | ----------------------------- | ------------------ |
| `bg-background` `bg-card` `bg-popover`                                                                     | `bg-white`         | `bg-primary`                  | `bg-slate-900`     |
| `text-foreground` `text-primary` `text-card-foreground` `text-popover-foreground` `text-accent-foreground` | `text-slate-900`   | `text-primary-foreground`     | `text-white`       |
| `bg-secondary`                                                                                             | `bg-slate-200`     | `text-secondary-foreground`   | `text-slate-900`   |
| `bg-muted`                                                                                                 | `bg-slate-100`     | `text-muted-foreground`       | `text-slate-500`   |
| `bg-accent`                                                                                                | `bg-slate-200`     | `bg-destructive`              | `bg-red-600`       |
| `bg-border`                                                                                                | `bg-slate-200`     | `text-destructive-foreground` | `text-white`       |
| `border-border` `border-input`                                                                             | `border-slate-200` | `border-ring`                 | `border-slate-900` |

Utilities: `inline-flex` → `flex`, `font-medium`/`font-semibold` → `font-bold`, `size-N` → `w-N h-N`, `shadow-xs` → `shadow`, `rounded-xs` → `rounded-sm`, `transition-[color,box-shadow]` → `transition-colors`, `leading-none` → `leading-[1]`, `h-px` → `h-[1px]`, `-mx-1` → `mx-[-4px]`, `overflow-x-hidden` → `overflow-hidden`, `tracking-tight`/`tracking-widest` → `tracking-wide`.

States: `hover:` → `active:` (the press cue; PocketJS has no pointer), `focus-visible:` → `focus:`, `focus:`/`active:` pass through, `/NN` opacity modifiers are stripped. `dark:`, `disabled:`, `aria-*`, `data-*`, `sm:`/`md:`, `file:`, `placeholder:`, `has-[…]`, `[&…]` and `[a&]` are dropped and counted — a fixed light palette has no second theme and the core has no such state.

Dropped on purpose (counted, not silently kept): `w-fit`, `whitespace-nowrap`, `outline-none`, `ml-auto`, `cursor-default`, `fill-current`, `underline`/`underline-offset-4`, `rounded-full` (it compiles only with a pinned `w-N h-N` in the same literal, so a badge is not a pill) and `ring-*` (the core draws no ring; same gap as the Dialog's `fixed`/`grid`/`calc()`).

`mount(el, { compat: { tokenMap: false } })` turns the runtime rewrite off; `compatStats().tokenMap` reports `{ mapped, dropped }` so nothing disappears silently.

Text color inheritance (JG-156): after each commit the compat layer gives every top-most text run that sets no color of its own the nearest ancestor color, or the mount default `compat.textColor` (`#0f172a`, slate-900; `null` turns the pass off). A node with its own color, or a `focus:`/`active:` text variant, stays native. Fills are unaffected; the table above is the mapping.

Flex text tags (`span`/`p`/`label` with `flex`) are views, and a run under one is held by a text element that carries its size and weight. A run font is one baked slot per size x weight, so a combination compiles only when the build baked it (the build bakes the cross product of the source size and weight tokens).

## Vendor + codemod (C3)

Real shadcn registry source can live in the app tree and render without a runtime shim: vendor the
files, run one codemod, build. The codemod is **compiler-aware** — it asks PocketJS's own
`unknownUtilities()` what the core can draw — so a token the compiler rejects is removed _in the
source_ and reported by name, instead of reaching the strict web host and throwing.

### The flow

```sh
bun tools/codemod/fetch-shadcn.ts             # registry -> test/fixtures/shadcn-vendor/upstream
bun run codemod:shadcn                        # upstream -> ui (generated, committed)
bun run build:shadcn-vendor                   # -> dist/shadcn-vendor/{js,pak}
bun run serve:shadcn-vendor                   # browser host at http://127.0.0.1:8140
```

The reference consumer app is `test/fixtures/shadcn-vendor/`:

| Path                   | What it is                                                                              |
| ---------------------- | --------------------------------------------------------------------------------------- |
| `upstream/`            | the registry payloads, verbatim; only import specifiers are remapped                    |
| `NOTICE.md`            | registry URL, bytes and sha256 per file; `fetch-shadcn.ts --verify` checks them offline |
| `ui/`                  | codemod output, committed and never hand-edited — `--check` fails on drift              |
| `app.tsx` / `main.tsx` | the consumer demo: button, badge, input, card and the Radix dialog                      |

Five components are vendored (button, badge, input, card, dialog).
`test/codemod-shadcn.test.ts` pins the committed `ui/` to the codemod output, the idempotency and
the diagnostics; `test/shadcn-vendor.test.tsx` builds the demo and asserts what the host draws,
including a mount under `{ classMiss: "throw", tokenMap: false }` — the proof that the rewritten
source needs neither the C2 map nor the drop policy.

### Rules

| Rule | Change                                                                                                  | Reason                                                                                                                                                                                  |
| ---- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R0   | `rounded-full` → `rounded-[Npx]`                                                                        | a pill is `min(w,h)/2`; N comes from `h-N` (2N) or `py-N` + `text-*` (a badge lands on 10px). The C2 map drops the token, because the [R] rule needs a pinned size in the same literal. |
| R1   | the C2 map                                                                                              | one table for build, runtime and codemod (`src/compat/tokens.ts`)                                                                                                                       |
| R2   | `grid` → `flex flex-col`, `flex-col-reverse` → `flex-col`, `sr-only` → `hidden`, `@container/*` dropped | the core lays out with flexbox; a one-column grid stacks                                                                                                                                |
| R3   | `unknownUtilities()` filter                                                                             | the build-time capability probe the C2 map cannot do                                                                                                                                    |
| R4   | `asChild ? Slot.Root : "tag"` → `"tag"`; the `Slot` import and `asChild` plumbing go away               | C1 F1 policy; a real Slot (and asChild semantics) is C5                                                                                                                                 |
| R5   | an all-dropped literal becomes `""`                                                                     | `cn("", className)` is harmless                                                                                                                                                         |

Class positions are structural, not "anywhere under `cva`": `cva`'s base and its `variants`
values, `cn`/`clsx`/`twMerge` arguments, and JSX `className`. `defaultVariants` holds values, not
class strings — the codemod's first false positive, now pinned by a test. Only string spans are
rewritten, so every other byte of a vendored file is untouched and a second run is a no-op.

`bun tools/codemod/shadcn.ts <src> <out> [--report] [--json] [--check]` reports, per file, the
literal count and the tokens it mapped, substituted, dropped by the map, dropped by the compiler,
flattened from `asChild`, emptied and skipped, plus any residual. For the vendored five:
`40 literals, 39 changed, 50 mapped, 2 asChild, 0 residual`; `fixed`×2, `shadow-sm`,
`col-start-2` and friends are dropped by name, and `grid`/`sr-only`/`rounded-full` are substituted
by name.

### What it does not do

- **Dialog content needs the native primitives.** Radix's Portal needs a document body the guest does
  not have, so the vendored dialog, dropdown menu and select import from `pocketjs-react/radix` instead
  (C5, see "Overlays (C5)"). `fixed`/`grid`/`calc()`/percentage offsets are C10.
- **Icons.** `lucide-react`'s `<path d>` is still an unknown prop; icons are C7.
- **Text color inheritance** is a compat pass (JG-156), not a core feature: a view's text takes the
  nearest ancestor's color, the mount default otherwise. Inline styles and class variants on the text
  itself still win (see 'Text color inheritance' under the utilities table).
- **`hover:`** still maps to the press cue `active:`; there is no pointer.

The demo needs `radix-ui`, `lucide-react` and `react-dom` as dev dependencies (the fixture only);
its bundle carries the Radix dialog even though the content never mounts.

## Overlays (C5)

The vendored shadcn `dialog`, `dropdown-menu` and `select` render their content through native
primitives instead of Radix. The codemod rewrites only the import edge (rule R6):
`from "radix-ui"` becomes `from "pocketjs-react/radix"`, which exports `Dialog`, `DropdownMenu` and
`Select` under Radix's member names. The JSX, the props and the class strings are unchanged, so the
vendored `ui/` files need no structural rewrite. Lucide icons take the same route (R7) to
`pocketjs-react/glyph-icons`.

Why not a Portal shim: Radix's `Portal` imports `react-dom` and returns null without `document.body`,
and the content depends on `DismissableLayer`, `FocusScope`, `Presence`, `Popper` and Select's pointer
and layout code, all of which read `document`. The primitives keep the same structure on the
PocketJS side: `ModalLayer` (the shared core, from `Dialog`) portals a full-screen shell into the
overlay layer, traps d-pad focus with `FocusScope`, closes on CROSS and gives focus back to its opener.

### Primitives

- **Dialog** — `Root`, `Trigger`, `Close`, `Portal`, `Overlay` (scrim; a tap on it closes the dialog), `Content`, `Title`, `Description`.
- **DropdownMenu** — `Root`, `Trigger`, `Portal`, `Content`, `Group`, `Item`, `CheckboxItem`, `RadioGroup`,
  `RadioItem`, `ItemIndicator`, `Label`, `Separator`. `Sub`, `SubTrigger`, `SubContent` throw when rendered.
- **Select** — `Root`, `Trigger`, `Value`, `Portal`, `Content`, `Viewport`, `Group`, `Item`, `ItemText`,
  `ItemIndicator`, `Label`, `Separator`, `Icon`, `ScrollUpButton`, `ScrollDownButton`.

Every primitive is controlled or uncontrolled (`useControllableState`: a controlled prop wins, and
`onChange` fires only on a real change). `asChild` merges the press and the class onto the child
(`Pressable`), so `<DialogClose asChild><Button/></DialogClose>` presses the Button. An Item's
`onSelect` gets an event: `preventDefault()` keeps a menu open; otherwise the menu closes.

### Known boundaries (C5, C6)

- **Position is anchored (C6).** Menu and Select panels sit beside their trigger: below it by default, flipped
  above when the bottom has no room, aligned by `align`, and clamped inside the viewport (`collisionPadding`
  insets). The Dialog stays centred. The trigger box comes from a layout bounds hit test (no node-rect query);
  the panel mounts invisibly at the top-left once so the core lays it out and it can be measured.
  Boundaries: `item-aligned` is treated as popper; no arrow; no collision avoidance beyond flip and clamp;
  a trigger partly covered by a higher layer measures its visible part.
- **No scrolling.** Long lists overflow; the scroll buttons render nothing (C10).
- **No sub-menus** (F3). `DropdownMenu.Sub*` throw with a message naming the gap.
- **Icons are text glyphs** (F1): `x + o v ^ >` in the build's ASCII font, until C7 draws real icons.
- **The panel owns its surface** (F4): shadcn's `bg-*` tokens are dropped from the vendored classes;
  the primitives paint a dark panel and set their own text color (`text-white`).
- **Title and Description ignore size and leading tokens:** `leading-*` draws a 1px line here, and a
  large bold run has no baked font slot. The primitive sets its own size.
- **The scrim is 60% slate-950** (`SCRIM_CLASS`, `bg-[#0f172a99]`): the app behind dims instead of going black.
  The compiler has no alpha modifier, so `bg-slate-950/60`, `bg-black/50` and `rgba()` are unknown utilities
  (the codemod drops them by name); the 8-digit hex is the spelling that compiles and blends. The gamepad
  `Dialog` and `Menu` shell uses the same scrim; their panels stay opaque.
- **A tap outside a layer closes it (C6).** A press that starts and ends outside the top layer's panel closes
  that layer (Dialog, Menu, Select, and the gamepad Dialog and Menu) and does not reach the app behind it.
  Nested layers close innermost first; CROSS still closes the innermost layer too. The Menu and Select shells
  are transparent (no dim); the Dialog scrim dims.
- **`sr-only` text still draws.** shadcn's `sr-only` becomes `hidden` (C3), and `hidden` hides only its
  own text node, not the text inside the span. The dialog's close button therefore shows the word "Close"
  next to the X. Fixing it needs a compat cascade for `hidden` (a C10 core/compat gap).
- **No Escape key.** The guest has no keyboard; CROSS is the back button.

## Text input (C4, C4b)

`<input>`, `<textarea>` and the native `<TextField>` are one field: a focusable view whose text children the compat layer owns (React never gives an input children). A focused field takes typing in two ways.

- **Physical keys (web host page)** — with the field focused, printable keys type straight into it, no panel opens. Letters and Space type text instead of pressing pad buttons while the field has focus; outside a field they keep their pad meaning (`Q/E/L/R` shoulders, `X` CROSS, `Z/Enter` CIRCLE, `A` SQUARE, `S` TRIANGLE, `Space` START).
- **On-screen keyboard** — CIRCLE or a mouse click on a focused field opens the panel on the overlay layer; the panel keeps focus while open. On a touch host a finger tap on a field summons the native keyboard instead: a hidden textarea takes its text (IME included, sent once committed) into the same seam. The panel opens on a tap only where that bridge is unavailable.

### Physical keys while typing

| Key | Effect |
| --- | --- |
| printable | inserts at the caret; `maxLength` refuses past the limit |
| Backspace | deletes before the caret |
| Left / Right | move the caret |
| Up / Down | move focus; the direct field closes as focus leaves it |
| Enter | input: commits and closes; textarea: newline |
| Escape | closes without touching the value |

Ctrl, Cmd and Alt combinations are left to the browser. The page queues keys and the guest applies at most one per frame, so a controlled value catches up with its `onChange` before the next key.

### On-screen keyboard

| Control | Keyboard action |
| --- | --- |
| d-pad up / down | move one row; the column stays put where the row allows |
| d-pad left / right | move one key; wraps inside the row |
| CIRCLE | press a key (types it; `1#` and `abc` switch layers, `ABC` shifts) |
| SQUARE | delete before the caret |
| TRIANGLE | space |
| START or `ENT` / `OK` | commit: closes and reports the final value (textarea: `ENT` inserts a newline) |
| CROSS or `HIDE` | close without touching the value |

Typing `quick brown fox` from the home key takes 54 d-pad moves on this layout (plus one CIRCLE per character). Two alternatives were measured and rejected: a literal row strip that keeps the column index costs 64, and a per-row memory column costs 57.

- **onChange contract** — DOM shape: `onChange({ target: { value, name }, type: "change" })`, fired after `onInput`. Controlled: pass `value`, the app owns the string. Uncontrolled: `defaultValue` seeds it.
- **Read-only** — `value` without `onChange` never opens a keyboard and takes no typing; it counts as `mappedAttrs.readOnlyField`.
- **Counters** — `compatStats().mappedAttrs` counts what the field consumed (value, placeholder, onChange, onInput, maxLength, name, password `type`); the rest of the DOM input surface (`rows`, `autoComplete`, `min/max`, `readOnly`, …) drops and counts in `droppedAttrs`.
- **Masks and limits** — `type="password"` shows `*`; `maxLength` refuses an insert that would pass it.
- **Fixed colors** — value `text-slate-900`, placeholder `text-slate-500`, keycaps dark. The core has no text-color inheritance (the C2 gap), so the field picks its own pair.
- **Host page wiring** — `tools/web/text-entry-host.js` holds the key table (`routeKey`); the page pushes text into `globalThis.__pocketText` and reads `globalThis.__pocketTextEntry`, which the guest sets while a field has focus.

### Known gaps (C4, C4b)

- No soft wrap, no horizontal scroll: a long value runs past the box.
- No CJK input (the framework's IME needs an offload session this repo does not have).
- Touch uses the native keyboard; the panel's phone layout and hold rules are not ported. Native IME is verified with simulated composition events only, not on a device (iOS focus-in-gesture is unverified).
- Keycaps are ASCII (`DEL ENT OK HIDE < > 1# ABC abc`); the framework's arrow glyphs are not guaranteed in the atlas.
- No `disabled`, `autoFocus`, `onFocus/onBlur/onKeyDown` (C9). `type` other than `password` is dropped and counted.
- The browser cannot tell a keyboard from a pad: on the web host, any letter key types while a field has focus.
- Direct typing has no panel, so a `CROSS` press on a letter types it; use Escape or Enter to leave a direct field.
- Physical keys reach only the web host page; native hosts have no text seam yet.

## The style prop

Standard React inline styles with camelCase CSS names. Numbers are px. As on the web, an inline style beats `focus:`/`active:` for the same property. Any other key throws with its name.

| CSS property                                                   | Accepted values                                                                                        |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `width` `height` `minWidth` `minHeight` `maxWidth` `maxHeight` | number, `"Npx"`, `"100%"`                                                                              |
| `padding*` `margin*` `gap`                                     | number, `"Npx"` (`padding`/`margin` set all four sides)                                                |
| `flexDirection` `flexWrap` `justifyContent` `alignItems`       | `row`/`column`; `nowrap`/`wrap`; start/center/end/space-between/space-around; start/center/end/stretch |
| `flexGrow` `flexShrink` `flexBasis`                            | number                                                                                                 |
| `position` `top` `right` `bottom` `left`                       | `relative`/`absolute`; number                                                                          |
| `display` `overflow` `zIndex`                                  | `flex`/`none`; `visible`/`hidden`; integer                                                             |
| `backgroundColor` `borderColor` `color`                        | `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, `rgb()`, `rgba()`                                             |
| `borderRadius` `borderWidth` `opacity`                         | number                                                                                                 |
| `textAlign` `lineHeight` `letterSpacing`                       | left/center/right; number                                                                              |

Not mapped: `fontSize`/`fontWeight`/`fontFamily` (use `text-*`/`font-bold`), `transform` (use `translate-*`/`scale-*`/`rotate-*`), other percentages, `auto`, `calc()`, `em`/`rem`, named colors, `boxShadow`, gradients, per-side borders, grid. Removing a key restores the value from `className` (or the core default).

## Measured numbers

The example (`examples/list-dialog`, minified) on each host, 3 runs each, measured on 2026-10-21 on an Apple M3 Pro (macOS 26.6), Bun 1.3.14 and Chrome 155.
- **First render** is guest JavaScript only: parse + eval + mount + first frame.
- **Update** is the guest frame time of a CIRCLE press that changes state: 5 presses per run, including opening and closing the dialog.
- Native layout and drawing are not included.

| Host                         | Command                                             | First render | Update (median) | Update (max) |
| ---------------------------- | --------------------------------------------------- | ------------ | --------------- | ------------ |
| Browser WASM host (V8)       | `bun run measure:web`                               | 16.0–16.6 ms | 0.9–1.3 ms      | 2.5–2.8 ms   |
| macOS desktop host (QuickJS) | `POCKETJS_ROOT=../pocketjs bun run measure:desktop` | 23.6–24.6 ms | 2.3–3.3 ms      | 5.1–6.0 ms   |

Bundle: 252,031 bytes minified (83,457 gzip). Pak (styles + font atlases): 117,344 bytes. The measure scripts fail when a run exceeds 100 ms first render or 8 ms median update.

`measure:desktop-shot` captures the desktop host's own window after each press and checks that the drawn rows follow the state.

## How PocketJS is consumed

- **npm package** — `@pocketjs/framework` is an npm dependency pinned to an exact version. The browser host (`hosts/web`, with a prebuilt `pocketjs.wasm`) and the compiler come from that package. Nothing from PocketJS is copied into this repo.
- **Internal files** — PocketJS's public package exports do not include what a third-party React renderer needs: creating raw native nodes, the per-frame input loop, the class resolver and the class compiler. pocketjs-react imports those files of the installed package by path, only from `src/internal/`.
- **Upgrade risk and guards** — a PocketJS release can move them. The exact version pin and the tests turn that into an import or build error rather than a runtime surprise. Asking upstream to export a small renderer-author surface is the long-term fix.
- **Desktop host** — comes from a sibling PocketJS checkout (see Quick start).

## Licensing

pocketjs-react is MIT. See [LICENSE](./LICENSE).

PocketJS and MicroTS are MIT. The PocketJS package also contains Pocket3D files (`pocket3d/`, `devices/`, `engine/pocket3d/`) under the Pocket3D License, which adds a title-card condition for distributed products that draw 3D scenes with Pocket3D.
- This repo does not copy or vendor any of those files.
- `tools/build.ts` fails if any bundle input comes from those paths (tested).
- The macOS desktop host links Pocket3D. The license exempts PocketJS's own hosts and software that uses Pocket3D only through them to draw PocketJS user interfaces.
- This repo distributes no host binaries.

`assets/fonts/NotoSansSC-reader-subset.otf` is a subset of Noto Sans SC under the SIL Open Font License 1.1 ([assets/fonts/LICENSE-NotoSansSC.txt](./assets/fonts/LICENSE-NotoSansSC.txt)). The Chinese test book under `test/fixtures/books/` is public domain in the US.
