// Pagination with the host's native line wrapper (ui.wrapText, the same wrapper the core draws
// with), so a computed line is exactly a drawn line. Each line is drawn at a fixed pitch per
// font size, so a page's line count follows from its height. Probes: the whole whitepaper
// paginates in about 0.5 ms on the desktop host and 0.7-2 ms on the wasm core.
import type { Block } from "../books/blocks.ts";
import { hasHan } from "../style/cjk.ts";
import { wrapParagraph } from "../text/wrap.ts";

export type FontSize = "S" | "M" | "L";

/** Per size: Tailwind classes, the atlas slots they resolve to, and the line pitch in px. */
export const FONT_SIZES: Record<FontSize, { body: string; heading: string; slot: number; headingSlot: number; pitch: number }> = {
  S: { body: "text-sm", heading: "text-sm font-bold", slot: 1, headingSlot: 8, pitch: 18 },
  M: { body: "text-base", heading: "text-base font-bold", slot: 2, headingSlot: 9, pitch: 21 },
  L: { body: "text-lg", heading: "text-lg font-bold", slot: 3, headingSlot: 10, pitch: 24 },
};

export interface Line {
  text: string;
  kind: Block["kind"] | "blank";
  /** Block index and the character offset of the line's start inside it. */
  block: number;
  offset: number;
  /** A heading with Han characters: drawn in the regular slot (bold slots carry no CJK). */
  regular?: boolean;
}

export interface Anchor {
  block: number;
  offset: number;
}

export interface Pages {
  /** Every line of the chapter, in order (a reading view may scroll by lines). */
  lines: Line[];
  pages: Line[][];
  linesPerPage: number;
  /** Page holding a block/offset position (for restoring a position after a size change). */
  pageOf(anchor: Anchor): number;
  /** Index of the line that holds a block/offset position. */
  lineOf(anchor: Anchor): number;
}


export function paginate(blocks: Block[], opts: { size: FontSize; width: number; height: number }): Pages {
  const size = FONT_SIZES[opts.size];
  const linesPerPage = Math.max(1, Math.floor(opts.height / size.pitch));
  const lines: Line[] = [];
  blocks.forEach((block, index) => {
    if (lines.length > 0) lines.push({ text: "", kind: "blank", block: index, offset: 0 });
    const regular = block.kind === "heading" && hasHan(block.text);
    const slot = block.kind === "heading" && !regular ? size.headingSlot : size.slot;
    if (block.kind === "pre") {
      let offset = 0;
      for (const raw of block.text.split("\n")) {
        for (const part of wrapParagraph(raw, slot, opts.width)) lines.push({ text: part.text, kind: "pre", block: index, offset: offset + part.offset });
        offset += raw.length + 1;
      }
      return;
    }
    for (const part of wrapParagraph(block.text, slot, opts.width)) lines.push({ text: part.text, kind: block.kind, block: index, offset: part.offset, ...(regular ? { regular } : {}) });
  });
  const pages: Line[][] = [];
  for (let i = 0; i < lines.length; i += linesPerPage) {
    let page = lines.slice(i, i + linesPerPage);
    // A page never starts with a blank separator line.
    if (page[0]?.kind === "blank" && page.length > 1) page = page.slice(1);
    pages.push(page);
  }
  if (pages.length === 0) pages.push([]);
  const firstOf = pages.map((p) => p.find((l) => l.kind !== "blank") ?? p[0]);
  return {
    lines,
    pages,
    linesPerPage,
    lineOf(anchor: Anchor): number {
      let found = 0;
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        if (l.kind === "blank") continue;
        if (l.block < anchor.block || (l.block === anchor.block && l.offset <= anchor.offset)) found = i;
        else break;
      }
      return found;
    },
    pageOf(anchor: Anchor): number {
      let found = 0;
      for (let i = 0; i < firstOf.length; i++) {
        const f = firstOf[i];
        if (!f) continue;
        if (f.block < anchor.block || (f.block === anchor.block && f.offset <= anchor.offset)) found = i;
        else break;
      }
      return found;
    },
  };
}

/** The position a page starts at. */
export function anchorOf(page: Line[]): Anchor {
  const first = page.find((l) => l.kind !== "blank") ?? page[0];
  return first ? { block: first.block, offset: first.offset } : { block: 0, offset: 0 };
}
