// The C1 DOM compat layer: maps JSX DOM tags onto PocketJS host types and gives DOM-only
// props a counted policy. mount() calls installCompat(); until then the host config runs
// with an identity hook and behaves exactly as before.
import { setHostCompat } from "../renderer/host-config.ts";
import { INTERACTIVE_TAGS, hostTypeOf, unknownTagMessage } from "./tags.ts";

export function installCompat(): void {
  setHostCompat({
    type(tag) {
      const host = hostTypeOf(tag);
      if (host === null) throw new Error(unknownTagMessage(tag));
      return host;
    },
    props(tag, props) {
      const out: Record<string, unknown> = {};
      for (const key in props) {
        if (key === "children") continue;
        out[key] = props[key];
      }
      if (INTERACTIVE_TAGS.has(tag) && props.focusable === undefined) out.focusable = true;
      return out;
    },
  });
}
