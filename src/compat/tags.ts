// C1 tag alias table: React DOM vocabulary -> PocketJS host types (the audit's L1 map,
// product-sized). Interactive tags become focusable views, so d-pad focus and CIRCLE press
// work on them like on every native focusable. <input>/<textarea> mount as views too (the
// core has no text-input node) and C4's field binding gives them text children and a
// keyboard. Tags outside this table stay unknown and throw with an actionable message.
export const TAG_TO_HOST: Record<string, string> = {
  // boxes
  div: "view",
  section: "view",
  main: "view",
  header: "view",
  footer: "view",
  nav: "view",
  aside: "view",
  ul: "view",
  ol: "view",
  li: "view",
  // interactive boxes (focusable; a navigates nowhere, there is no web)
  button: "view",
  a: "view",
  input: "view",
  textarea: "view",
  // text
  span: "text",
  p: "text",
  label: "text",
  strong: "text",
  em: "text",
  code: "text",
  pre: "text",
  h1: "text",
  h2: "text",
  h3: "text",
  h4: "text",
  h5: "text",
  h6: "text",
  // Batch 1 (the 14 tags the shadcn batch needs; each decision is listed in TAG_DEFAULTS' notes).
  // Tables are views that stack (table, thead, tbody, tfoot) or lay cells in a row (tr); a cell is a view
  // that holds its text (th, td). caption and legend are text: a run with no block children.
  table: "view",
  thead: "view",
  tbody: "view",
  tfoot: "view",
  tr: "view",
  th: "view",
  td: "view",
  caption: "text",
  fieldset: "view",
  legend: "text",
  // A native select is a focusable field, not a popup: it stays native and shows its selected option
  // (see option). The Select primitive is the picker with a list.
  select: "view",
  option: "text",
  optgroup: "view",
  kbd: "view",
  // batch 4: chart's ChartStyle emits a <style> of colour variables. The core has no CSS, so the element is a hidden view.
  style: "view",
};

/**
 * Default classes a DOM tag brings (merged under the caller's className with cn, so the caller wins).
 * Each one is the layout the browser gives that tag, in PocketJS vocabulary:
 *   table, thead, tbody, tfoot, optgroup, fieldset  stack their children (flex-col)
 *   tr                                              lays its cells in a row
 *   th, td                                          one cell: a row that centres its text, with the rule
 *                                                   drawn as a full border (the core has one border, all sides)
 *   caption, legend                                 small text; legend is the group's bold heading
 *   select                                          a field frame (border, radius, padding), its option inside
 *   kbd                                             a key cap: border, tint, padding, bold small text
 */
export const TAG_DEFAULTS: Readonly<Record<string, string>> = {
  table: "flex-col",
  thead: "flex-col",
  tbody: "flex-col",
  tfoot: "flex-col",
  optgroup: "flex-col",
  fieldset: "flex-col gap-2",
  tr: "flex-row",
  th: "flex-1 flex-row items-center px-2 py-1 border border-slate-200 text-sm font-bold",
  td: "flex-1 flex-row items-center px-2 py-1 border border-slate-200 text-sm",
  caption: "text-sm text-slate-500",
  legend: "text-sm font-bold",
  select:
    "flex-row items-center px-3 py-2 border border-slate-200 rounded-md text-sm bg-white",
  style: "hidden",
  kbd: "flex-row items-center justify-center px-1 border border-slate-300 bg-slate-100 rounded-sm text-xs font-bold",
};

/** Views whose raw text runs are held by a text element (the same holder a flex span uses). */
export const TEXT_HOLDING_VIEW_TAGS = new Set(["th", "td", "kbd"]);

/** Tags that render as focusable views; the prop policy extends this to any tag carrying
 *  an onClick/onPointerDown handler. */
export const INTERACTIVE_TAGS = new Set([
  "button",
  "a",
  "input",
  "textarea",
  "select",
]);

/** Tags that mount as an editable field: a focusable view plus the text children the
 *  compat layer owns (React never gives <input> children). C4. */
export const TEXT_ENTRY_TAGS = new Set(["input", "textarea"]);

const HOST_TYPES = new Set(["view", "text", "image"]);

/** The host type a JSX tag creates: the tag itself for PocketJS-native types, the mapped
 *  host for a DOM tag, null for anything else (the caller throws). */
export function hostTypeOf(tag: string): string | null {
  if (HOST_TYPES.has(tag)) return tag;
  return TAG_TO_HOST[tag] ?? null;
}

/** True when the tag went through the table (native view/text/image are not "mapped"). */
export function isMapped(tag: string): boolean {
  return TAG_TO_HOST[tag] !== undefined;
}

export function unknownTagMessage(tag: string): string {
  return (
    "pocketjs-react: unknown host element <" +
    tag +
    "> - not a PocketJS host type" +
    " (view/text/image) or a DOM tag in the compat table (div/section/main/header/footer/" +
    "nav/aside/ul/ol/li, span/p/label/strong/em/code/pre/h1..h6, button/a, input/textarea," +
    " table/thead/tbody/tfoot/tr/th/td/caption, fieldset/legend, select/option/optgroup, kbd)"
  );
}
