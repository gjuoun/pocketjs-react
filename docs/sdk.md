# SDK manual — start an app in `examples/`

How to go from an empty directory to a PocketJS app running in the browser host, using the
component library in `src/native/`. Every command and every number below was run on this repo
(`main`, 2026-10-28). The reference app is `examples/todo`; the component behaviour reference is
[docs/native.md](./native.md).

If you only read one section, read [Ten rules that cost a debugging round](#ten-rules-that-cost-a-debugging-round).

## 1. Five-minute start

```sh
bun install                       # once, ~200 MB
bun tools/scaffold.ts examples/clock     # main.tsx + app.tsx, prints the next two commands
bun tools/build.ts examples/clock/main.tsx --name=clock
bun tools/web/serve.ts --js dist/clock.js --pak dist/clock.pak --port 8140
```

Open <http://127.0.0.1:8140/>. You should see the title, a `Press me` button that counts presses,
and the hint line. CIRCLE (Enter) presses it.

Three things to know immediately:

- **The output is named after `--name`, not after the entry file.** `--name=clock` writes
  `dist/clock.js` and `dist/clock.pak`; a serve script pointing at `main.js` ships a blank screen.
- **Two files: the bundle and the pak.** The bundle is guest JS; the pak carries the compiled style
  table and the baked font atlases. Always pass both.
- **The page always fetches `/dist/app.js` and `/dist/app.pak`**, whatever file names you gave the
  server. So a `200` on `/` proves nothing about the app: check the bytes with
  `curl -s -o /dev/null -w '%{size_download}\n' http://127.0.0.1:8140/dist/app.js` against
  `stat -f%z dist/clock.js`.

For a phone on the LAN, `HOST=0.0.0.0 bun tools/web/serve.ts ...` and browse
`http://<lan-ip>:8140/`.

## 2. What a project looks like

```
examples/todo/
  main.tsx      mount(<App />) — the entry; the build needs this path
  app.tsx       the screen
  model.ts      state and pure edits (the todo tree)
  storage.ts    persistence through the host's fs
  accept.txt    the drive script tools/shot.ts runs
```

Apps live in this repo's `examples/` and import the SDK by package name — no `bun add`, no
`node_modules` inside the app directory:

```tsx
import { mount, Text, View, useButton, BTN } from "pocketjs-react";
import { Button, Card, Input, ThemeProvider } from "pocketjs-react/native";
```

- `pocketjs-react` — host elements (`View`, `Text`, `Image`), `mount`, focus helpers, the button
  masks, the fs SDK, texture registration.
- `pocketjs-react/native` — the component library (40 exports, section 5).
- `react` — `useState`, `useRef`, `useLayoutEffect`, `useEffect`, `useMemo`. Real React 19.
- `clsx` / `tailwind-merge` are dependencies; `cn` re-exports their merge through `pocketjs-react`.

A plain tree gets **no focus at mount**. `<FocusScope autoFocus>` focuses its first focusable, so
CIRCLE does something before the user touches the d-pad:

```tsx
<ThemeProvider theme="light">
  <FocusScope className="w-full h-full" autoFocus>
    <View className="w-full h-full flex-col gap-2 p-3 bg-slate-50">…</View>
  </FocusScope>
</ThemeProvider>
```

## 3. The screen

- **480 × 272 logical pixels**, landscape. The browser host draws that canvas at 960 × 544
  (`image-rendering: pixelated` on a fine pointer, scaled to the width on a coarse one).
- **No scrolling.** The core rejects `overflow-y-scroll`; a list longer than the screen must be
  windowed (section 8).
- **Text is ASCII 32–126** with the default baked atlas. Non-ASCII needs a baked glyph set
  (`--glyphs`, `--cjk-set`); a title pushed at runtime with CJK draws nothing.
- `View` is a flex box, `Text` is a leaf that draws one string, `Image` needs a registered texture.
  There is no HTML, no CSS engine, no WebView.

## 4. Elements

```tsx
export interface PocketHostProps {
  className?: string;      // a Tailwind subset, compiled at build time (section 6)
  style?: PocketCSSProperties;  // camelCase; numbers are px
  focusable?: boolean;     // joins d-pad traversal; CIRCLE / click fires onPress
  onPress?: () => void;
  debugName?: string;      // shows up in judge output and in captureTexts dumps
  ref?: Ref<NodeMirror>;
  children?: ReactNode;
}
```

`View`, `Text` and `Image` are exported as component bindings to the host types `view`, `text`,
`image`; they carry no wrapper of their own.

## 5. Components (`pocketjs-react/native`)

Wrap the app in `<ThemeProvider theme="light">` (or `"dark"`) and take everything else from the
library — the tokens are closed, so a component never invents a utility.

- **Actions** — `Button` (`variant` default/secondary/destructive/outline/ghost, `size` sm/md/lg,
  `disabled`, `onPress`, children is the label string).
- **Text** — `Label`, `Badge` (`variant` default/secondary/destructive/outline), `Alert`, `Empty`,
  `Skeleton`, `Spinner`, `Progress`, `Avatar`.
- **Layout** — `Card` (+ `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`,
  `CardFooter`), `Separator`, `Table` (+ `TableHeader`, `TableRow`, `TableHead`, `TableCell`,
  `TableBody`), `Resizable`, `Sidebar`.
- **Forms** — `Input` (also `multiline` for a textarea), `Field` (label, hint, error, disabled: one
  message row whose height never moves), `Checkbox`, `Switch`, `RadioGroup`/`RadioItem`, `Select`,
  `Slider`, `InputOTP`, `Calendar`.
- **Navigation** — `Tabs` (`TabsList`, `TabsTrigger`, `TabsContent`), `Breadcrumb`, `Pagination`,
  `NavigationMenu`, `Carousel`.
- **Lists** — `Command` (input + filtered list), `Combobox` (a Command in a Popover), `Accordion`.
- **Overlays** — `Dialog` (`DialogContent`, `DialogTitle`, `DialogDescription`, `DialogFooter`,
  `DialogClose`), `Sheet`, `Popover` (`PopoverTrigger`, `PopoverContent`), `Tooltip`, `DropdownMenu`,
  `Toaster` + `toast()`.
- **Base** — `Focusable`, `ThemeProvider`, `useTheme`, `TOKENS`, `percentOf`, `comboboxLabel`.

The four an app reaches for first:

```tsx
<Button size="sm" variant="outline" onPress={fn}>Label</Button>

<Input
  value={draft}
  placeholder="New task, then Enter"
  onChange={(next) => setDraft(next)}
  onCommit={(value) => submit(value)}   // Enter (physical) or the on-screen keyboard's OK
  nodeRef={(node) => { field.current = node; }}
/>

<Dialog open={open} onOpenChange={(next) => setOpen(next)}>
  <DialogContent>
    <DialogTitle>Due date</DialogTitle>
    <DialogDescription>Ship the todo example</DialogDescription>
    <Button size="sm" onPress={pick}>Today</Button>
  </DialogContent>
</Dialog>

<Calendar autoFocus value={date} onValueChange={(picked) => setDate(picked)} />
```

`DialogContent` portals a scrim and a focus-trapped panel; CROSS closes it. Its panel is 300 px
wide with `p-4` and `gap-2` — on a 272 px screen that is room for about three rows of controls, so
a tall picker belongs on its own screen, not in a dialog (the todo example's month grid does that).

`Calendar` is 214 px tall with no date library. `autoFocus` puts the focus on the selected day (or
today) at mount — needed when the calendar is the page, because nothing else moves the focus into
the grid.

## 6. Classes

`className` takes any string React builds — literals, ternaries, `clsx(...)`, `cn(...)` — and each
combination becomes a native style record at build time.

- **Every class must be a complete literal somewhere in the source.** No `"bg-" + color`, no
  `\`text-${size}\``. A dynamic string that never appears as a literal compiles to nothing.
- **An unknown utility drops the WHOLE literal** (it warns at build, then renders unstyled). If a
  row loses its padding *and* its background, look for one bad token in that string, not two bugs.
- Supported: the Tailwind subset in `src/compat/tokens.ts` plus arbitrary values for sizes
  (`w-[120px]`, `h-[30px]`), `focus:`, `active:`, state selectors, and transitions.
- Not supported: gradients, blur, shadows beyond the token set, `overflow-y-scroll`, ARIA.
- Inline `style` works for what you compute: `style={{ width: 20 * count, height: 10 }}`.

## 7. Input

The d-pad moves focus, CIRCLE presses the focused node, CROSS goes back. `useButton(mask, fn)`
reacts to a button's pressed edge on the page; the innermost handler for a button wins, which is
how a dialog's back handler shadows the page's.

```ts
BTN = { SELECT: 0x1, START: 0x8, UP: 0x10, RIGHT: 0x20, DOWN: 0x40, LEFT: 0x80,
        LTRIGGER: 0x100, RTRIGGER: 0x200, ZL: 0x400, ZR: 0x800,
        TRIANGLE: 0x1000, CIRCLE: 0x2000, CROSS: 0x4000, SQUARE: 0x8000 }
```

The browser host page maps physical keys: arrows = d-pad, **Enter / Z = CIRCLE**, **X = CROSS**,
**A = SQUARE**, **S = TRIANGLE**, **Shift = SELECT**, **Space = START**, **Q/E or L/R = the
shoulders**. A mouse click focuses and presses what it points at.

`useButton(BTN.LTRIGGER | BTN.RTRIGGER, (bit) => { … }, { enabled: !dialogOpen })` — the `enabled`
flag is the cheap way to keep page shortcuts from firing behind an overlay.

### Text fields

`Input` is a controlled field on the core's text seam. Two input paths, one seam:

- **Click, or CIRCLE on the field**: the on-screen keyboard opens.
- **A physical printable key**: the character goes in and the on-screen keyboard hides. This is the
  switching rule the field already implements — do not re-implement it per app.
- **Enter on a single-line field commits**: `onCommit(value)` fires, then the keyboard closes.
  Enter is *not* "press the focused control" while a field has the text focus.
- To open a field from code (a shortcut that jumps into the input), take the node and use the
  seam: `focusNode(node); openField(fieldFor(node));` — `closeField` to dismiss.

Text arrives at the guest as characters; a placeholder or value built at runtime is fine as long
as the glyphs are in the atlas (ASCII by default).

## 8. Focus, and writing your own d-pad list

The core has no node-rect query, so a vertical list cannot rely on geometric navigation. The pattern
(see `Rows` in `examples/todo/app.tsx`, and `src/components/List.tsx`) is:

1. Keep every row a `focusable` `View` and remember its node in a `Map<id, node>` by ref.
2. Push one focus controller for the list root:
   `pushFocusController(root, (dir) => { if (dir !== "up" && dir !== "down") return false; … })`.
3. In it, find the focused index from your own state, compute the neighbour, `focusNode(next)`, and
   return `true`. Return `false` for directions you do not own, `true` for the ends (so focus does
   not escape).
4. Window the rows yourself: draw `rows.slice(start, start + count)` and move `start` when the
   focus leaves the window. `List` does this for you with `visibleCount`.

`<FocusScope autoFocus>` for a fresh screen or an overlay; `Dialog` already scopes and restores the
focus its trigger.

## 9. Motion and timing

- **Transitions are native**: colour, opacity and inset transitions interpolate in the core with
  zero bridge writes per frame. `transition` in a class string is enough for a hover/press feel.
- **`useFrame(cb)`** runs once per host frame with a 0-based counter — for games and per-frame
  drawing, not for state you could transition.
- **Timelines interpolate every tick**: a core animation (`animate-spin-arc`: `arcStart` 0→360 in
  1.5 s linear, infinite) is smoother than a React pump, which caps you at a handful of distinct
  frames per second. If an animation looks steppy, look for a state pump before blaming the host.

## 10. Persistence

The host may mount a file system, rooted at the app's own data directory:

```ts
import { existsSync, file, write } from "pocketjs-react";

try {
  if (existsSync("todos.json")) return JSON.parse(file("todos.json").text());
} catch { /* no fs on this host */ }

try { write("todos.json", JSON.stringify(tree)); } catch { /* session only */ }
```

The browser host page backs it with `localStorage`; the macOS desktop host does not mount one for
an app, so every call is inside a `try`. Paths are relative to the app root — there is no absolute
path and no other app's tree.

## 11. Verifying a change

```sh
bun run typecheck                                   # tsc --noEmit over src, test, tools, examples
bun test                                            # every unit suite, on the real wasm core
bun tools/build.ts examples/todo/main.tsx --name=todo
bun run check:todo                                  # the drive script below, 11 shots
```

`tools/shot.ts` serves the bundle, drives it like a player and asserts what is on screen. Its
script (`examples/todo/accept.txt`) is one step per line:

| Step | Meaning |
|---|---|
| `up` `down` `left` `right` | one d-pad step (60 ms hold) |
| `press` `circle` `cross` `square` `triangle` `select` `start` `ltrig` `rtrig` | that button |
| `type:Buy milk` | physical typing, one key event per character |
| `key:Enter` | one raw key (`Enter`, `Backspace`, `Escape`, arrows) |
| `expect:Text` / `absent:Text` | fail unless the app draws / no longer draws that text |
| `texts` | print the whole text census (for narrowing a failure) |
| `shot` | write a PNG; `wait` settles |
| `reload` | re-navigate (persistence check) |

Two things it refuses to let slide: a **blank shot** (under 1% of the canvas differs from its
top-left pixel — a bundle that did not boot) and a **missing text**. Read the text census before
concluding "the layout broke": it tells you which screen you are actually looking at.

## 12. Reference app: `examples/todo`

Six features, each one small and each on its own input. `bun run build:todo && bun run check:todo`.

| Feature | Where | Key |
|---|---|---|
| List todos | `Rows` in `app.tsx` — focusable rows, windowed to 5 | d-pad |
| Complete | `toggleDone` in `model.ts`; CIRCLE on a row | CIRCLE / click |
| Add | `Input` + `onCommit` → `addRoot` | type, then Enter |
| Adjust order | `moveSibling`; the row moves among its siblings, children follow | L / R |
| Sub-todos | `addChild`, one level, indented with a 14 px spacer | SQUARE, then type |
| Due date | quick picks in a `Dialog`; a month grid on its own screen | TRIANGLE |
| Delete | confirm `Dialog` → `removeTodo` | SELECT, then CIRCLE |
| Save | `storage.ts` over the fs host, one JSON file | automatic |

Measured on this repo: bundle 952,673 B, pak 3,622,096 B, 435 style records, 257 utility tokens.

## Ten rules that cost a debugging round

1. Name the build output with `--name` and serve that file; the entry-file name is not the output.
2. Verify a deploy by the **bundle bytes**, never by a `200` on `/`.
3. Give the screen an initial focus (`FocusScope autoFocus` or `focusNode`), or CIRCLE does nothing.
4. Keep class strings complete literals; one unknown utility silently drops the whole string.
5. Window long lists yourself — the core has no scroll.
6. Keep text ASCII, or bake the glyphs at build time.
7. Enter commits a text field; it does not press the focused control.
8. A dialog panel is 300 px wide with three rows of room on a 272 px screen — put tall pickers on
   their own screen.
9. `openField(fieldFor(node))` to jump into an input from a shortcut; `useButton(..., {enabled})` to
   keep page shortcuts quiet behind an overlay.
10. Assert with `expect:`/`absent:` in a drive script, and look at the shot — a green unit test does
    not prove the screen drew.
