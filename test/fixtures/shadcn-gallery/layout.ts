// Gallery layout as data: one entry per vendored shadcn component (test/fixtures/shadcn-full/ui/*.tsx),
// each section's fixed height, and the scroll arithmetic. No React here, so the proof test reads the same
// numbers the page uses. A section is at most VIEW_H px (272), so a section snapped to the top fits the screen.
// The column ends with a tail (TAIL_H) so the last section can also snap to the top of the screen.

/** The logical screen height the page scrolls inside. */
export const VIEW_H = 272;
/** The title bar at the top of every section. */
export const TITLE_H = 20;

export const SECTIONS = [
  { name: "accordion", h: 155 },
  { name: "alert-dialog", h: 80 },
  { name: "alert", h: 90 },
  { name: "aspect-ratio", h: 170 },
  { name: "attachment", h: 80 },
  { name: "avatar", h: 80 },
  { name: "badge", h: 80 },
  { name: "breadcrumb", h: 70 },
  { name: "bubble", h: 110 },
  { name: "button-group", h: 90 },
  { name: "button", h: 156 },
  { name: "calendar", h: 263 },
  { name: "card", h: 200 },
  { name: "carousel", h: 150 },
  { name: "chart", h: 170 },
  { name: "checkbox", h: 90 },
  { name: "collapsible", h: 110 },
  { name: "combobox", h: 130 },
  { name: "command", h: 260 },
  { name: "context-menu", h: 100 },
  { name: "dialog", h: 80 },
  { name: "direction", h: 60 },
  { name: "drawer", h: 80 },
  { name: "dropdown-menu", h: 80 },
  { name: "empty", h: 184 },
  { name: "field", h: 220 },
  { name: "form", h: 200 },
  { name: "hover-card", h: 80 },
  { name: "input-group", h: 80 },
  { name: "input-otp", h: 90 },
  { name: "input", h: 80 },
  { name: "item", h: 150 },
  { name: "kbd", h: 60 },
  { name: "label", h: 85 },
  { name: "marker", h: 60 },
  { name: "menubar", h: 80 },
  { name: "message-scroller", h: 180 },
  { name: "message", h: 150 },
  { name: "native-select", h: 80 },
  { name: "navigation-menu", h: 90 },
  { name: "pagination", h: 80 },
  { name: "popover", h: 80 },
  { name: "progress", h: 80 },
  { name: "radio-group", h: 110 },
  { name: "resizable", h: 150 },
  { name: "scroll-area", h: 150 },
  { name: "select", h: 80 },
  { name: "separator", h: 80 },
  { name: "sheet", h: 80 },
  { name: "sidebar", h: 260 },
  { name: "skeleton", h: 80 },
  { name: "slider", h: 80 },
  { name: "sonner", h: 80 },
  { name: "spinner", h: 60 },
  { name: "switch", h: 80 },
  { name: "table", h: 200 },
  { name: "tabs", h: 150 },
  { name: "textarea", h: 100 },
  { name: "toggle-group", h: 90 },
  { name: "toggle", h: 80 },
  { name: "tooltip", h: 80 },
] as const;

export type SectionName = (typeof SECTIONS)[number]["name"];

/** Top of each section on the content column (the sum of the heights above it). */
export const TOPS: number[] = SECTIONS.map((_, i) =>
  SECTIONS.slice(0, i).reduce((n, s) => n + s.h, 0),
);
/**
 * The tail after the last section: VIEW_H minus the last section's height. With it, the last section's top can
 * sit at the top of the screen, so the last section is the topmost one at the end. The page draws it as a footer.
 */
export const TAIL_H = Math.max(0, VIEW_H - SECTIONS[SECTIONS.length - 1].h);
/** The content column's full length: the sections, then the tail. */
export const TOTAL = SECTIONS.reduce((n, s) => n + s.h, 0) + TAIL_H;
/** The largest offset: the last section's top is at the top of the screen (the tail fills the rest). */
export const MAX_OFFSET = Math.max(0, TOTAL - VIEW_H);

/** The offset one DOWN press moves to: the next section top, clamped to the end. */
export function nextTop(off: number): number {
  const t = TOPS.find((top) => top > off + 0.5);
  return Math.min(t ?? MAX_OFFSET, MAX_OFFSET);
}

/** The offset one UP press moves to: the nearest section top above, or the top of the page. */
export function prevTop(off: number): number {
  let p = 0;
  for (const top of TOPS) if (top < off - 0.5) p = top;
  return Math.min(p, MAX_OFFSET);
}
