// Paragraph wrapping on the host's own line wrapper (ui.wrapText — the same wrapper the core
// draws with), plus CJK line rules (kinsoku). Extracted from the reader's paginator so any app
// can lay out wrapped text without paginating a book: the returned lines are exactly the lines
// the core would draw at that slot and width.
import { getOps } from "@pocketjs/framework/host";

type WrapText = (
  text: string,
  slot: number,
  maxWidth: number,
) => ArrayLike<number>;

export interface WrappedLine {
  text: string;
  /** Character offset of the line's start inside the paragraph. */
  offset: number;
}

/** CJK line rules: these never start a line ... */
export const NO_LINE_START =
  "，。、；：？！」』）》〉】…﹐﹑﹒﹔﹕﹖﹗﹚﹜﹞．〕〗";
/** ... and these never end one. */
export const NO_LINE_END = "「『（《〈【〔〖";

/** Moves a break back so the next line does not start with closing punctuation and this line does
 *  not end with an opening bracket (the characters move down a line). Keeps at least one character. */
function adjustBreak(text: string, from: number, at: number): number {
  let end = at;
  for (let guard = 0; guard < 8 && end - 1 > from; guard++) {
    let next = end;
    while (text[next] === " ") next++; // a break at a space: look at what the next line shows first
    if (
      !NO_LINE_START.includes(text[next] ?? "\n") &&
      !NO_LINE_END.includes(text[end - 1])
    )
      break;
    end--;
  }
  return end;
}

/** Wrap one paragraph with the host wrapper; each line fits `width` at font `slot`. */
export function wrapParagraph(
  text: string,
  slot: number,
  width: number,
): WrappedLine[] {
  const ops = getOps() as { wrapText?: WrapText };
  if (!ops.wrapText)
    throw new Error(
      "pocketjs-react: this host has no wrapText op; wrapping needs it",
    );
  const wrapText = ops.wrapText;
  const out: WrappedLine[] = [];
  let from = 0;
  let base = 0; // breaks are relative to text.slice(base)
  let breaks = Array.from(wrapText(text, slot, width));
  for (let k = 0; k < breaks.length; k++) {
    const at = base + breaks[k];
    const end = adjustBreak(text, from, at);
    out.push({ text: text.slice(from, end).trimEnd(), offset: from });
    from = end;
    if (end !== at) {
      // The next line grew: wrap the rest again from here, so every line still fits.
      base = end;
      breaks = Array.from(wrapText(text.slice(end), slot, width));
      k = -1;
    }
  }
  out.push({ text: text.slice(from), offset: from });
  return out;
}
