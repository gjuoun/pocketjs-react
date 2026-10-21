// tools/build.ts <entry.tsx> [--outdir=dist] [--name=<name>] [--minify]
//
// Pass 1 (tools/collect.ts) scans literals from the entry's import graph and from
// pocketjs-react's own src/, then uses PocketJS's compiler to produce:
//   - the static style table (every literal that is a complete class string),
//   - font atlases for the cross product of every text-size and weight token found, so a
//     class combination assembled at runtime (text-sm + font-bold) still has glyphs,
//   - the pak (styles.bin + atlases).
// Pass 2 bundles the app with Bun.build into one IIFE. A virtual module installs the
// compiled table before the app entry runs.
// The build fails when any bundle input comes from PocketJS's Pocket3D-licensed paths.
import { basename, dirname, join, resolve } from "node:path";
import { collect } from "./collect.ts";
import {
  DEFAULT_FONT_SLOT,
  KEY_STYLES,
  MONO_FONT_PX,
  PAK_DTYPE,
  bakeAtlases,
  compileClasses,
  fontSlotFor,
  generateStylesModule,
  keyFont,
  pack,
  suspectClassLiteral,
  unknownUtilities,
} from "../src/internal/pocket-build.ts";

const ROOT = resolve(import.meta.dir, "..");
const TEXT_SIZES: Record<string, number> = { "2xs": 10, xs: 12, sm: 14, base: 16, lg: 18, xl: 20, "2xl": 24, "4xl": 36, "5xl": 54 };
const LICENSED = /node_modules\/@pocketjs\/framework\/(pocket3d|devices|engine\/pocket3d)\//;

export interface BuildResult {
  js: string;
  pak: string;
  bundleBytes: number;
  pakBytes: number;
  fontSlots: number[];
}

/** Font slots for every (size x weight x family) combination whose tokens appear in source. */
export function slotCrossProduct(literals: string[], used: number[]): number[] {
  const tokens = new Set<string>();
  for (const lit of literals) for (const tok of lit.split(/\s+/)) if (tok) tokens.add(tok.replace(/^(focus|active):/, ""));
  const sizes = new Set<number>([16]);
  for (const [name, px] of Object.entries(TEXT_SIZES)) if (tokens.has("text-" + name)) sizes.add(px);
  const bolds = tokens.has("font-bold") ? [false, true] : [false];
  const slots = new Set<number>([DEFAULT_FONT_SLOT, ...used]);
  for (const px of sizes) {
    for (const bold of bolds) slots.add(fontSlotFor(px, bold));
    if (tokens.has("font-mono") && (MONO_FONT_PX as readonly number[]).includes(px)) slots.add(fontSlotFor(px, false, true));
  }
  return [...slots].sort((a, b) => a - b);
}

