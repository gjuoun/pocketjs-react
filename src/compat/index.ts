// The C1 DOM compat layer: maps JSX DOM tags onto PocketJS host types and gives DOM-only
// props a counted policy. mount() calls installCompat(); until then the host config runs
// with an identity hook and behaves exactly as before. Everything silently accepted shows
// up in compatStats().
import { setClassMissPolicy, setTokenMapEnabled, type ClassMissPolicy } from "../style/class-runtime.ts";
import { setHostCompat } from "../renderer/host-config.ts";
import { INTERACTIVE_TAGS, hostTypeOf, unknownTagMessage } from "./tags.ts";
import { compatProps, setUnknownPropsPolicy, type UnknownPropsPolicy } from "./props.ts";
import { countUnknownTag } from "./stats.ts";

export interface CompatOptions {
  /** Props the compat layer does not recognize: "throw" (default) or "drop" (counted). */
  unknownProps?: UnknownPropsPolicy;
  /** Class tokens outside the build table: "throw" (default) or "drop" (counted, subset kept). */
  classMiss?: ClassMissPolicy;
  /** Rewrite shadcn vocabulary through the fixed token map before resolving (default true). */
  tokenMap?: boolean;
}

export function installCompat(opts: CompatOptions = {}): void {
  setUnknownPropsPolicy(opts.unknownProps ?? "throw");
  setClassMissPolicy(opts.classMiss ?? "throw");
  setTokenMapEnabled(opts.tokenMap ?? true);
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
  });
}

export { compatStats, resetCompatStats, type CompatStats } from "./stats.ts";
