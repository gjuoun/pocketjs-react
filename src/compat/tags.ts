// C1 tag alias table: React DOM vocabulary -> PocketJS host types (the audit's L1 map,
// product-sized). Interactive tags become focusable views, so d-pad focus and CIRCLE press
// work on them like on every native focusable. <input> only stops crashing - real text
// input is C4. Tags outside this table stay unknown and throw with an actionable message.
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
};

/** Tags that render as focusable views; the prop policy extends this to any tag carrying
 *  an onClick/onPointerDown handler. */
export const INTERACTIVE_TAGS = new Set(["button", "a"]);

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
    "nav/aside/ul/ol/li, span/p/label/strong/em/code/pre/h1..h6, button/a, input)"
  );
}
