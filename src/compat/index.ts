// The C1 DOM compat layer: maps JSX DOM tags onto PocketJS host types and gives DOM-only
// props a counted policy. mount() calls installCompat(); until then the host config runs
// with an identity hook and behaves exactly as before. Everything silently accepted shows
// up in compatStats().

import { pressingFromPointer } from "../input/pointer.ts";
import { nativeKeyboard } from "../input/text-entry.ts";
import { bindField, fieldFor, openField } from "../input/text-field.ts";
import { type NodeMirror, setProp } from "../internal/pocket.ts";
import { setHostCompat } from "../renderer/host-config.ts";
import {
  type ClassMissPolicy,
  setClassMissPolicy,
  setTokenMapEnabled,
} from "../style/class-runtime.ts";
import { setTextInheritance } from "../style/text-color.ts";
import {
  compatProps,
  setUnknownPropsPolicy,
  textFieldInput,
  type UnknownPropsPolicy,
} from "./props.ts";
import { countUnknownTag } from "./stats.ts";
import {
  hostTypeOf,
  INTERACTIVE_TAGS,
  TEXT_ENTRY_TAGS,
  unknownTagMessage,
} from "./tags.ts";

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
    type(tag) {
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
  });
}

export { type CompatStats, compatStats, resetCompatStats } from "./stats.ts";
