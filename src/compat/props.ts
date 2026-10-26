// C1 prop policy for DOM-mapped elements. Everything a DOM component passes lands in one
// of four buckets:
//   alias    onClick -> onPress (PocketJS's press semantic: focus + CIRCLE, or a click)
//   drop     data-*/aria-* (no ARIA tree in PocketJS - recorded, honestly) and the DOM
//            attribute/event surface the core has no answer for yet; dropped and counted,
//            never forwarded, because the core throws on unrecognized props
//   pass     the PocketJS host surface (className/style/focusable/onPress/debugName/ref)
//   unknown  anything else - throws naming the prop, the tag and the switch, or drops and
//            counts under mount({ compat: { unknownProps: "drop" } })
//
// C4 adds a fifth bucket for text entry tags (input/textarea): the field surface
// (value/defaultValue/placeholder/maxLength/onChange/onInput/name, and type=password) is
// consumed by the field binding and counted in mappedAttrs; the rest of the DOM input
// surface (rows, autoComplete, min/max, readOnly, ...) drops and counts instead of throwing,
// because shadcn's {...props} pass-through must not crash. onClick is left to the binding:
// pressing the field opens its keyboard and then calls the app's handler.
import type { TextFieldInput } from "../input/text-field.ts";
import { parseRing } from "./ring.ts";
import { resolveSelectors, selectorInputs } from "./selectors.ts";
import {
  countDroppedAttr,
  countMappedAttr,
  countUnknownAttr,
} from "./stats.ts";
import { isMapped, TEXT_ENTRY_TAGS } from "./tags.ts";

const ALIAS: Record<string, string> = { onClick: "onPress" };

const DROP_ATTRS = new Set([
  "role",
  "type",
  "disabled",
  "tabIndex",
  "href",
  "alt",
  "placeholder",
  "value",
  "defaultValue",
  "name",
  "htmlFor",
  "autoFocus",
  "asChild",
  "dir",
  "lang",
  "target",
  "rel",
  "srcSet",
  "loading",
  "size",
  "slot",
]);

const DROP_EVENTS = new Set([
  "onChange",
  "onInput",
  "onFocus",
  "onBlur",
  "onKeyDown",
  "onPointerDown",
  "onPointerUp",
  "onMouseEnter",
  "onMouseLeave",
  "onSubmit",
]);

const PASS = new Set([
  "className",
  "style",
  "focusable",
  "onPress",
  "debugName",
  "ref",
]);

/** Props the text field binding consumes; they never reach the native view. */
const TEXT_FIELD_ATTRS = new Set([
  "value",
  "defaultValue",
  "placeholder",
  "maxLength",
  "onChange",
  "onInput",
  "name",
]);

/** The rest of the DOM input surface. PocketJS has no answer for these (C4 keeps the field
 *  to value/maxLength/placeholder), so they drop and count rather than throw: a shadcn
 *  component spreads whatever props its caller passed. */
const INPUT_DROP_ATTRS = new Set([
  "readOnly",
  "rows",
  "cols",
  "wrap",
  "autoComplete",
  "autoCapitalize",
  "autoCorrect",
  "spellCheck",
  "inputMode",
  "enterKeyHint",
  "minLength",
  "min",
  "max",
  "step",
  "pattern",
  "form",
  "formAction",
  "formMethod",
  "formNoValidate",
  "list",
  "multiple",
  "accept",
  "capture",
  "checked",
  "required",
  "dirName",
  "onPaste",
  "onCut",
  "onCopy",
  "onSelect",
  "onCompositionStart",
  "onCompositionEnd",
]);

export type UnknownPropsPolicy = "throw" | "drop";
let unknownProps: UnknownPropsPolicy = "throw";

export function setUnknownPropsPolicy(mode: UnknownPropsPolicy): void {
  unknownProps = mode;
}

export type Props = Record<string, unknown>;

/** Normalize the raw DOM props of a text entry into the field's own input. Counts what
 *  the mapping consumed (once per mount) so nothing disappears silently. */
