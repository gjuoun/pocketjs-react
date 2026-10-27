// Gate 4 drivers for the native pages and the mutant bodies: the visible trigger text and the metric that counts.
// Drivers are written by page name (test/native/gallery/names.ts) and mapped to the judge's 1-based page numbers, so a page
// inserted in the list does not renumber the rest. A page with no entry throws: a page is never judged without its driver
// (a static page says why). A trigger text must be unique across all pages (the judge searches the whole tree).
import { BTN } from "@pocketjs/framework/input";
import type { Driver } from "../qa/acceptance/drivers.ts";
import { PAGE_NAMES } from "../../test/native/gallery/names.ts";

const BY_NAME: Record<string, Driver[]> = {
  Button: [{ kind: "driven", trigger: "Default", metrics: ["text"] }],
  // The keyboard's keys are focusable controls, so their labels are control text: G4's "layer" metric counts no panel text.
  // The press still draws the caret in the field ("ink"), and the keyboard itself is pinned by test/native/osk-tap.test.tsx.
  Input: [
    { kind: "driven", trigger: "Name", metrics: ["layer", "ink"] },
    { kind: "driven", trigger: "Notes", metrics: ["layer", "ink"] },
  ],
  Card: [{ kind: "static", reason: "a card is a layout container; its buttons are judged on the Button page" }],
  Dialog: [{ kind: "driven", trigger: "Open dialog", metrics: ["layer"] }],
  Tabs: [{ kind: "driven", trigger: "Password", metrics: ["text"] }],
  // The caption changes with the state; the ink is pinned by the label test (G4 reads the caption).
  Label: [{ kind: "driven", trigger: "Dim nickname", metrics: ["text"] }],
  Badge: [{ kind: "static", reason: "a badge is a label; it has no focus, no press and no state" }],
  Separator: [{ kind: "static", reason: "a separator is a rule; it has no focus, no press and no state" }],
  Avatar: [{ kind: "static", reason: "an avatar is a fallback circle; it has no focus, no press and no state" }],
  Progress: [{ kind: "driven", trigger: "Add 10%", metrics: ["text"] }],
  Skeleton: [{ kind: "static", reason: "a skeleton has no focus, no press and no state; it is static (see skeleton.tsx)" }],
  Spinner: [{ kind: "static", reason: "a spinner has no focus and no press; it steps its arc on a frame pump (see spinner.tsx)" }],
  Checkbox: [{ kind: "driven", trigger: "Email me updates", metrics: ["ink"] }],
  Switch: [{ kind: "driven", trigger: "Airplane mode", metrics: ["offset"] }],
  RadioGroup: [{ kind: "driven", trigger: "Monthly", metrics: ["text"], keys: [BTN.RIGHT] }],
  // CIRCLE opens the list (its options are controls, so opening alone adds no panel text), DOWN and CIRCLE choose the next
  // option, and the page's billing label changes: that changed panel text is what G4 counts.
  Select: [{ kind: "driven", trigger: "Per month", metrics: ["text"], keys: [BTN.CIRCLE, BTN.DOWN, BTN.CIRCLE] }],
  Slider: [{ kind: "driven", trigger: "Volume", metrics: ["offset"], keys: [BTN.RIGHT] }],
  Accordion: [{ kind: "driven", trigger: "Shipping", metrics: ["text"] }],
  Sheet: [{ kind: "driven", trigger: "Open sheet", metrics: ["layer"] }],
  Popover: [{ kind: "driven", trigger: "Share", metrics: ["layer"] }],
  // A tooltip opens on focus, and the driver takes its baseline after focusing: the open is in the baseline, so no press shows it.
  // Its frame-counted open and close are pinned by test/native/tooltip.test.tsx.
  Tooltip: [{ kind: "static", reason: "a tooltip opens on focus; the driver's baseline is taken after focus, so the open is not a press's effect" }],
  DropdownMenu: [{ kind: "driven", trigger: "Actions", metrics: ["layer"] }],
  Toast: [{ kind: "driven", trigger: "Notify", metrics: ["text"] }],
  Table: [{ kind: "static", reason: "a table is display only: no focus, no press and no state" }],
  Breadcrumb: [{ kind: "driven", trigger: "Usage", metrics: ["text"] }],
  Alert: [{ kind: "driven", trigger: "Dismiss", metrics: ["text"] }],
  Empty: [{ kind: "driven", trigger: "Create project", metrics: ["text"] }],
  Field: [{ kind: "driven", trigger: "Validate", metrics: ["text"] }],
  Pagination: [{ kind: "driven", trigger: "Next", metrics: ["text"] }],
  // The cells are one-character fields, each with the placeholder "_"; the first is the trigger, and its caret is the ink.
  InputOTP: [{ kind: "driven", trigger: "_", metrics: ["ink"] }],
  NavigationMenu: [{ kind: "driven", trigger: "Products", metrics: ["layer"] }],
  Command: [{ kind: "driven", trigger: "Calendar", metrics: ["text"] }],
  // The section switch shows each later section in turn, back to section 1, then the theme toggle (which reads section 1's label).
  // The judge re-judges G1-G3 after each pass.
  Theme: [
    { kind: "driven", trigger: "2/4", metrics: ["text"] },
    { kind: "driven", trigger: "3/4", metrics: ["text"] },
    { kind: "driven", trigger: "4/4", metrics: ["text"] },
    { kind: "driven", trigger: "1/4", metrics: ["text"] },
    { kind: "driven", trigger: "Dark", metrics: ["text"] },
  ],
};

/** Pages whose gates 1-3 run again after a passing driver (the driver changes the page's state, e.g. a theme). */
const REJUDGE_BY_NAME: Record<string, boolean> = { Theme: true };

function byNumber<T>(table: (name: string) => T): Record<number, T> {
  return Object.fromEntries(PAGE_NAMES.map((name, i) => [i + 1, table(name)])) as Record<number, T>;
}

for (const name of PAGE_NAMES) {
  if (!(name in BY_NAME)) throw new Error("drivers: page " + JSON.stringify(name) + " has no driver entry (add a driven or static one)");
}

export const PAGE_DRIVERS: Record<number, Driver[]> = byNumber((n) => BY_NAME[n]);
export const PAGE_REJUDGE: Record<number, boolean> = byNumber((n) => REJUDGE_BY_NAME[n] === true);
