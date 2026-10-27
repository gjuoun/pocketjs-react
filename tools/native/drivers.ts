// Gate 4 drivers for the native pages and the mutant bodies: the visible trigger text and the metric that counts.
// Keys are page numbers (1-based, gallery order). A trigger text must be unique across all pages (the judge searches the whole tree).
import { BTN } from "@pocketjs/framework/input";
import type { Driver } from "../qa/acceptance/drivers.ts";

export const PAGE_DRIVERS: Record<number, Driver[]> = {
  1: [{ kind: "driven", trigger: "Default", metrics: ["text"] }],
  2: [
    { kind: "driven", trigger: "Name", metrics: ["layer"] },
    { kind: "driven", trigger: "Notes", metrics: ["layer"] },
  ],
  3: [{ kind: "static", reason: "a card is a layout container; its buttons are judged on the Button page" }],
  4: [{ kind: "driven", trigger: "Open dialog", metrics: ["layer"] }],
  5: [{ kind: "driven", trigger: "Password", metrics: ["text"] }],
  // The caption changes with the state; the ink is pinned by the label test (G4 reads the caption).
  6: [{ kind: "driven", trigger: "Dim nickname", metrics: ["text"] }],
  7: [{ kind: "static", reason: "a badge is a label; it has no focus, no press and no state" }],
  8: [{ kind: "static", reason: "a separator is a rule; it has no focus, no press and no state" }],
  9: [{ kind: "static", reason: "an avatar is a fallback circle; it has no focus, no press and no state" }],
  10: [{ kind: "driven", trigger: "Add 10%", metrics: ["text"] }],
  11: [{ kind: "static", reason: "a skeleton has no focus, no press and no state; it is static (see skeleton.tsx)" }],
  12: [{ kind: "static", reason: "a spinner has no focus and no press; it steps its arc on a frame pump (see spinner.tsx)" }],
  13: [{ kind: "driven", trigger: "Email me updates", metrics: ["ink"] }],
  14: [{ kind: "driven", trigger: "Airplane mode", metrics: ["offset"] }],
  15: [{ kind: "driven", trigger: "Monthly", metrics: ["text"], keys: [BTN.RIGHT] }],
  16: [{ kind: "driven", trigger: "Per month", metrics: ["text"] }],
  17: [{ kind: "driven", trigger: "Volume", metrics: ["offset"], keys: [BTN.RIGHT] }],
  18: [{ kind: "driven", trigger: "Shipping", metrics: ["text"] }],
  19: [{ kind: "driven", trigger: "Open sheet", metrics: ["layer"] }],
  20: [{ kind: "driven", trigger: "Share", metrics: ["layer"] }],
  21: [{ kind: "driven", trigger: "Draft hint", metrics: ["text"] }],
  22: [{ kind: "driven", trigger: "Dark", metrics: ["text"] }],
};

/** Pages whose gates 1-3 run again after a passing driver (the driver changes the page's state, e.g. a theme). */
export const PAGE_REJUDGE: Record<number, boolean> = { 22: true };
