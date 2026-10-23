// Glyph warm-up for hosts that draw missing glyphs at run time (text.glyphs.runtime, the browser
// host page): a codepoint the baked atlases lack is rasterized the first time the core measures
// it, about 0.5 ms per glyph across the slots. Paginating a new chapter measures all of its text
// at once, so a chapter with ~400 new characters stalls one frame for ~200 ms. While a chapter is
// read, the warmer measures the next chapter's not-yet-seen characters, at most WARM_CHUNK per
// frame, so the chapter switch finds them ready. A no-op on hosts without runtime glyphs.

import { getOps } from "@pocketjs/framework/host";
import { useEffect } from "react";
import { addFramePump } from "../renderer/mount.ts";

export const WARM_CHUNK = 50;

/** True on a host page that installed runtime glyphs (it sets globalThis.__pocketRuntimeGlyphs). */
export function hasRuntimeGlyphs(): boolean {
  return (
    (globalThis as { __pocketRuntimeGlyphs?: unknown })
      .__pocketRuntimeGlyphs === true
  );
}

/** Codepoints the core has already been asked to measure (so the runtime source holds them). */
const seen = new Set<number>();

function fresh(text: string): string[] {
  const out: string[] = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if (cp < 0x7f || seen.has(cp)) continue;
    seen.add(cp);
    out.push(ch);
  }
  return out;
}

/** A queue of characters to warm, drained WARM_CHUNK per call to step(). */
export function createGlyphWarmer(slot: number, chunk = WARM_CHUNK) {
  let queue: string[] = [];
  return {
    /** Text already measured (the chapter on screen was paginated): never queued. */
    seen(text: string) {
      fresh(text);
    },
    /** Queue the characters of text that were not measured yet. */
    add(text: string) {
      queue = queue.concat(fresh(text));
    },
    /** Measure the next chunk; the host rasterizes what is new. Returns how many were measured. */
    step(): number {
      if (queue.length === 0) return 0;
      const part = queue.splice(0, chunk);
      (
        getOps() as { measureText(text: string, slot: number): number }
      ).measureText(part.join(""), slot);
      return part.length;
    },
    pending: () => queue.length,
  };
}

/** While mounted, warm `next` (the next chapter's text) one chunk per frame. `current` is the text
 *  on screen, already measured by pagination. */
export function useGlyphWarmup(
  current: string,
  next: string,
  slot: number,
): void {
  useEffect(() => {
    if (!hasRuntimeGlyphs() || !next) return;
    const warmer = createGlyphWarmer(slot);
    warmer.seen(current);
    warmer.add(next);
    if (warmer.pending() === 0) return;
    const stop = addFramePump(() => {
      if (warmer.step() === 0) stop();
    });
    return stop;
  }, [current, next, slot]);
}
