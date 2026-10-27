# Native components

A component library built on what the PocketJS core can actually do. No codemod, no vendored
sources, no emulation of another library's internals: each component takes a closed token
vocabulary and is judged by the four acceptance gates (legibility, overflow and zero-area,
alignment, interaction) from its first commit.

```tsx
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, ThemeProvider } from "pocketjs-react/native";
```

## Theme

```tsx
<ThemeProvider theme="light">
  <Card>…</Card>
</ThemeProvider>
```

`ThemeProvider` carries a token table through context, so switching a theme is a state change and
not a CSS layer. Two tables ship: `light` and `dark` (the dark table overrides the keys that differ).
The vocabulary holds 222 distinct utilities across both tables (the budget test in
`test/native/tokens.test.ts`).

### Theme page switch latency

The theme page is six sections in one 480 by 252 frame: section 1 holds the first twenty-four
components, sections 2 to 6 the later thirteen. The section switch is in the shared top row. Only the
shown section is mounted, so each section is timed with its own components on the page (40 toggles
each, frame by frame, `tools/native/theme-switch.ts`).

| Section | Components | Steady median | Bridge writes per switch |
|---|---|---|---|
| 1 | 24 (the first page) | **2.15 ms** | 65 |
| 2 | Navigation menu, Breadcrumb, Pagination, InputOTP, Alert | 1.65 ms | 56 |
| 3 | Field, Alert (destructive), Command | 0.92 ms | 34 |
| 4 | Empty, Sidebar | 0.99 ms | 35 |
| 5 | Calendar, Combobox | 1.93 ms | 96 |
| 6 | Resizable, Carousel | 0.80 ms | 32 |

The first switch of section 1 compiles the new combinations: 4.79 ms, 66 bridge writes. The steady
medians are from one run on this machine (min to max spread is in `/tmp/pocketjs-react-qa/native/theme-switch.json`).

## Components

| Group | Components |
|---|---|
| Layout | Card (with Header, Title, Description, Content, Footer), Separator, Table (Header, Body, Row, Head, Cell), Resizable (two panes and a divider) |
| Navigation | Breadcrumb, Pagination, NavigationMenu (List, Item, Trigger, Content, Link, Label), Sidebar (grouped rail, collapsible to icons), Carousel |
| Text and status | Label, Badge, Avatar, Progress, Skeleton, Spinner, Alert (info, success, warning, destructive), Empty |
| Forms | Input (also stands in for a textarea), Field (Label, control, message), InputOTP, Checkbox, Switch, RadioGroup, RadioItem, Select, Slider, Calendar |
| Lists | Command (input, grouped filtered list, up and down with wrap, empty line), Combobox (a Command in a Popover) |
| Disclosure | Tabs (List, Trigger, Content), Accordion (Item) |
| Overlays | Dialog (Trigger, Content, Title, Description, Footer, Close), Sheet, Popover (`wide` for a 264 px panel), Tooltip, DropdownMenu, Toaster |
| Base | Focusable, ThemeProvider, TOKENS, percentOf, comboboxLabel |

Per component: Breadcrumb collapses a long trail to one focusable ellipsis, and CIRCLE on it expands the
full trail; Alert's Dismiss unmounts the banner; Empty's action slot takes any control; Field turns its
control's border red and its message red-700 in place (the message row is a fixed 16 px); InputOTP
types one digit per cell, moves the keyboard on, reports `onComplete` once, and draws the caret in the
open cell; NavigationMenu keeps one panel open below the bar, which never moves; Command filters by
label and steps through the visible items with wrap.

- **Sidebar** — the rail is 30 percent of its parent expanded and 10 percent collapsed (`expandedWidth`,
  `collapsedWidth`), resolved by the library. The toggle collapses it: headings and labels go, and each
  item shows its icon glyph. UP and DOWN walk the toggle and the items and wrap; LEFT and RIGHT stay put.
- **Resizable** — the first pane is `size` percent of the group (default 50), the second takes the rest.
  A drag on the divider sets the size from the pointer's x; LEFT and RIGHT step it by 10. Each pane keeps
  `minSize` percent (default 20). The divider's grip is `::` on a solid fill.
