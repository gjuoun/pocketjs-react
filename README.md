# pocketjs-react

React on [PocketJS](https://github.com/pocket-nexus/pocketjs): a UI framework base for screens driven by a d-pad and a few buttons.

> Early exploration. Unofficial: not affiliated with or endorsed by Pocket Nexus.

## What exists

- **Renderer** — real `react` (19.3.1) through a custom `react-reconciler` (0.34.0) renderer that writes PocketJS's native View/Text/Image tree. No DOM, no CSS engine, no WebView.
- **Tailwind + clsx + cn** — `className` takes any string React code builds: literals, ternaries, `clsx(...)`, `cn(...)` (clsx + tailwind-merge). Each class combination becomes a native style record, so `focus:`, `active:` and transitions stay native.
- **Inline styles** — the standard React `style` prop with camelCase CSS names, mapped to the core's properties.
- **D-pad input** — `FocusScope` (traps focus, restores it on close) and `useButton` (face and shoulder buttons, innermost handler wins), built on PocketJS's own focus manager. Confirm = CIRCLE, back = CROSS.
- **Components** — `List` (d-pad-operable rows) and `Dialog` (portaled overlay that traps focus and closes on back).
- **Build** — `tools/build.ts` turns TSX and Tailwind class strings into one guest bundle and a `.pak` (styles + baked font atlases), using PocketJS's own compiler.
- **Two hosts** — the browser WASM host and the macOS desktop host. Both run the same example with measured numbers (below).

Not here yet: handhelds and phones, pointer and touch input, tabs, menus, toggles, geometric spatial navigation, and full Tailwind (see the inventory).

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
      <View className={cn("px-3 py-1 rounded-lg bg-slate-800 focus:bg-blue-600", on && "px-6 bg-emerald-700")}
            focusable onPress={() => setOn((v) => !v)}>
        <Text className={clsx("text-sm text-white", { "font-bold": on })}>Toggle</Text>
      </View>
      <View className="w-[120px] h-[10px] bg-slate-700">
        <View style={{ width: on ? 120 : 20, height: 10, backgroundColor: "#22c55e" }} />
      </View>
    </View>
  );
}

