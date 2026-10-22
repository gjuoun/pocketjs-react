// tools/books/make-epub.ts [bookDir] — builds an EPUB 3 from hand-checked XHTML sources:
// <bookDir>/book.json holds the metadata (title, author, language, id, modified, rights),
// <bookDir>/chapters.json lists the spine (file + TOC title), <bookDir>/*.xhtml and an optional
// style.css are the content. Writes <bookDir>.epub (mimetype first and stored, fixed timestamps so the bytes
// are reproducible) and <bookDir>.txt, the book's plain text, whose codepoints the build bakes
// into the font atlases.
import { strToU8, zipSync, type Zippable } from "fflate";
import { basename, resolve } from "node:path";

const dir = resolve(process.argv[2] ?? "assets/books/bitcoin-whitepaper");
const meta = (await Bun.file(dir + "/book.json").json()) as { title: string; author: string; language: string; id: string; modified: string; rights: string };
const chapters = (await Bun.file(dir + "/chapters.json").json()) as { file: string; title: string }[];
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const mtime = new Date(meta.modified);
const css = Bun.file(dir + "/style.css");
const hasCss = await css.exists();

const opf = [
  '<?xml version="1.0" encoding="utf-8"?>',
  '<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id" xml:lang="' + meta.language + '">',
  '<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">',
  '<dc:identifier id="book-id">' + meta.id + "</dc:identifier>",
  "<dc:title>" + esc(meta.title) + "</dc:title>",
  "<dc:creator>" + esc(meta.author) + "</dc:creator>",
  "<dc:language>" + meta.language + "</dc:language>",
  "<dc:rights>" + esc(meta.rights) + "</dc:rights>",
  '<meta property="dcterms:modified">' + meta.modified + "</meta>",
  "</metadata>",
  "<manifest>",
  '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>',
  ...(hasCss ? ['<item id="css" href="style.css" media-type="text/css"/>'] : []),
  ...chapters.map((c, i) => '<item id="c' + i + '" href="' + c.file + '" media-type="application/xhtml+xml"/>'),
  "</manifest>",
  "<spine>",
  ...chapters.map((_, i) => '<itemref idref="c' + i + '"/>'),
  "</spine>",
  "</package>",
].join("\n");
const nav = [
  '<?xml version="1.0" encoding="utf-8"?>',
  "<!DOCTYPE html>",
  '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="' + meta.language + '" lang="' + meta.language + '">',
  "<head><title>Contents</title></head>",
  '<body><nav epub:type="toc"><h1>Contents</h1><ol>',
  ...chapters.map((c) => '<li><a href="' + c.file + '">' + esc(c.title) + "</a></li>"),
  "</ol></nav></body></html>",
].join("\n");
const container = '<?xml version="1.0" encoding="utf-8"?>\n<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>\n';

const deflate = { level: 9 as const, mtime };
const entries: Zippable = {
  mimetype: [strToU8("application/epub+zip"), { level: 0, mtime }],
  "META-INF/container.xml": [strToU8(container), deflate],
  "OEBPS/content.opf": [strToU8(opf), deflate],
  "OEBPS/nav.xhtml": [strToU8(nav), deflate],
};
if (hasCss) entries["OEBPS/style.css"] = [new Uint8Array(await css.arrayBuffer()), deflate];
let plain = meta.title + "\n" + meta.author + "\n";
for (const c of chapters) {
  const xhtml = await Bun.file(dir + "/" + c.file).text();
  entries["OEBPS/" + c.file] = [strToU8(xhtml), deflate];
  plain += xhtml.replace(/<[^>]+>/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim() + "\n";
}
const zip = zipSync(entries);
await Bun.write(dir + ".epub", zip);
await Bun.write(dir + ".txt", plain);
console.log(basename(dir) + ".epub: " + chapters.length + " spine items, " + zip.length + " bytes; " + basename(dir) + ".txt: " + plain.length + " chars");
