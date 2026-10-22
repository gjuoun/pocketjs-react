// Characters a host cannot draw. On a host without runtime glyphs, a character outside the atlases
// the build baked draws as the core's placeholder box; the reader says how many of a chapter's
// characters do, instead of leaving boxes unexplained. Hosts that draw missing glyphs at run time
// (the browser host page) and builds that recorded no baked set report 0.
import { bakedGlyphs } from "../books/assets.ts";
import { hasRuntimeGlyphs } from "./glyph-warmer.ts";

/** Distinct characters of `text` the baked atlases lack (ASCII, whitespace and controls never count). */
export function missingCharacters(text: string, baked: ReadonlySet<number> | null = bakedGlyphs()): string[] {
  if (!baked || hasRuntimeGlyphs()) return [];
  const out = new Set<string>();
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if (cp <= 0x7e || cp < 0xa0 || /\s/.test(ch) || baked.has(cp)) continue;
    out.add(ch);
  }
  return [...out];
}

/** Footer text for `count` missing characters, or "" when there are none. */
export function missingNotice(count: number): string {
  if (count === 0) return "";
  return count + (count === 1 ? " character cannot" : " characters cannot") + " be shown on this host";
}
