// Gate 4 drivers: one entry per vendored component (the 61 gallery names). A driven entry names the trigger
// (the visible text of the element to focus and press) and the metrics that count as a state change. A static
// entry says why the default usage has no input to exercise. An unresolved entry is interactive and has no
// driver yet: it is reported, never passed. `opens: "focus"` is for a layer that opens on focus (a tooltip): the baseline is
// taken before the focus, and the focus is the action. Such a driver never counts "ink" (the focus ring is ink).
import type { SectionName } from "../../../test/fixtures/shadcn-gallery/layout.ts";

export type Metric = "layer" | "text" | "ink" | "offset" | "menu";
export type Driver =
  | { kind: "driven"; trigger: string; metrics: Metric[]; keys?: number[]; opens?: "press" | "focus" }
  | { kind: "static"; reason: string }
  | { kind: "unresolved"; reason: string };

const STATIC = (reason: string): Driver => ({ kind: "static", reason });
const OPEN = (trigger: string): Driver => ({ kind: "driven", trigger, metrics: ["layer"] });
const TODO = (reason: string): Driver => ({ kind: "unresolved", reason });
const SHOWN = STATIC("display only in its default usage");

export const DRIVERS: Record<SectionName, Driver> = {
  accordion: TODO("accordion: press a trigger, expect the panel to open (no driver yet)"),
  "alert-dialog": TODO("alert-dialog: press the trigger, expect a dialog layer (no driver yet)"),
  alert: SHOWN,
  "aspect-ratio": SHOWN,
  attachment: SHOWN,
  avatar: SHOWN,
  badge: SHOWN,
  breadcrumb: STATIC("links are display in the default usage; no navigation target"),
  bubble: SHOWN,
  "button-group": TODO("button-group: press a button, expect a state change (no driver yet)"),
  button: TODO("button: press, expect the press handler to run (no visible state in the default usage)"),
  calendar: TODO("calendar: press a day, expect the selected state to change (no driver yet)"),
  card: SHOWN,
  carousel: TODO("carousel: press next, expect the offset to change (no driver yet; the content column is not scrollable on the stock core)"),
  chart: STATIC("the chart is a placeholder child; no series is drawn"),
  checkbox: TODO("checkbox: press, expect the checked state to change (no driver yet)"),
  collapsible: TODO("collapsible: press the trigger, expect the content to open (no driver yet)"),
  combobox: TODO("combobox: open the list, expect a layer (no driver yet)"),
  command: TODO("command: type or press an item, expect a state change (no driver yet)"),
  "context-menu": TODO("context-menu: long press, expect a layer (no driver yet; gesture not wired)"),
  dialog: TODO("dialog: its trigger text is not in the gallery body (no driver yet)"),
  direction: SHOWN,
  drawer: TODO("drawer: press the trigger, expect a layer (no driver yet)"),
  "dropdown-menu": TODO("dropdown-menu: press the trigger, expect a layer (no driver yet)"),
  empty: SHOWN,
  field: TODO("field: contains an input; drive the input (no driver yet)"),
  form: TODO("form: contains inputs and a submit button (no driver yet)"),
  "hover-card": TODO("hover-card: focus, expect a layer (no driver yet; hover is not a pocket input)"),
  "input-group": TODO("input-group: focus the input, expect a state change (no driver yet)"),
  "input-otp": TODO("input-otp: type a digit, expect the slot to fill (no driver yet)"),
  input: TODO("input: focus and type, expect the value to change (no driver yet)"),
  item: SHOWN,
  kbd: SHOWN,
  label: STATIC("a label only; its input is judged in its own section"),
  marker: SHOWN,
  menubar: TODO("menubar: press a menu, expect a layer (no driver yet)"),
  "message-scroller": TODO("message-scroller: scroll the list, expect the offset to change (no driver yet)"),
  message: SHOWN,
  "native-select": TODO("native-select: press, expect a layer (no driver yet)"),
  "navigation-menu": TODO("navigation-menu: press an item, expect the content to change (no driver yet)"),
  pagination: TODO("pagination: press next, expect the page to change (no driver yet)"),
  popover: TODO("popover: press the trigger, expect a layer (no driver yet)"),
  progress: STATIC("a progress bar has no input in its default usage"),
  "radio-group": TODO("radio-group: press an option, expect the checked state to change (no driver yet)"),
  resizable: TODO("resizable: drag the handle, expect the panel sizes to change (no driver yet; drag not wired on the stock core)"),
  "scroll-area": TODO("scroll-area: scroll, expect the offset to change (fails on the stock core: the range is 0)"),
  select: TODO("select: press, expect a layer (no driver yet)"),
  separator: SHOWN,
  sheet: OPEN("Open sheet"),
  sidebar: TODO("sidebar: press an item, expect the active state to change (no driver yet)"),
  skeleton: SHOWN,
  slider: TODO("slider: press right, expect the value to change (no driver yet)"),
  sonner: TODO("sonner: press to raise a toast, expect a text run (no driver yet)"),
  spinner: SHOWN,
  switch: TODO("switch: press, expect the on state to change (no driver yet)"),
  table: SHOWN,
  tabs: TODO("tabs: press a tab, expect the panel to change (no driver yet)"),
  textarea: TODO("textarea: focus and type, expect the value to change (no driver yet)"),
  "toggle-group": TODO("toggle-group: press an item, expect the pressed state to change (no driver yet)"),
  toggle: TODO("toggle: press, expect the pressed state to change (no driver yet)"),
  tooltip: TODO("tooltip: focus, expect a layer (no driver yet; hover is not a pocket input)"),
};
