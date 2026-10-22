// The reader example's build: the app plus the bundled whitepaper EPUB and its glyphs.
//   bun tools/build-reader.ts [--outdir=dist] [--minify]
import { join, resolve } from "node:path";
import { build, type BuildResult } from "./build.ts";

const ROOT = resolve(import.meta.dir, "..");

export function buildReader(opts: { outdir?: string; minify?: boolean } = {}): Promise<BuildResult> {
  return build(join(ROOT, "examples/reader/main.tsx"), {
    outdir: opts.outdir ?? join(ROOT, "dist"),
    name: "reader",
    minify: opts.minify,
    assets: { "bitcoin-whitepaper.epub": join(ROOT, "assets/books/bitcoin-whitepaper.epub") },
    glyphs: [join(ROOT, "assets/books/bitcoin-whitepaper.txt")],
  });
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  await buildReader({ outdir: args.find((a) => a.startsWith("--outdir="))?.slice(9), minify: args.includes("--minify") });
}
