# Bundled book: Bitcoin: A Peer-to-Peer Electronic Cash System

- **Work**: *Bitcoin: A Peer-to-Peer Electronic Cash System*, Satoshi Nakamoto, 2008.
- **Source file**: https://bitcoin.org/bitcoin.pdf
  - sha256 `b1674191a88ec5cdd733e4240a81803105dc412d6c6708d53ab94fc248f4f553`, 184,292 bytes.
- **Licence**: MIT, as distributed by the bitcoin.org project.
  - The byte-identical PDF (git blob `1e19b739f6e296dd1b38f71f20bf9152e6d9f6d1`) was part of the MIT-licensed repository `github.com/bitcoin-dot-org/Bitcoin.org` from its initial commit (2011-08-31) until it was removed from that repository on 2021-07-08.
  - The repository's licence text is reproduced below.
- **What this repository ships**: an EPUB 3 edition built from that PDF.
  - `bitcoin-whitepaper/source-pdf.txt` is the PDF's extracted text.
  - The `*.xhtml` files are the hand-checked transcription.
  - `tools/books/make-epub.ts` builds `bitcoin-whitepaper.epub`.
- **Changes from the PDF**:
  - Figures are replaced by captions that describe them. The diagrams are not reproduced.
  - The formulas of section 11 are written as plain text.
  - Layout is reflowable.

```text
The MIT License (MIT)

Copyright (c) 2009-2026 Bitcoin.org

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```