export function textFieldInput(
  tag: string,
  props: Props,
  count: boolean,
): TextFieldInput {
  const masked = props.type === "password";
  const readOnly = props.value !== undefined && props.onChange === undefined;
  if (count) {
    for (const key of TEXT_FIELD_ATTRS) if (key in props) countMappedAttr(key);
    if (masked) countMappedAttr("type");
    if (props.onClick !== undefined) countMappedAttr("onClick");
    if (readOnly) countMappedAttr("readOnlyField");
  }
  const text = (value: unknown): string | undefined =>
    typeof value === "string"
      ? value
      : typeof value === "number"
        ? String(value)
        : undefined;
  return {
    value: text(props.value),
    defaultValue: text(props.defaultValue),
    placeholder: text(props.placeholder),
    maxLength:
      typeof props.maxLength === "number" ? props.maxLength : undefined,
    masked,
    multiline: tag === "textarea",
    name: text(props.name),
    onChange: props.onChange as TextFieldInput["onChange"],
    onInput: props.onInput as TextFieldInput["onInput"],
    onClick: props.onClick as TextFieldInput["onClick"],
  };
}

export function compatProps(
  tag: string,
  props: Props,
  interactive: boolean,
  count: boolean,
): Props {
  const text = TEXT_ENTRY_TAGS.has(tag);
  const out: Props = {};
  // C8: selector tokens resolve against this node's own props and children; the DOM props they
  // read (disabled, aria-invalid, data-*) are consumed by the class, not dropped.
  const inputs = selectorInputs(props.className);
  const className =
    typeof props.className === "string"
      ? resolveSelectors(props.className, { props, children: props.children })
      : undefined;
  for (const key in props) {
    if (key === "children") continue;
    if (inputs.has(key)) {
      if (count) countMappedAttr(key);
      continue;
    }
    // Batch A (R-L): an element's id is consumed by the label map (src/input/label-map.ts), which
    // the compat bind hook registers; it never reaches the native node.
    if (key === "id") {
      if (count) countMappedAttr("id");
      continue;
    }
    if (
      text &&
      (TEXT_FIELD_ATTRS.has(key) ||
        (key === "type" && props.type === "password"))
    )
      continue;
    if (text && key === "onClick") continue;
    // A native image's texture key is the PocketJS surface (icons), not a DOM attribute.
    if (tag === "image" && key === "src") {
      out.src = props[key];
      continue;
    }
    const alias = ALIAS[key];
    if (alias !== undefined) {
      out[alias] = props[key];
      continue;
    }
    if (PASS.has(key)) {
      out[key] = props[key];
      continue;
    }
    if (
      key.startsWith("data-") ||
      key.startsWith("aria-") ||
      DROP_ATTRS.has(key) ||
      DROP_EVENTS.has(key) ||
      (text && INPUT_DROP_ATTRS.has(key))
    ) {
      if (count) countDroppedAttr(key);
      continue;
    }
    if (unknownProps === "drop") {
      if (count) countUnknownAttr(key);
      continue;
    }
    throw new Error(
      "pocketjs-react: unknown property '" +
        key +
        "' on <" +
        tag +
        "> - not a prop the DOM" +
        ' compat layer maps; pass mount({ compat: { unknownProps: "drop" } }) to drop and count it',
    );
  }
  if (className !== undefined) out.className = className;
  // Focus defaults: interactive tags and any onClick/onPointerDown carrier join the d-pad
  // traversal; an explicit focusable prop always wins; plain elements stay untouched so the
  // native View/Text surface behaves exactly as before.
  const focusable =
    props.focusable ??
    (interactive || text || "onClick" in props || "onPointerDown" in props);
  if (focusable) {
    out.focusable = true;
    // Only DOM-mapped tags: a native View/Text keeps its own focus surface.
    if (isMapped(tag))
      out.className = parseRing(out.className as string | undefined).rest;
  } else if (props.focusable === false) out.focusable = false;
  return out;
}
