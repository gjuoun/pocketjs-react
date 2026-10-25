// tools/build.ts <entry.tsx> [--outdir=dist] [--name=<name>] [--minify]
//                [--asset <name>=<file>]... [--glyphs <file>]...
//                [--cjk-set <file> --cjk-font <font.otf> [--cjk-slots 1,2,3]]
//
// Pass 1 (tools/collect.ts) scans literals from the entry's import graph and from
// pocketjs-react's own src/, then uses PocketJS's compiler to produce:
//   - the static style table (every literal that is a complete class string),
//   - font atlases for the cross product of every text-size and weight token found, so a
//     class combination assembled at runtime (text-sm + font-bold) still has glyphs,
//   - the pak (styles.bin + atlases).
// Pass 2 bundles the app with Bun.build into one IIFE. A virtual module installs the
// compiled table before the app entry runs.
// Assets (--asset) are embedded in the bundle and read with bundledAsset(name): the desktop
// host feeds the pak to the core but does not expose it to guest JS, so the bundle is the one
// channel every host shares. Glyph files (--glyphs) add their codepoints, plus Latin-1 and
// General Punctuation, to every baked atlas, for text that only arrives at runtime (books).
// A CJK set (--cjk-set) is baked into the listed regular slots only, with --cjk-font as the
// fallback face for what the default faces lack. A books build embeds the codepoints its body
// slots hold (bakedGlyphs()), so a reader can count what this host cannot draw.
// The build fails when any bundle input comes from PocketJS's Pocket3D-licensed paths.
import { basename, dirname, join, resolve } from "node:path";
import { rewriteLiteral } from "../src/compat/tokens.ts";
import {
  bakeAtlases,
  compileClasses,
  DEFAULT_FONT_SLOT,
  fontSlotFor,
  generateStylesModule,
  KEY_STYLES,
  keyFont,
  MONO_FONT_PX,
  PAK_DTYPE,
  pack,
  suspectClassLiteral,
  unknownUtilities,
} from "../src/internal/pocket-build.ts";
import { collect } from "./collect.ts";
import { bakeIcons, iconBlobs } from "./icon-bake.ts";

const ROOT = resolve(import.meta.dir, "..");
const TEXT_SIZES: Record<string, number> = {
  "2xs": 10,
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "4xl": 36,
  "5xl": 54,
};
const LICENSED =
  /node_modules\/@pocketjs\/framework\/(pocket3d|devices|engine\/pocket3d)\//;

export interface BuildResult {
  js: string;
  pak: string;
  bundleBytes: number;
  pakBytes: number;
  fontSlots: number[];
  /** The utility tokens the build table holds (STYLE_TOKENS), for tests that drive the runtime directly. */
  tokens: string[];
  /** Pak keys of the baked icon variants (`ui:img.icon.*`). */
  icons: string[];
}

/** Font slots for every (size x weight x family) combination whose tokens appear in source. */
export function slotCrossProduct(literals: string[], used: number[]): number[] {
  const tokens = new Set<string>();
  for (const lit of literals)
    for (const tok of lit.split(/\s+/))
      if (tok) tokens.add(tok.replace(/^(focus|active):/, ""));
  const sizes = new Set<number>([16]);
  for (const [name, px] of Object.entries(TEXT_SIZES))
    if (tokens.has("text-" + name)) sizes.add(px);
  const bolds = tokens.has("font-bold") ? [false, true] : [false];
  const slots = new Set<number>([DEFAULT_FONT_SLOT, ...used]);
  for (const px of sizes) {
    for (const bold of bolds) slots.add(fontSlotFor(px, bold));
    if (
      tokens.has("font-mono") &&
      (MONO_FONT_PX as readonly number[]).includes(px)
    )
      slots.add(fontSlotFor(px, false, true));
  }
  return [...slots].sort((a, b) => a - b);
}

/** Codepoints every book-reading build bakes beyond ASCII: Latin-1 Supplement and General Punctuation. */
export const BOOK_RANGES: [number, number][] = [
  [0xa0, 0xff],
  [0x2010, 0x2027],
  [0x2030, 0x203a],
  [0x20ac, 0x20ac],
  [0x2122, 0x2122],
];

