// What the compat layer accepted without a real mapping, per name: the guard that keeps
// "silently swallow" observable. Attr counts are taken once per mount (creation) - a
// re-render of the same element is not a new acceptance. classMiss numbers live in the
// class runtime and are read through here so there is one report.
import {
  classRuntimeStats,
  resetClassMissStats,
} from "../style/class-runtime.ts";

export interface CompatStats {
  /** DOM props dropped by policy, name -> count (data-*, aria-*, the DOM attribute/event surface). */
  droppedAttrs: Record<string, number>;
  /** Unrecognized props dropped under compat: { unknownProps: "drop" }, name -> count. */
  unknownAttrs: Record<string, number>;
  /** JSX tags outside the compat table (always an error today; counted on the way out). */
  unknownTags: number;
  /** Class tokens/literals dropped under compat: { classMiss: "drop" }. */
  classMiss: { tokens: number; literals: number };
  /** C2 token map activity: tokens moved to PocketJS vocabulary, tokens dropped on purpose. */
  tokenMap: { mapped: number; dropped: number };
}

const droppedAttrs: Record<string, number> = {};
const unknownAttrs: Record<string, number> = {};
let unknownTags = 0;

export function countDroppedAttr(name: string): void {
  droppedAttrs[name] = (droppedAttrs[name] ?? 0) + 1;
}

export function countUnknownAttr(name: string): void {
  unknownAttrs[name] = (unknownAttrs[name] ?? 0) + 1;
}

export function countUnknownTag(): void {
  unknownTags++;
}

function clear(map: Record<string, number>): void {
  for (const key of Object.keys(map)) delete map[key];
}

export function compatStats(): CompatStats {
  return {
    droppedAttrs: { ...droppedAttrs },
    unknownAttrs: { ...unknownAttrs },
    unknownTags,
    classMiss: {
      tokens: classRuntimeStats.droppedTokens,
      literals: classRuntimeStats.droppedLiterals,
    },
    tokenMap: {
      mapped: classRuntimeStats.mappedTokens,
      dropped: classRuntimeStats.mapDroppedTokens,
    },
  };
}

export function resetCompatStats(): void {
  clear(droppedAttrs);
  clear(unknownAttrs);
  unknownTags = 0;
  resetClassMissStats();
}
