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
not a CSS layer. Two tables ship: `light` (333 keys) and `dark` (199 keys that differ from light).
The vocabulary holds 214 distinct utilities across both tables (the budget test in
`test/native/tokens.test.ts`).

### Theme page switch latency

The theme page is four sections in one 480 by 252 frame: section 1 holds the first twenty-four
components, sections 2 to 4 the later eight. The section switch is in the shared top row. Only the
shown section is mounted, so each section is timed with its own components on the page (40 toggles
each, frame by frame, `tools/native/theme-switch.ts`).

| Section | Components | Steady median | Bridge writes per switch |
|---|---|---|---|
| 1 | 24 (the first page) | **2.22 ms** | 65 |
| 2 | Navigation menu, Breadcrumb, Pagination, InputOTP, Alert | 1.62 ms | 56 |
| 3 | Field, Alert (destructive), Command | 0.92 ms | 34 |
| 4 | Empty | 0.77 ms | 25 |

Section 1 is the 24-component page. HEAD measured 2.35 ms median (62 writes) on this machine; section 1
measured 2.99 ms in an earlier run and 2.22 ms in this one, so the difference is inside this machine's
run-to-run spread. The first switch of section 1 compiles the new combinations: 4.98 ms, 66 bridge writes.

## Components

| Group | Components |
|---|---|
| Layout | Card (with Header, Title, Description, Content, Footer), Separator, Table (Header, Body, Row, Head, Cell) |
| Navigation | Breadcrumb, Pagination, NavigationMenu (List, Item, Trigger, Content, Link, Label) |
| Text and status | Label, Badge, Avatar, Progress, Skeleton, Spinner, Alert (info, success, warning, destructive), Empty |
| Forms | Input (also stands in for a textarea), Field (Label, control, message), InputOTP, Checkbox, Switch, RadioGroup, RadioItem, Select, Slider |
| Lists | Command (input, grouped filtered list, up and down with wrap, empty line) |
| Disclosure | Tabs (List, Trigger, Content), Accordion (Item) |
| Overlays | Dialog (Trigger, Content, Title, Description, Footer, Close), Sheet, Popover, Tooltip, DropdownMenu, Toaster |
| Base | Focusable, ThemeProvider, TOKENS, percentOf |

Per component: Breadcrumb collapses a long trail to one focusable ellipsis, and CIRCLE on it expands the
full trail; Alert's Dismiss unmounts the banner; Empty's action slot takes any control; Field turns its
control's border red and its message red-700 in place (the message row is a fixed 16 px); InputOTP
types one digit per cell, moves the keyboard on, reports `onComplete` once, and draws the caret in the
open cell; NavigationMenu keeps one panel open below the bar, which never moves; Command filters by
label and steps through the visible items with wrap.

## What the core gives and what it does not

- **Transitions are native.** A colour or opacity transition produces 8–9 intermediate values over
  8–9 frames with **zero bridge writes per frame**; the library pays one write per state change.
  That is why there is no animation runtime here.
- **Percentages are resolved by the library**, not the core: a size or inset given as a fraction of
  the parent is converted to pixels after commit and re-resolved when the parent changes.
- **Arcs paint axis-aligned only**, so the spinner steps its arc start (eighteen steps, 90 frames
  per revolution) rather than rotating smoothly.
- **No ARIA tree, no blur.** Command and NavigationMenu expose no roles; do not design around them.
- **Scrolling needs a range the library can compute.** The offset primitive (`src/primitives/offset-viewport.ts`)
  takes its range from `nodeRect`, which exists on the overlay core only. The core also rejects
  `overflow-y-scroll` at build time, so a scroll region clips with `overflow-hidden` and the judge counts
  its off-screen children (G2). The theme page therefore uses sections rather than a scroll region.
- **Backspace on an empty InputOTP cell does nothing.** The text-entry seam reports a change only when
  the value changes, so an empty cell cannot step back; a filled cell clears and steps back one.

## Judging a change

```bash
bun tools/native/judge.ts --page     # every gallery page against the four gates
bun tools/native/judge.ts --mutants  # each gate must still fail on its mutant
```

The page sweep covers 33 pages and 207 driven runs: G1 0 fails, G2 0 findings, G3 0 fails, text-fit 0
outside. G4 passes on 28 pages and is static on 8 with a reason. Two pages fail G4 and predate this round:
Label and Select; the judge reports no panel text beyond their controls.

The mutant table holds 90 targets: 45 defects, each of which must fail its gate, and 45 controls, each of
which must pass. Two controls fail their G4 driver and predate this round (`dead-select-control`,
`dead-dropdown-control`), so the run reports 2 mismatches.

## Gallery

`test/native/gallery/main.tsx` renders every component on its own page (33 pages, the theme page last).
A tap in the left or right eighth of the canvas pages back and forward; taps near a control press it
instead. Build and serve it the way the runbook describes.
