// Lazy EPUB reading: open inflates only the package files, a chapter inflates one entry.
import { beforeAll, expect, test } from "bun:test";
import { strToU8, unzipSync, type Zippable, zipSync } from "fflate";
import { type Block, openEpub } from "../src/books/epub.ts";

const whitepaper = new Uint8Array(
  await Bun.file("assets/books/bitcoin-whitepaper.epub").arrayBuffer(),
);
let novel: Uint8Array;

beforeAll(() => {
  // A novel-sized EPUB: the whitepaper's sections repeated 40 times (560 spine items).
  const src = unzipSync(whitepaper);
  const chapters = Object.keys(src)
    .filter((n) => /^OEBPS\/\d\d-.*\.xhtml$/.test(n))
    .sort();
  const files: Zippable = {
    mimetype: [strToU8("application/epub+zip"), { level: 0 }],
    "META-INF/container.xml": src["META-INF/container.xml"],
  };
  const items: string[] = [];
  for (let r = 0; r < 40; r++)
    for (const c of chapters) {
      const name = "r" + r + "-" + c.slice(6);
      files["OEBPS/" + name] = src[c];
      items.push(name);
    }
  files["OEBPS/nav.xhtml"] = strToU8(
    "<html><body><nav><ol>" +
      items
        .map((n, i) => '<li><a href="' + n + '">Part ' + i + "</a></li>")
        .join("") +
      "</ol></nav></body></html>",
  );
  files["OEBPS/content.opf"] = strToU8(
    '<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Novel</dc:title></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>' +
      items
        .map(
          (n, i) =>
            '<item id="i' +
            i +
            '" href="' +
            n +
            '" media-type="application/xhtml+xml"/>',
        )
        .join("") +
      '</manifest><spine toc="ncx">' +
      items.map((_, i) => '<itemref idref="i' + i + '"/>').join("") +
      "</spine></package>",
  );
  novel = zipSync(files);
});

test("the bundled book opens with 14 TOC entries, chapter 4 starts with its heading", () => {
  const book = openEpub(whitepaper);
  expect(book.title).toBe("Bitcoin: A Peer-to-Peer Electronic Cash System");
  expect(book.toc.length).toBe(14);
  expect(book.toc[4].title).toBe("4. Proof-of-Work");
  const blocks = book.chapter(4);
  expect(blocks[0]).toEqual({ kind: "heading", text: "4. Proof-of-Work" });
  expect(blocks.filter((b) => b.kind === "figure").length).toBe(1);
});

test("a novel-sized EPUB opens by inflating 3 entries and reads one chapter by inflating 1", () => {
  const book = openEpub(novel);
  expect(book.spine.length).toBe(560);
  expect(book.stats.inflated).toBe(3); // container.xml + content.opf + nav.xhtml
  const before = book.stats.inflated;
  const blocks = book.chapter(260);
  expect(book.stats.inflated - before).toBe(1);
  expect(blocks[0].kind).toBe("heading");
  expect(book.toc.length).toBe(560);
});

test("entities and line breaks decode", () => {
  const xhtml =
    '<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml"><body><p>Tom &amp; Jerry&#8217;s<br/>second &lt;line&gt;</p><img src="a.png" alt="A map"/></body></html>';
  const files: Zippable = {
    mimetype: [strToU8("application/epub+zip"), { level: 0 }],
    "META-INF/container.xml": strToU8(
      '<container><rootfiles><rootfile full-path="c.opf" media-type="application/oebps-package+xml"/></rootfiles></container>',
    ),
    "c.opf": strToU8(
      '<package><metadata><dc:title xmlns:dc="x">T</dc:title></metadata><manifest><item id="a" href="a.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="a"/></spine></package>',
    ),
    "a.xhtml": strToU8(xhtml),
  };
  const blocks: Block[] = openEpub(zipSync(files)).chapter(0);
  expect(blocks).toEqual([
    { kind: "para", text: "Tom & Jerry\u2019s" },
    { kind: "para", text: "second <line>" },
    { kind: "figure", text: "A map" },
  ]);
});
