// Build-time icon baker: lucide-react icon art -> resvg-wasm rasterizer -> PSM_8888
// IMG entries for the pak. One entry per (icon, pixel size, colour): the core cannot tint a texture
// at runtime (TEX_QUAD modulate is fixed at white x opacity), so each colour is its own variant.
// Build-time only: guest code never imports this module.

import { readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { Resvg, initWasm } from "@resvg/resvg-wasm";
import { ICON_COLOUR_NAMES, ICON_COLOURS, type IconColour, iconName } from "../src/style/icon-names.ts";

export { ICON_COLOURS, type IconColour, iconName } from "../src/style/icon-names.ts";
import {
  type DecodedImage,
  encodeImageEntry,
  keyImage,
  PAK_DTYPE,
  type PakBlob,
} from "../src/internal/pocket-build.ts";

/** Filled variants beyond the 16 px stroke: CircleIcon is `fill-current` (a solid 8 px disc) in shadcn. */
const EXTRA_VARIANTS: Record<string, { px: number; filled: boolean }[]> = {
  circle: [{ px: 8, filled: true }],
};

/** Every variant baked for a lucide icon: its 16 px stroke art, plus any extra variant it needs. */
export function variantsOf(name: string): { px: number; filled: boolean }[] {
  return [{ px: 16, filled: false }, ...(EXTRA_VARIANTS[name] ?? [])];
}

export interface IconEntry {
  name: string;
  px: number;
  colour: IconColour;
  /** Registry name (`registerTexture` key, without the `ui:img.` prefix). */
  id: string;
  image: DecodedImage;
}

/** lucide-react `__iconData`: { name, size, node: [[tag, attrs], ...] }. */
export interface LucideData {
  node: [string, Record<string, string>][];
}

/** A canonical lucide icon: its art and the alias names it answers to. */
export interface LucideIcon {
  name: string;
  data: LucideData;
  aliases: string[];
}

let wasmReady: Promise<void> | undefined;
function resvg(): Promise<void> {
  return (wasmReady ??= (async () => {
    const wasmPath = createRequire(import.meta.url).resolve("@resvg/resvg-wasm/index_bg.wasm");
    await initWasm(await Bun.file(wasmPath).arrayBuffer());
  })());
}

/** A lucide icon's art as an SVG document at its design size (24). */
export function iconSvg(data: LucideData, colour: IconColour, filled: boolean): string {
  const hex = ICON_COLOURS[colour];
  const paint = filled
    ? `fill="${hex}" stroke="none"`
    : `fill="none" stroke="${hex}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`;
  // lucide draws a few dots with fill="currentColor"; resolve it to the variant colour, as its stroke is.
  const node = data.node.map(([tag, attrs]): [string, Record<string, string>] => [
    tag,
    Object.fromEntries(Object.entries(attrs).map(([k, v]) => [k, v === "currentColor" ? hex : v])),
  ]);
  const body = node
    .map(([tag, attrs]) => {
      const parts = Object.entries(attrs)
        .filter(([k]) => k !== "key")
        .map(([k, v]) => `${k}="${v}"`);
      return `<${tag} ${parts.join(" ")}/>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" ${paint}>${body}</svg>`;
}

/** Rasterize one SVG at `px` x `px` (the 24-unit viewBox scaled to width) into straight RGBA. */
export async function rasterize(svg: string, px: number): Promise<DecodedImage> {
  await resvg();
  const r = new Resvg(svg, { fitTo: { mode: "width", value: px } });
  const img = r.render();
  // resvg hands back premultiplied RGBA; the pak stores straight alpha (the core blends straight).
  const rgba = new Uint8Array(img.pixels);
  for (let i = 0; i < rgba.length; i += 4) {
    const a = rgba[i + 3];
    if (a === 0 || a === 255) continue;
    for (let c = 0; c < 3; c++) rgba[i + c] = Math.min(255, Math.round((rgba[i + c] * 255) / a));
  }
  const out: DecodedImage = { width: img.width, height: img.height, rgba };
  img.free();
  r.free();
  if (out.width !== px || out.height !== px)
    throw new Error(`icon bake: ${px}px raster came out ${out.width}x${out.height}`);
  return out;
}

/** Every canonical lucide icon (1903 at lucide-react 1.61.0), sorted by name. Alias modules carry no
 *  art: each name sits in its canonical icon's `aliases`, so only canonical modules are returned. */
export async function lucideIcons(): Promise<LucideIcon[]> {
  const dir = dirname(createRequire(import.meta.url).resolve("lucide-react/dist/esm/icons/x.mjs"));
  const out: LucideIcon[] = [];
  for (const file of readdirSync(dir).sort()) {
    if (!file.endsWith(".mjs")) continue;
    const mod = (await import(join(dir, file))) as { __iconData?: LucideData & { name: string; aliases?: string[] } };
    if (mod.__iconData)
      out.push({ name: mod.__iconData.name, data: mod.__iconData, aliases: [...(mod.__iconData.aliases ?? [])] });
  }
  return out.sort((x, y) => (x.name < y.name ? -1 : x.name > y.name ? 1 : 0));
}

/** Every (icon, size, colour) variant, in a fixed order so the pak is byte-stable. */
export async function bakeIcons(): Promise<IconEntry[]> {
  const out: IconEntry[] = [];
  for (const icon of await lucideIcons())
    for (const v of variantsOf(icon.name))
      for (const colour of ICON_COLOUR_NAMES) {
        const image = await rasterize(iconSvg(icon.data, colour, v.filled), v.px);
        out.push({ name: icon.name, px: v.px, colour, id: iconName(icon.name, v.px, colour), image });
      }
  return out;
}

/** Pak blobs for the baked icons: one `ui:img.icon.*` IMG entry each (PSM_8888, nearest sampling). */
export function iconBlobs(entries: IconEntry[]): PakBlob[] {
  return entries.map((e) => ({
    key: keyImage(e.id),
    dtype: PAK_DTYPE.u8,
    data: encodeImageEntry(e.image),
  }));
}
