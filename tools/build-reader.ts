// The reader example's build: the app plus the bundled whitepaper EPUB and its glyphs.
//   bun tools/build-reader.ts [--outdir=dist] [--minify] [--cjk]
// --cjk bakes assets/fonts/cjk-set.txt (8,836 simplified + traditional hanzi, CJK punctuation and
// full-width forms) into the body slots from the committed Noto Sans SC subset, for hosts that
// cannot draw glyphs at run time (the desktop host). About +8.7 MB of pak.
import { join, resolve } from "node:path";
import { BODY_SLOTS, build, type BuildResult } from "./build.ts";

const ROOT = resolve(import.meta.dir, "..");
export const CJK = { set: join(ROOT, "assets/fonts/cjk-set.txt"), font: join(ROOT, "assets/fonts/NotoSansSC-reader-subset.otf"), slots: BODY_SLOTS };

export interface ReaderBuildOptions {
  outdir?: string;
  minify?: boolean;
  name?: string;
  /** Bake the CJK set into the body slots. */
  cjk?: boolean;
  /** More EPUBs to bundle: asset name -> file. */
  books?: Record<string, string>;
  /** Bundle the whitepaper (default true). */
  bundleWhitepaper?: boolean;
}

export function buildReader(opts: ReaderBuildOptions = {}): Promise<BuildResult> {
  const whitepaper = opts.bundleWhitepaper ?? true;
  return build(join(ROOT, "examples/reader/main.tsx"), {
    outdir: opts.outdir ?? join(ROOT, "dist"),
    name: opts.name ?? "reader",
    minify: opts.minify,
    assets: { ...(whitepaper ? { "bitcoin-whitepaper.epub": join(ROOT, "assets/books/bitcoin-whitepaper.epub") } : {}), ...opts.books },
    glyphs: [join(ROOT, "assets/books/bitcoin-whitepaper.txt")],
    cjk: opts.cjk ? CJK : undefined,
  });
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  await buildReader({ outdir: args.find((a) => a.startsWith("--outdir="))?.slice(9), minify: args.includes("--minify"), cjk: args.includes("--cjk") });
}