export async function build(entryArg: string, opts: { outdir?: string; name?: string; minify?: boolean } = {}): Promise<BuildResult> {
  const entry = resolve(entryArg);
  const outdir = resolve(opts.outdir ?? join(ROOT, "dist"));
  const name = opts.name ?? basename(dirname(entry));

  // ---- pass 1 -------------------------------------------------------------
  const scanned = await collect(entry, [join(ROOT, "src")]);
  const styles = compileClasses(scanned.literals);
  for (const lit of scanned.literals) {
    const bad = suspectClassLiteral(lit);
    if (bad) console.warn("  warning: not a supported utility: " + bad.join(", ") + " in " + JSON.stringify(lit));
  }
  const fontSlots = slotCrossProduct(scanned.literals, styles.usedFontSlots);
  // Every complete utility token in the source. The runtime compiles only class strings
  // made of these tokens: like Tailwind, a name assembled at runtime is not supported.
  const tokens = new Set<string>();
  for (const lit of scanned.literals) {
    for (const tok of lit.split(/\s+/)) if (tok && !tokens.has(tok) && unknownUtilities(tok).length === 0) tokens.add(tok);
  }
  const atlases = await bakeAtlases({ codepoints: scanned.codepoints, slots: fontSlots, extraChars: "", rasterDensity: 1 });
  const pak = pack([
    { key: KEY_STYLES, dtype: PAK_DTYPE.u8, data: styles.bin },
    ...atlases.map((a) => ({ key: keyFont(a.slot), dtype: PAK_DTYPE.u8, data: a.bytes })),
  ]);
  const pakPath = join(outdir, name + ".pak");
  await Bun.write(pakPath, pak);
  console.log("  pass 1: " + scanned.files.length + " files, " + scanned.literals.length + " literals, " + styles.records.length + " style records");
  console.log("  fontSlots=" + fontSlots.join(",") + " utilityTokens=" + tokens.size);
  console.log("  pak: " + pak.length + " bytes -> " + pakPath);

  // ---- pass 2 -------------------------------------------------------------
  const stylesModule =
    generateStylesModule(styles) +
    "\nexport const STYLE_BIN = new Uint8Array([" + Array.from(styles.bin).join(",") + "]);\n" +
    "export const STYLE_TOKENS = " + JSON.stringify([...tokens]) + ";\n";
  const install = [
    "import { installBuildStyles } from " + JSON.stringify(join(ROOT, "src/style/build-styles.ts")) + ";",
    'import { STYLE_IDS, STYLE_BIN, STYLE_TOKENS } from "pocketjs-react:styles";',
    "installBuildStyles(STYLE_IDS, STYLE_BIN, STYLE_TOKENS);",
  ].join("\n");
  const virtualEntry = 'import "pocketjs-react:install-styles";\nimport ' + JSON.stringify(entry) + ";\n";
  const result = await Bun.build({
    entrypoints: ["pocketjs-react:entry"],
    outdir,
    naming: name + ".js",
    format: "iife",
    target: "browser",
    conditions: ["browser"],
    define: { "process.env.NODE_ENV": '"production"' },
    minify: opts.minify ?? false,
    metafile: true,
    plugins: [{
      name: "pocketjs-react",
      setup(b) {
        b.onResolve({ filter: /^pocketjs-react:/ }, (a) => ({ path: a.path, namespace: "pocketjs-react" }));
        b.onResolve({ filter: /^pocketjs-react$/ }, () => ({ path: join(ROOT, "src/index.ts") }));
        b.onLoad({ filter: /.*/, namespace: "pocketjs-react" }, (a) => {
          if (a.path === "pocketjs-react:entry") return { contents: virtualEntry, loader: "ts", resolveDir: ROOT };
          if (a.path === "pocketjs-react:install-styles") return { contents: install, loader: "ts", resolveDir: ROOT };
          return { contents: stylesModule, loader: "ts", resolveDir: ROOT };
        });
      },
    }],
  });
  if (!result.success) {
    for (const log of result.logs) console.error(log);
    throw new Error("pocketjs-react build: bundling failed");
  }
  const inputs = Object.keys(result.metafile?.inputs ?? {});
  const licensed = inputs.filter((p) => LICENSED.test(p));
  if (licensed.length > 0) {
    throw new Error("pocketjs-react build: Pocket3D-licensed input(s) in the bundle: " + licensed.join(", "));
  }
  console.log("  inputs: " + inputs.length + " files, 0 under Pocket3D-licensed paths");
  const jsPath = join(outdir, name + ".js");
  const bundleBytes = Bun.file(jsPath).size;
  console.log("  bundle: " + bundleBytes + " bytes -> " + jsPath);
  return { js: jsPath, pak: pakPath, bundleBytes, pakBytes: pak.length, fontSlots };
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const entry = args.find((a) => !a.startsWith("--"));
  if (!entry) {
    console.error("usage: bun tools/build.ts <entry.tsx> [--outdir=dist] [--name=<name>] [--minify]");
    process.exit(2);
  }
  const get = (flag: string) => args.find((a) => a.startsWith(flag + "="))?.slice(flag.length + 1);
  try {
    await build(entry, { outdir: get("--outdir"), name: get("--name"), minify: args.includes("--minify") });
  } catch (error) {
    console.error(String(error instanceof Error ? error.message : error));
    process.exit(1);
  }
}