// Pagination with the host's native line wrapper (ui.wrapText, the same wrapper the core draws
// with), so a computed line is exactly a drawn line. Each line is drawn at a fixed pitch per
// font size, so a page's line count follows from its height. Probes: the whole whitepaper
// paginates in about 0.5 ms on the desktop host and 0.7-2 ms on the wasm core.
import { getOps } from "@pocketjs/framework/host";
import type { Block } from "../books/blocks.ts";

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
}

export interface Anchor {
  block: number;
  offset: number;
}

export interface Pages {
  pages: Line[][];
  linesPerPage: number;
  /** Page holding a block/offset position (for restoring a position after a size change). */
  pageOf(anchor: Anchor): number;
}

type WrapText = (text: string, slot: number, maxWidth: number) => ArrayLike<number>;

function wrap(text: string, slot: number, width: number, wrapText: WrapText): { text: string; offset: number }[] {
  const breaks = Array.from(wrapText(text, slot, width));
  const out: { text: string; offset: number }[] = [];
  let from = 0;
  for (const at of breaks) {
    out.push({ text: text.slice(from, at).trimEnd(), offset: from });
    from = at;
  }
  out.push({ text: text.slice(from), offset: from });
  return out;
}

export function paginate(blocks: Block[], opts: { size: FontSize; width: number; height: number }): Pages {
  const ops = getOps() as { wrapText?: WrapText };
  if (!ops.wrapText) throw new Error("pocketjs-react: this host has no wrapText op; pagination needs it");
  const size = FONT_SIZES[opts.size];
  const linesPerPage = Math.max(1, Math.floor(opts.height / size.pitch));
  const lines: Line[] = [];
  blocks.forEach((block, index) => {
    if (lines.length > 0) lines.push({ text: "", kind: "blank", block: index, offset: 0 });
    const slot = block.kind === "heading" ? size.headingSlot : size.slot;
    if (block.kind === "pre") {
      let offset = 0;
      for (const raw of block.text.split("\n")) {
        for (const part of wrap(raw, slot, opts.width, ops.wrapText!)) lines.push({ text: part.text, kind: "pre", block: index, offset: offset + part.offset });
        offset += raw.length + 1;
      }
      return;
    }
    for (const part of wrap(block.text, slot, opts.width, ops.wrapText!)) lines.push({ text: part.text, kind: block.kind, block: index, offset: part.offset });
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
    pages,
    linesPerPage,
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
