# Native components

A component library built on what the PocketJS core can actually do. No codemod, no vendored
sources, no emulation of another library's internals: each component takes a closed token
vocabulary and is judged by the four acceptance gates (legibility, overflow and zero-area,
alignment, interaction) from its first commit.

```tsx
import { Button, Card, CardContent, CardHeader, CardTitle, ThemeProvider } from "pocketjs-react/native";
```

## Theme

```tsx
<ThemeProvider theme="light">
  <Card>…</Card>
</ThemeProvider>
```

`ThemeProvider` carries a token table through context, so switching a theme is a state change and
not a CSS layer. Two tables ship: `light` (92 keys) and `dark` (54 overrides). On a page holding
all twenty-four components a switch measures **1.96 ms** steady state.

## Components

| Group | Components |
|---|---|
| Layout | Card (with Header, Title, Description, Content, Footer), Separator, Table (Header, Body, Row, Head, Cell) |
| Text and status | Label, Badge, Avatar, Progress, Skeleton, Spinner |
| Forms | Input (also stands in for a textarea), Checkbox, Switch, RadioGroup, RadioItem, Select, Slider |
| Disclosure | Tabs (List, Trigger, Content), Accordion (Item) |
| Overlays | Dialog (Trigger, Content, Title, Description, Footer, Close), Sheet, Popover, Tooltip, DropdownMenu, Toaster |
| Base | Focusable, ThemeProvider, TOKENS, percentOf |

## What the core gives and what it does not

- **Transitions are native.** A colour or opacity transition produces 8–9 intermediate values over
  8–9 frames with **zero bridge writes per frame**; the library pays one write per state change.
  That is why there is no animation runtime here.
- **Percentages are resolved by the library**, not the core: a size or inset given as a fraction of
  the parent is converted to pixels after commit and re-resolved when the parent changes.
- **Arcs paint axis-aligned only**, so the spinner steps its arc start (eighteen steps, 90 frames
  per revolution) rather than rotating smoothly.
- **No ARIA tree, no layout engine quirks, no blur.** Do not design around them.

## Judging a change

```bash
bun tools/native/judge.ts --page     # every gallery page against the four gates
bun tools/native/judge.ts --mutants  # each gate must still fail on its mutant
```

A gate only counts if a matching defect turns it red. The current run: 58 mutant targets, no
mismatches. On the page sweep, twenty-four of the twenty-five pages pass all four gates; the Theme
page fails G4 at the base commit as well, so it is a known gap rather than a regression.

## Gallery

`test/native/gallery/main.tsx` renders every component on its own page. A tap in the left or right
eighth of the canvas pages back and forward; taps near a control press it instead. Build and serve
it the way the runbook describes.
