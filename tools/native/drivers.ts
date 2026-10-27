// Gate 4 drivers for the native pages and the mutant bodies: the visible trigger text and the metric that counts.
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
};