mount(<App />);
```

`View`, `Text` and `Image` are the host elements. React's DOM typings already claim lowercase `view`/`text`/`image` for SVG, so they are exported as components. At runtime each one is the host type string, with no wrapper.

## The className rule

Write Tailwind utilities as on the web: static strings, ternaries, template literals, `clsx(...)` and `cn(...)` all work.

**The one limit is Tailwind's own: every utility name must appear as a complete token somewhere in the source** (`p-4`, `bg-blue-600`, `w-[120px]`). A name assembled at runtime, such as `` `p-${n}` `` or `"w-[" + n + "px]"`, cannot be found by the build scan. It is not supported. On the browser host it throws with the token named; on the desktop host it is reported and dropped. Use a lookup of complete names instead, or the `style` prop for values that are truly dynamic.

- **Conflicts** — the last utility in the string wins. `cn` (clsx + tailwind-merge) removes conflicting earlier utilities, so it gives the same result as on the web.
- **Variants** — `focus:` and `active:` are applied natively. `hover:` is an error (there is no pointer yet).
- **Fonts** — text sizes and weights are baked atlases. The build bakes every size × weight pair whose tokens appear in the source, so `cn("text-sm", bold && "font-bold")` draws.
- **How it works** — the build compiles every complete class string into a style table. At runtime any other combination of source tokens is compiled by PocketJS's own Tailwind compiler, appended to the table, and loaded once per React commit.

### Supported utilities (PocketJS compiler subset)

| Family | Utilities |
|---|---|
| Layout | `flex flex-row flex-col flex-wrap flex-1 grow grow-0 shrink-0 basis-N gap-N justify-{start,center,end,between,around} items-{start,center,end,stretch} hidden overflow-hidden` |
| Box | `w-/h-{N,full,[px]} min-w/min-h/max-w/max-h-N p/px/py/pt/pr/pb/pl-N m/mx/my/mt/mr/mb/ml-N absolute relative inset/top/right/bottom/left-N z-N` |
| Visual | `bg-{color} bg-gradient-to-{t,b,l,r} from-/via-/to-{color} rounded rounded-{sm,md,lg,xl,[N]} rounded-full` (needs `w-N h-N` in the same string) `border border-{2,4,8,[N]} border-{color} opacity-N shadow shadow-md shadow-lg` |
| Text | `text-{color} text-{2xs,xs,sm,base,lg,xl,2xl,4xl,5xl} font-bold font-mono text-{left,center,right} leading-N tracking-wide` |
| Transform | `translate-x/y-N scale-N scale-x/y-N rotate-N origin-* perspective-[N] rotate-x/y-[N] translate-z-[N] skew-x-[N]` |
| Motion | `transition transition-{all,colors,opacity,transform} duration-N delay-N ease-{linear,in,out,in-out,spring,out-back}` |

Spacing is N × 4 px. Arbitrary values `[Npx]` work on every numeric utility (negatives only in arbitrary form). Colors are the 19 Tailwind v3 families × 11 shades, white/black/transparent, and arbitrary `[#rgb]`/`[#rrggbb]`/`[#rrggbbaa]`.

**Not supported** (examples):
- responsive and state variants (`sm:`, `dark:`, `group-*`, `disabled:`);
- grid, `*-reverse`, `self-*`, `order-*`, fractions (`w-1/2`), `w-auto`, `space-*`;
- per-side borders, per-corner radius, `ring-*`, `shadow-sm/xl`, opacity modifiers (`bg-blue-600/50`), `neutral`/`stone`;
- font weights other than bold, italic, decoration, `truncate`;
- filters, background images, `fixed`/`sticky`, scrolling.

Most of these need new drawing features in the PocketJS core (it lays out with flexbox only and draws rects, gradients, rounded rects, inset borders, four baked shadows, baked bitmap fonts, images and transforms), not something this repo can add on its own.

## The style prop

Standard React inline styles with camelCase CSS names. Numbers are px. As on the web, an inline style beats `focus:`/`active:` for the same property. Any other key throws with its name.

| CSS property | Accepted values |
|---|---|
| `width` `height` `minWidth` `minHeight` `maxWidth` `maxHeight` | number, `"Npx"`, `"100%"` |
| `padding*` `margin*` `gap` | number, `"Npx"` (`padding`/`margin` set all four sides) |
| `flexDirection` `flexWrap` `justifyContent` `alignItems` | `row`/`column`; `nowrap`/`wrap`; start/center/end/space-between/space-around; start/center/end/stretch |
| `flexGrow` `flexShrink` `flexBasis` | number |
| `position` `top` `right` `bottom` `left` | `relative`/`absolute`; number |
| `display` `overflow` `zIndex` | `flex`/`none`; `visible`/`hidden`; integer |
| `backgroundColor` `borderColor` `color` | `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, `rgb()`, `rgba()` |
| `borderRadius` `borderWidth` `opacity` | number |
| `textAlign` `lineHeight` `letterSpacing` | left/center/right; number |

Not mapped: `fontSize`/`fontWeight`/`fontFamily` (use `text-*`/`font-bold`), `transform` (use `translate-*`/`scale-*`/`rotate-*`), other percentages, `auto`, `calc()`, `em`/`rem`, named colors, `boxShadow`, gradients, per-side borders, grid. Removing a key restores the value from `className` (or the core default).

## Measured numbers

The example (`examples/list-dialog`, minified) on each host, 3 runs each, measured on 2026-10-21 on an Apple M3 Pro (macOS 26.6), Bun 1.3.14 and Chrome 155.

- **First render** is guest JavaScript only: parse + eval + mount + first frame.
- **Update** is the guest frame time of a CIRCLE press that changes state: 5 presses per run, including opening and closing the dialog.
- Native layout and drawing are not included.

| Host | Command | First render | Update (median) | Update (max) |
|---|---|---|---|---|
| Browser WASM host (V8) | `bun run measure:web` | 16.0–16.6 ms | 0.9–1.3 ms | 2.5–2.8 ms |
| macOS desktop host (QuickJS) | `POCKETJS_ROOT=../pocketjs bun run measure:desktop` | 23.6–24.6 ms | 2.3–3.3 ms | 5.1–6.0 ms |

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
