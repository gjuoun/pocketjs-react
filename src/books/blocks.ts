// XHTML -> reading blocks. Headings, paragraphs, list items, preformatted text and figures
// (a figure's caption text, or an image's alt text, since images are not drawn yet).

export type Block =
  | { kind: "heading"; text: string }
  | { kind: "para"; text: string }
  | { kind: "pre"; text: string }
  | { kind: "figure"; text: string };

const NAMED: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\u00a0", mdash: "\u2014", ndash: "\u2013", hellip: "\u2026", lsquo: "\u2018", rsquo: "\u2019", ldquo: "\u201c", rdquo: "\u201d" };

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (whole, e: string) => {
    if (e[0] === "#") return String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return NAMED[e] ?? whole;
  });
}

const BLOCK = /^(p|div|li|h[1-6]|pre|figure|figcaption|blockquote|dt|dd|tr|section|article|header|footer|nav|ol|ul|table|body)$/;

export function xhtmlToBlocks(xhtml: string): Block[] {
  const body = /<body[^>]*>([\s\S]*)<\/body>/i.exec(xhtml)?.[1] ?? xhtml;
  const blocks: Block[] = [];
  let buf = "";
  let kind: Block["kind"] = "para";
  let preDepth = 0;
  let figureDepth = 0;
  const flush = () => {
    const text = preDepth > 0 || kind === "pre" ? decodeEntities(buf).replace(/^\n+|\s+$/g, "") : decodeEntities(buf).replace(/\s+/g, " ").trim();
    if (text) blocks.push({ kind: figureDepth > 0 ? "figure" : kind, text });
    buf = "";
  };
  for (const m of body.matchAll(/<(\/?)([a-zA-Z][\w:-]*)([^>]*?)(\/?)>|([^<]+)/g)) {
    if (m[5] !== undefined) {
      buf += m[5];
      continue;
    }
    const closing = m[1] === "/";
    const name = m[2].toLowerCase();
    const selfClosing = m[4] === "/";
    if (name === "br") {
      if (preDepth > 0) buf += "\n";
      else flush();
      continue;
    }
    if (name === "img") {
      flush();
      const alt = /\salt="([^"]*)"/.exec(m[3])?.[1];
      if (figureDepth === 0) blocks.push({ kind: "figure", text: decodeEntities(alt || "Image") });
      continue;
    }
    if (name === "script" || name === "style") continue;
    if (!BLOCK.test(name)) continue;
    flush();
    if (selfClosing) continue;
    if (name === "pre") preDepth += closing ? -1 : 1;
    if (name === "figure") figureDepth += closing ? -1 : 1;
    if (closing) kind = preDepth > 0 ? "pre" : "para";
    else kind = /^h[1-6]$/.test(name) ? "heading" : name === "pre" ? "pre" : "para";
  }
  flush();
  return blocks;
}