export interface BuildOptions {
  outdir?: string;
  name?: string;
  minify?: boolean;
  /** name -> file, embedded in the bundle (read with bundledAsset). */
  assets?: Record<string, string>;
  /** Text files whose codepoints (plus BOOK_RANGES) are baked into every atlas slot. */
  glyphs?: string[];
  /** A CJK character set baked into `slots` (regular slots) with `font` as the fallback face. */
  cjk?: { set: string; font: string; slots: number[] };
}

/** Extra characters a CJK slot leaves out: an atlas cell is as wide as its widest glyph, and these
 *  (per mille, per ten thousand) are half again as wide as a hanzi, which would grow a 9,000-glyph
 *  atlas by 30-60 %. They draw as placeholder boxes there and count as missing. */
export const CJK_SLOT_SKIP = "\u2030\u2031";

/** Codepoints a FONT ATLAS blob maps: u16 glyph count at byte 6, then 8-byte cmap entries
 *  (u32 codepoint first) from byte 16 (contracts/spec/spec.ts). */
export function atlasCodepoints(bytes: Uint8Array): Set<number> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const out = new Set<number>();
  for (let i = 0, n = view.getUint16(6, true); i < n; i++)
    out.add(view.getUint32(16 + i * 8, true));
  return out;
}

/** Body font slots of a books build: the regular text-sm / text-base / text-lg slots. */
export const BODY_SLOTS = [1, 2, 3];

