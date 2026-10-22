// The bundled whitepaper EPUB: a valid EPUB container, a spine/nav that match the sections,
// and prose that matches the text extracted from the original PDF.
import { expect, test } from "bun:test";
import { strFromU8, unzipSync } from "fflate";

const DIR = "assets/books/";
const epub = new Uint8Array(await Bun.file(DIR + "bitcoin-whitepaper.epub").arrayBuffer());
const files = unzipSync(epub);
const text = (name: string) => strFromU8(files[name]);
const chapters = (await Bun.file(DIR + "bitcoin-whitepaper/chapters.json").json()) as { file: string; title: string }[];

test("the first entry is an uncompressed mimetype of application/epub+zip", () => {
  const dv = new DataView(epub.buffer, epub.byteOffset);
  expect(dv.getUint32(0, true)).toBe(0x04034b50); // local file header
  expect(dv.getUint16(8, true)).toBe(0); // stored
  const nameLength = dv.getUint16(26, true);
  const extraLength = dv.getUint16(28, true);
  expect(strFromU8(epub.subarray(30, 30 + nameLength))).toBe("mimetype");
  const start = 30 + nameLength + extraLength;
  expect(strFromU8(epub.subarray(start, start + 20))).toBe("application/epub+zip");
});

test("the spine has 14 sections and the nav lists the same titles", () => {
  const opf = text("OEBPS/content.opf");
  const spine = [...opf.matchAll(/<itemref idref="([^"]+)"/g)].map((m) => m[1]);
  expect(spine.length).toBe(14);
  const nav = [...text("OEBPS/nav.xhtml").matchAll(/<a href="([^"]+)">([^<]+)<\/a>/g)].map((m) => [m[1], m[2]]);
  expect(nav).toEqual(chapters.map((c) => [c.file, c.title]));
});

test("every prose block matches the PDF's extracted text", () => {
  const strip = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/<[^>]+>/g, "").replace(/\s+/g, "");
  const source = strip(require("node:fs").readFileSync(DIR + "bitcoin-whitepaper/source-pdf.txt", "utf8"));
  let checked = 0;
  const missing: string[] = [];
  for (const c of chapters) {
    const body = text("OEBPS/" + c.file).replace(/<figure[\s\S]*?<\/figure>/g, "").replace(/<p class="math">[\s\S]*?<\/p>/g, "");
    for (const m of body.matchAll(/<(p|li|pre)\b[^>]*>([\s\S]*?)<\/\1>/g)) {
      const block = strip(m[2]);
      if (!block) continue;
      checked += block.length;
      if (!source.includes(block)) missing.push(c.file + ": " + m[2].slice(0, 80));
    }
  }
  expect(missing).toEqual([]);
  const coverage = checked / source.replace(/===page\d+/g, "").length;
  console.log("prose chars checked=" + checked + " coverage of the PDF text=" + coverage.toFixed(3));
  expect(coverage).toBeGreaterThan(0.85);
});

// The Chinese fixture: chapters 1-3 of the Three Kingdoms (Project Gutenberg #23950), whose
// prose matches the Gutenberg text once whitespace (its hard line wraps) is removed.
const ZH = "test/fixtures/books/";

test("the sanguo fixture has 3 spine items, Chinese nav titles and the Gutenberg prose", () => {
  const zh = unzipSync(new Uint8Array(require("node:fs").readFileSync(ZH + "sanguo.epub")));
  const read = (name: string) => strFromU8(zh[name]);
  const opf = read("OEBPS/content.opf");
  expect([...opf.matchAll(/<itemref idref="([^"]+)"/g)].length).toBe(3);
  expect(opf).toContain("<dc:language>zh-Hant</dc:language>");
  expect(opf).toContain("<dc:title>三國志演義</dc:title>");
  const titles = [...read("OEBPS/nav.xhtml").matchAll(/<a href="[^"]+">([^<]+)<\/a>/g)].map((m) => m[1]);
  expect(titles.length).toBe(3);
  expect(titles[0].startsWith("第一回：")).toBe(true);
  expect(titles.every((t, i) => t.startsWith("第" + "一二三"[i] + "回："))).toBe(true);
  const squash = (s: string) => s.replace(/\s+/g, "");
  const source = squash(require("node:fs").readFileSync(ZH + "sanguo/source.txt", "utf8"));
  const chapters = JSON.parse(require("node:fs").readFileSync(ZH + "sanguo/chapters.json", "utf8")) as { file: string }[];
  let paragraphs = 0;
  let chars = 0;
  const missing: string[] = [];
  for (const c of chapters) {
    for (const m of read("OEBPS/" + c.file).matchAll(/<(p|h2)\b[^>]*>([\s\S]*?)<\/\1>/g)) {
      const block = squash(m[2]);
      if (!block) continue;
      paragraphs++;
      chars += block.length;
      if (!source.includes(block)) missing.push(c.file + ": " + m[2].slice(0, 40));
    }
  }
  expect(missing).toEqual([]);
  expect(paragraphs).toBeGreaterThan(60);
  expect(chars / source.length).toBeGreaterThan(0.99); // every paragraph of chapters 1-3 is there
});