- **Carousel** — one 168 by 72 px slide with Prev slide and Next slide and a position readout ("2 / 3").
  `loop` (the default) wraps both ways: Next on the last slide goes to the first, Prev on the first goes to
  the last. `loop={false}` disables the end control. A move enters the new slide from its side: it is mounted
  a slide width off and the core's transition brings it to offset 0 in about 150 ms.
- **Calendar** — a month grid with no date library: `daysInMonth`, `firstWeekday` (checked against the JS
  calendar) and `monthCells` pad the first week with blanks; a month has 4 to 6 weeks. Today is bold with a
  border; the selected day is filled. Prev month and Next month move the view; LEFT and RIGHT step a day and
  UP and DOWN a week, clamped to the month. A six-week month is 214 px tall.
- **Combobox** — a Popover whose content is a Command. The trigger shows the selected label or the
  placeholder. CIRCLE on the trigger opens the panel; from the search input DOWN enters the list, and CIRCLE
  chooses and closes it. CROSS closes it with no change.

## What the core gives and what it does not

- **Transitions are native.** A colour, opacity, or inset transition produces intermediate values over a few
  frames with **zero bridge writes per frame**; the library pays one write per state change. The carousel's
  slide enters on a transition, and a Slider's thumb moves the same way. There is no animation runtime here.
- **Percentages are resolved by the library**, not the core: a size or inset given as a fraction of
  the parent is converted to pixels after commit and re-resolved when the parent changes.
- **Arcs paint axis-aligned only**, so the spinner steps its arc start (eighteen steps, 90 frames
  per revolution) rather than rotating smoothly.
- **No ARIA tree, no blur.** Command, Combobox and NavigationMenu expose no roles; do not design around them.
- **Scrolling is not built (blocked).** The core rejects `overflow-y-scroll`, and the judge counts a clipped
  off-screen child as a gate 2 finding. So the carousel holds one slide in its clip at rest, and ScrollArea
  waits for a scroll region the core declares.
- **Backspace on an empty InputOTP cell does nothing.** The text-entry seam reports a change only when
  the value changes, so an empty cell cannot step back; a filled cell clears and steps back one. The gap is
  `TextFieldInput` (`src/input/text-field.ts`): it has onChange, onInput and onClick only, so a no-op edit from
  `text-entry.ts` reaches no element. Closing it needs a key callback on the field, fired for Backspace.

## Judging a change

```bash
bun tools/native/judge.ts --page            # every gallery page against the four gates
bun tools/native/judge.ts --mutants         # each gate must still fail on its mutant
bun tools/native/judge.ts --mutants sidebar # only the targets whose name contains a word
```

The page sweep covers 38 pages (37 components and the theme page): G1 0 fails and 0 could not judge, G2 0 findings,
G3 0 fails, text-fit 0 outside. G4 passes on 31 pages, and 7 are static with a reason (Card, Badge, Separator, Avatar,
Skeleton, Spinner, Table). The pages run 40 driver steps in all.

G1 judges every drawn run: 248 text runs and 29 one-character glyphs. A run's backdrop is the 3 px ring around it
(text masked out), then each enclosing box at least twice its area, then the screen; the first that is 60% one colour
is the background. A run the gate cannot judge fails with its cause ("could not judge: ..."), and gates.json records
each one. There is no third state. Before this rule, 72 runs read as unresolved: 66 because the text's own box (mostly
ink) was taken as the background, and 6 because a toast left by an earlier page sat outside that page's subtree.
Two fixes this round were of that kind: the resizable's bar-shaped grip and a smaller `::` grip at `text-xs`
were unresolved or unreadable, so the grip is `::` at `text-sm` in slate-600 on a solid fill.

The mutant table holds 131 targets: 66 defects, each of which must fail its gate, and 65 controls, each of
which must pass. The run reports 0 mismatches. `--mutants` prints each G4 target's reason. Two controls (`dead-select-control`, `dead-dropdown-control`)
were judged dead on correct components until the gate fix: a select's driver now chooses an option, and a
`menu` metric counts a menu layer's item text.

## Gallery

`test/native/gallery/main.tsx` renders every component on its own page (38 pages, the theme page last).
A tap in the left or right eighth of the canvas pages back and forward; taps near a control press it
instead. Build and serve it the way the runbook describes. Screenshots of every page are written by
`tools/native/shots.ts` to `dist/native/shots/`.