export async function build(
  entryArg: string,
  opts: BuildOptions = {},
): Promise<BuildResult> {
  const entry = resolve(entryArg);
  const outdir = resolve(opts.outdir ?? join(ROOT, "dist"));
  const name = opts.name ?? basename(dirname(entry));

  // ---- pass 1 -------------------------------------------------------------
  const scanned = await collect(entry, [join(ROOT, "src")]);
  // C2: rewrite shadcn vocabulary to PocketJS vocabulary before anything compiles or counts,
  // through the same fixed table the runtime uses, so a runtime rewrite is an exact table hit.
  const literals = scanned.literals.map(rewriteLiteral);
  const styles = compileClasses(literals);
  for (const lit of literals) {
    const bad = suspectClassLiteral(lit);
    if (bad)
      console.warn(
        "  warning: not a supported utility: " +
          bad.join(", ") +
          " in " +
          JSON.stringify(lit),
      );
  }
  const fontSlots = slotCrossProduct(literals, styles.usedFontSlots);
  // Every complete utility token in the source. The runtime compiles only class strings
  // made of these tokens: like Tailwind, a name assembled at runtime is not supported.
  const tokens = new Set<string>();
  for (const lit of literals) {
    for (const tok of lit.split(/\s+/))
      if (tok && !tokens.has(tok) && unknownUtilities(tok).length === 0)
        tokens.add(tok);
  }
  let extraChars = "";
  if (opts.glyphs?.length) {
    const extra = new Set<string>();
    for (const [from, to] of BOOK_RANGES)
      for (let c = from; c <= to; c++) extra.add(String.fromCodePoint(c));
    for (const file of opts.glyphs)
      for (const ch of await Bun.file(resolve(file)).text())
        if (ch.codePointAt(0)! > 126) extra.add(ch);
    extraChars = [...extra].join("");
    console.log(
      "  glyphs: " +
        extra.size +
        " extra codepoints from " +
        opts.glyphs.length +
        " file(s) + Latin-1/punctuation",
    );
  }
  const cjkSlots = opts.cjk
    ? fontSlots.filter((s) => opts.cjk!.slots.includes(s))
    : [];
  const atlases = await bakeAtlases({
    codepoints: scanned.codepoints,
    slots: fontSlots.filter((s) => !cjkSlots.includes(s)),
    extraChars,
    rasterDensity: 1,
  });
  let cjkChars = "";
  if (opts.cjk) {
    const lines = (await Bun.file(resolve(opts.cjk.set)).text()).split("\n");
    const hanzi = [...lines[0]];
    const marks = [...lines.slice(1).join("")].filter(
      (ch) => ch.codePointAt(0)! > 126,
    );
    cjkChars =
      [...extraChars].filter((ch) => !CJK_SLOT_SKIP.includes(ch)).join("") +
      hanzi.join("") +
      marks.join("");
    const t = performance.now();
    const codepoints = new Set(
      [...scanned.codepoints].filter(
        (cp) => !CJK_SLOT_SKIP.includes(String.fromCodePoint(cp)),
      ),
    );
    const cjk = await bakeAtlases({
      codepoints,
      slots: cjkSlots,
      extraChars: cjkChars,
      rasterDensity: 1,
      fallbackTtfs: [resolve(opts.cjk.font)],
    });
    atlases.push(...cjk);
    atlases.sort((a, b) => a.slot - b.slot);
    const bytes = cjk.reduce((n, a) => n + a.bytes.length, 0);
    console.log(
      "  cjk: " +
        hanzi.length +
        " hanzi + " +
        marks.length +
        " marks baked into slots " +
        cjkSlots.join(",") +
        " from " +
        basename(opts.cjk.font) +
        " (" +
        (cjk[0]?.glyphCount ?? 0) +
        " glyphs/slot, " +
        bytes +
        " bytes, " +
        (performance.now() - t).toFixed(0) +
        " ms)",
    );
  }
  // Codepoints above ASCII every body slot's atlas maps (read back from the atlases' cmaps, so a
  // character the fonts lack is not counted), for bakedGlyphs(). Books builds only.
  let bakedChars: string | null = null;
  if (opts.glyphs?.length || opts.cjk) {
    const maps = atlases
      .filter((a) => BODY_SLOTS.includes(a.slot))
      .map((a) => atlasCodepoints(a.bytes));
    const common = maps.length
      ? [...maps[0]].filter((cp) => cp > 126 && maps.every((m) => m.has(cp)))
      : [];
    bakedChars = common.map((cp) => String.fromCodePoint(cp)).join("");
  }
  // Icon variants: one ui:img.icon.* IMG entry per (icon, size, colour).
  const icons = iconBlobs(await bakeIcons());
  const pak = pack([
    { key: KEY_STYLES, dtype: PAK_DTYPE.u8, data: styles.bin },
    ...atlases.map((a) => ({
      key: keyFont(a.slot),
      dtype: PAK_DTYPE.u8,
      data: a.bytes,
    })),
    ...icons,
  ]);
  const pakPath = join(outdir, name + ".pak");
  await Bun.write(pakPath, pak);
  console.log(
    "  pass 1: " +
      scanned.files.length +
      " files, " +
      scanned.literals.length +
      " literals, " +
      styles.records.length +
      " style records",
  );
  console.log(
    "  fontSlots=" + fontSlots.join(",") + " utilityTokens=" + tokens.size,
  );
  console.log("  pak: " + pak.length + " bytes -> " + pakPath);

  // ---- pass 2 -------------------------------------------------------------
  const stylesModule =
    generateStylesModule(styles) +
    "\nexport const STYLE_BIN = new Uint8Array([" +
    Array.from(styles.bin).join(",") +
    "]);\n" +
    "export const STYLE_TOKENS = " +
    JSON.stringify([...tokens]) +
    ";\n";
  const install = [
    "import { installBuildStyles } from " +
      JSON.stringify(join(ROOT, "src/style/build-styles.ts")) +
      ";",
    'import { STYLE_IDS, STYLE_BIN, STYLE_TOKENS } from "pocketjs-react:styles";',
    "installBuildStyles(STYLE_IDS, STYLE_BIN, STYLE_TOKENS);",
  ].join("\n");
  const assets: Record<string, string> = {};
  for (const [assetName, file] of Object.entries(opts.assets ?? {}))
    assets[assetName] = Buffer.from(
      await Bun.file(resolve(file)).arrayBuffer(),
    ).toString("base64");
  if (Object.keys(assets).length)
    console.log(
      "  assets: " +
        Object.entries(assets)
          .map(([k, v]) => k + " (" + Math.floor((v.length * 3) / 4) + " B)")
          .join(", "),
    );
  const installAssets = [
    "import { installBundledAssets } from " +
      JSON.stringify(join(ROOT, "src/books/assets.ts")) +
      ";",
    "installBundledAssets(" + JSON.stringify(assets) + ");",
    ...(bakedChars !== null
      ? [
          "import { installBakedGlyphs } from " +
            JSON.stringify(join(ROOT, "src/books/assets.ts")) +
            ";",
          "installBakedGlyphs(" + JSON.stringify(bakedChars) + ");",
        ]
      : []),
  ].join("\n");
  const virtualEntry =
    'import "pocketjs-react:install-styles";\nimport "pocketjs-react:install-assets";\nimport ' +
    JSON.stringify(entry) +
    ";\n";
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
    plugins: [
      {
        name: "pocketjs-react",
        setup(b) {
          b.onResolve({ filter: /^pocketjs-react:/ }, (a) => ({
            path: a.path,
            namespace: "pocketjs-react",
          }));
          b.onResolve({ filter: /^pocketjs-react$/ }, () => ({
            path: join(ROOT, "src/index.ts"),
          }));
          b.onLoad({ filter: /.*/, namespace: "pocketjs-react" }, (a) => {
            if (a.path === "pocketjs-react:entry")
              return { contents: virtualEntry, loader: "ts", resolveDir: ROOT };
            if (a.path === "pocketjs-react:install-styles")
              return { contents: install, loader: "ts", resolveDir: ROOT };
            if (a.path === "pocketjs-react:install-assets")
              return {
                contents: installAssets,
                loader: "ts",
                resolveDir: ROOT,
              };
            return { contents: stylesModule, loader: "ts", resolveDir: ROOT };
          });
        },
      },
    ],
  });
  if (!result.success) {
    for (const log of result.logs) console.error(log);
    throw new Error("pocketjs-react build: bundling failed");
  }
  const inputs = Object.keys(result.metafile?.inputs ?? {});
  const licensed = inputs.filter((p) => LICENSED.test(p));
  if (licensed.length > 0) {
    throw new Error(
      "pocketjs-react build: Pocket3D-licensed input(s) in the bundle: " +
        licensed.join(", "),
    );
  }
  console.log(
    "  inputs: " + inputs.length + " files, 0 under Pocket3D-licensed paths",
  );
  const jsPath = join(outdir, name + ".js");
  const bundleBytes = Bun.file(jsPath).size;
  console.log("  bundle: " + bundleBytes + " bytes -> " + jsPath);
  return {
    js: jsPath,
    pak: pakPath,
    bundleBytes,
    pakBytes: pak.length,
    fontSlots,
    tokens: [...tokens],
    icons: icons.map((b) => b.key),
  };
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const entry = args.find(
    (a, i) =>
      !a.startsWith("--") &&
      ![
        "--asset",
        "--glyphs",
        "--cjk-set",
        "--cjk-font",
        "--cjk-slots",
      ].includes(args[i - 1]),
  );
  if (!entry) {
    console.error(
      "usage: bun tools/build.ts <entry.tsx> [--outdir=dist] [--name=<name>] [--minify]",
    );
    process.exit(2);
  }
  const get = (flag: string) =>
    args.find((a) => a.startsWith(flag + "="))?.slice(flag.length + 1);
  const all = (flag: string) =>
    args.flatMap((a, i) =>
      a === flag
        ? [args[i + 1]]
        : a.startsWith(flag + "=")
          ? [a.slice(flag.length + 1)]
          : [],
    );
  const assets = Object.fromEntries(
    all("--asset").map((spec) => [
      spec.slice(0, spec.indexOf("=")),
      spec.slice(spec.indexOf("=") + 1),
    ]),
  );
  const cjkSet = all("--cjk-set")[0];
  const cjkFont = all("--cjk-font")[0];
  const cjk =
    cjkSet && cjkFont
      ? {
          set: cjkSet,
          font: cjkFont,
          slots: (all("--cjk-slots")[0] ?? BODY_SLOTS.join(","))
            .split(",")
            .map(Number),
        }
      : undefined;
  try {
    await build(entry, {
      outdir: get("--outdir"),
      name: get("--name"),
      minify: args.includes("--minify"),
      assets,
      glyphs: all("--glyphs"),
      cjk,
    });
  } catch (error) {
    console.error(String(error instanceof Error ? error.message : error));
    process.exit(1);
  }
}
