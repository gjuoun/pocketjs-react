// C1 prop policy for DOM-mapped elements. Everything a DOM component passes lands in one
// of four buckets:
//   alias    onClick -> onPress (PocketJS's press semantic: focus + CIRCLE, or a click)
//   drop     data-*/aria-* (no ARIA tree in PocketJS - recorded, honestly) and the DOM
//            attribute/event surface the core has no answer for yet; dropped and counted,
//            never forwarded, because the core throws on unrecognized props
//   pass     the PocketJS host surface (className/style/focusable/onPress/debugName/ref)
//   unknown  anything else - throws naming the prop, the tag and the switch, or drops and
//            counts under mount({ compat: { unknownProps: "drop" } })
import { countDroppedAttr, countUnknownAttr } from "./stats.ts";

const ALIAS: Record<string, string> = { onClick: "onPress" };

const DROP_ATTRS = new Set([
  "role", "id", "type", "disabled", "tabIndex", "href", "alt", "placeholder",
  "value", "defaultValue", "name", "htmlFor", "autoFocus", "asChild", "dir",
  "lang", "target", "rel", "srcSet", "loading", "size", "slot",
]);

const DROP_EVENTS = new Set([
  "onChange", "onInput", "onFocus", "onBlur", "onKeyDown", "onPointerDown",
  "onPointerUp", "onMouseEnter", "onMouseLeave", "onSubmit",
]);

const PASS = new Set(["className", "style", "focusable", "onPress", "debugName", "ref"]);

export type UnknownPropsPolicy = "throw" | "drop";
let unknownProps: UnknownPropsPolicy = "throw";

export function setUnknownPropsPolicy(mode: UnknownPropsPolicy): void {
  unknownProps = mode;
}

export type Props = Record<string, unknown>;

export function compatProps(tag: string, props: Props, interactive: boolean, count: boolean): Props {
  const out: Props = {};
  for (const key in props) {
    if (key === "children") continue;
    const alias = ALIAS[key];
    if (alias !== undefined) {
      out[alias] = props[key];
      continue;
    }
    if (PASS.has(key)) {
      out[key] = props[key];
      continue;
    }
    if (key.startsWith("data-") || key.startsWith("aria-") || DROP_ATTRS.has(key) || DROP_EVENTS.has(key)) {
      if (count) countDroppedAttr(key);
      continue;
    }
    if (unknownProps === "drop") {
      if (count) countUnknownAttr(key);
      continue;
    }
    throw new Error(
      "pocketjs-react: unknown property '" + key + "' on <" + tag + "> - not a prop the DOM" +
        ' compat layer maps; pass mount({ compat: { unknownProps: "drop" } }) to drop and count it',
    );
  }
  // Focus defaults: interactive tags and any onClick/onPointerDown carrier join the d-pad
  // traversal; an explicit focusable prop always wins; plain elements stay untouched so the
  // native View/Text surface behaves exactly as before.
  const focusable = props.focusable ?? (interactive || "onClick" in props || "onPointerDown" in props);
  if (focusable) out.focusable = true;
  else if (props.focusable === false) out.focusable = false;
  return out;
}
