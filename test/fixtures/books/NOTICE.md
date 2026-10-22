# Test book: 三國志演義 (Romance of the Three Kingdoms), chapters 1–3

- **Work**: *三國志演義*, attributed to 羅貫中 (Luo Guanzhong), 14th century. Traditional characters.
- **Source file**: Project Gutenberg eBook #23950, https://www.gutenberg.org/cache/epub/23950/pg23950.txt
  - Release date December 21, 2007; produced by Jian-Lun Huang.
  - sha256 of the file used: `ed422e10c16c19af7ca7b09ca0320012e60776b3d7cb054769b8f7d9a19aea7d`, UTF-8 with CRLF line ends.
- **Licence**: the text is in the public domain in the United States.
  - Only chapters 1–3 (the source file's lines from `第一回：` up to `第四回：`) are used.
  - The Project Gutenberg header, footer and licence are removed, and with them every use of the Project Gutenberg trademark. This file is not a Project Gutenberg eBook.
- **What this repository ships** (under `test/fixtures/books/`):
  - `sanguo/source.txt` — the excerpt as it appears in the source file, line ends normalised to LF.
  - `sanguo/c1.xhtml`–`c3.xhtml` — one chapter each: the chapter title as a heading and one paragraph per source paragraph. The source's hard line wraps are kept, as real EPUBs often keep them, so the reader's CJK whitespace rule is exercised.
  - `sanguo/book.json`, `sanguo/chapters.json` — metadata and spine for `tools/books/make-epub.ts`, which builds `sanguo.epub` and `sanguo.txt`.
- **Changes from the source**: the leading ideographic-space paragraph indents are dropped; nothing else.
