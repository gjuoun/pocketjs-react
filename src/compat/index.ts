// The C1 DOM compat layer: maps JSX DOM tags onto PocketJS host types and gives DOM-only
// props a counted policy. mount() calls installCompat(); until then the host config runs
// with an identity hook and behaves exactly as before. Everything silently accepted shows
// up in compatStats().

import { pressingFromPointer } from "../input/pointer.ts";
import { nativeKeyboard } from "../input/text-entry.ts";
import { bindField, fieldFor, openField } from "../input/text-field.ts";
import { NODE_TYPE, type NodeMirror, setProp } from "../internal/pocket.ts";
import { setHostCompat } from "../renderer/host-config.ts";
import {
  type ClassMissPolicy,
  classStringValue,
  setClassMissPolicy,
  setTokenMapEnabled,
} from "../style/class-runtime.ts";
import { setIconRule } from "../style/icon-colour.ts";
import { setTextInheritance } from "../style/text-color.ts";
import {
  compatProps,
  setUnknownPropsPolicy,
  textFieldInput,
  type UnknownPropsPolicy,
} from "./props.ts";
import { iconTextRule } from "./selectors.ts";
import { countUnknownTag } from "./stats.ts";
import {
  hostTypeOf,
  INTERACTIVE_TAGS,
  isMapped,
  TAG_DEFAULTS,
  TEXT_ENTRY_TAGS,
  TEXT_HOLDING_VIEW_TAGS,
  unknownTagMessage,
} from "./tags.ts";
import { cn } from "../style/cn.ts";
import { bindOption, bindSelect } from "./selects.ts";
import { heldBy, holdRun, markTextual } from "./text-wrap.ts";
import { setClipper, clipsOverflow } from "../focus/ring.ts";
import { ownsFocusBorder } from "./focus.ts";
import { registerControl } from "../input/label-map.ts";
import { focusRingOf, setRingTarget } from "./ring.ts";
import { rewriteLiteral } from "./tokens.ts";

/** DOM text tags that become views when they carry flex. */
const TEXTUAL_FLEX_TAGS = new Set(["span", "p", "label"]);

/** One press handler per text entry node: open its keyboard, then run the app's onClick. */
const pressHandlers = new WeakMap<NodeMirror, () => void>();

export interface CompatOptions {
  /** Props the compat layer does not recognize: "throw" (default) or "drop" (counted). */
  unknownProps?: UnknownPropsPolicy;
  /** Class tokens outside the build table: "throw" (default) or "drop" (counted, subset kept). */
  classMiss?: ClassMissPolicy;
  /** Rewrite shadcn vocabulary through the fixed token map before resolving (default true). */
  tokenMap?: boolean;
  /** Default text colour for text with no colour of its own (shadcn light foreground). Null turns
   *  the inheritance pass off. Default "#0f172a" (slate-900). */
  textColor?: string | null;
}

export function installCompat(opts: CompatOptions = {}): void {
  setUnknownPropsPolicy(opts.unknownProps ?? "throw");
  setClassMissPolicy(opts.classMiss ?? "throw");
  setTokenMapEnabled(opts.tokenMap ?? true);
  setTextInheritance(opts.textColor === undefined ? "#0f172a" : opts.textColor);
  setHostCompat({
    type(tag, props) {
      // A DOM text tag with flex is a view: its layout (centring) is the point.
      if (
        TEXTUAL_FLEX_TAGS.has(tag) &&
        typeof props.className === "string" &&
        /(^|\s)flex(\s|$)/.test(props.className)
      )
        return "view";
      const host = hostTypeOf(tag);
      if (host === null) {
        countUnknownTag();
        throw new Error(unknownTagMessage(tag));
      }
      return host;
    },
    props(tag, props, count) {
      return compatProps(tag, props, INTERACTIVE_TAGS.has(tag), count);
    },
    bind(node, tag, props, count) {
      setClipper(node, clipsOverflow(props.className, props.style));
      // Batch 1: a cell or key cap holds its raw text the way a flex span does; its defaults count as its classes.
      const classes =
        TAG_DEFAULTS[tag] !== undefined
          ? cn(TAG_DEFAULTS[tag], props.className as string | undefined)
          : props.className;
      if (tag === "select") bindSelect(node, props);
      if (tag === "option") bindOption(node, props);
      if (
        (TEXTUAL_FLEX_TAGS.has(tag) || TEXT_HOLDING_VIEW_TAGS.has(tag)) &&
        node.type === NODE_TYPE.view
      )
        markTextual(node, classes);
      // Batch A (R-L): the element's DOM id names it for a Label's htmlFor (a tap focuses it).
      if (typeof props.id === "string") registerControl(props.id, node);
      // C8: a [&_svg]:text-* rule colours the icons below this node (its own icons keep their own colour).
      const iconClass = iconTextRule(props.className);
      setIconRule(
        node,
        iconClass === undefined
          ? undefined
          : classStringValue(rewriteLiteral(iconClass), "textColor"),
      );
      // The focus ring of a DOM-mapped focusable: its own ring tokens, or the default ring.
      setRingTarget(
        node,
        isMapped(tag) && node.focusable && !ownsFocusBorder(props.className as string | undefined, props.style)
          ? focusRingOf(props.className, props.style)
          : null,
      );
      if (!TEXT_ENTRY_TAGS.has(tag)) return;
      const known = fieldFor(node) !== undefined;
      const binding = bindField(node, tag, textFieldInput(tag, props, count));
      if (!known) {
        const handler = () => {
          // C4c: on a touch host a tap summons the native keyboard; the panel stays for CIRCLE.
          if (!(pressingFromPointer() && nativeKeyboard())) openField(binding);
          binding.input.onClick?.();
        };
        pressHandlers.set(node, handler);
        setProp(node, "onPress", handler);
      }
    },
    hold: holdRun,
    heldBy,
  });
}

export { type CompatStats, compatStats, resetCompatStats } from "./stats.ts";
