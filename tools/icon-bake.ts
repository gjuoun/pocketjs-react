// Build-time icon baker: lucide-react icon art -> resvg-wasm rasterizer -> PSM_8888
// IMG entries for the pak. One entry per (icon, pixel size, colour): the core cannot tint a texture
// at runtime (TEX_QUAD modulate is fixed at white x opacity), so each colour is its own variant.
// Build-time only: guest code never imports this module.

import { createRequire } from "node:module";
import { Resvg, initWasm } from "@resvg/resvg-wasm";
import {
  type DecodedImage,
  encodeImageEntry,
  keyImage,
  PAK_DTYPE,
  type PakBlob,
} from "../src/internal/pocket-build.ts";

/** Colour variants: the three text colours the shadcn surfaces resolve to (src/compat/tokens.ts). */
export const ICON_COLOURS = {
  "slate-900": "#0f172a",
  "slate-500": "#64748b",
  white: "#ffffff",
} as const;
export type IconColour = keyof typeof ICON_COLOURS;

/** The six icons the vendored shadcn sources import. `filled` mirrors `fill-current` (CircleIcon). */
export const ICONS: { name: string; file: string; filled: boolean; sizes: number[] }[] = [
  { name: "chevron-down", file: "chevron-down", filled: false, sizes: [16] },
  { name: "chevron-up", file: "chevron-up", filled: false, sizes: [16] },
  { name: "chevron-right", file: "chevron-right", filled: false, sizes: [16] },
  { name: "x", file: "x", filled: false, sizes: [16] },
  { name: "check", file: "check", filled: false, sizes: [16] },
  { name: "circle", file: "circle", filled: true, sizes: [8] },
];

/** Name a baked variant: `icon.<name>.<px>.<colour>`. The pak key is `ui:img.` + this. */
export function iconName(name: string, px: number, colour: IconColour): string {
  return `icon.${name}.${px}.${colour}`;
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
  const body = data.node
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

/** Every (icon, size, colour) variant, in a fixed order so the pak is byte-stable. */
export async function bakeIcons(): Promise<IconEntry[]> {
  const out: IconEntry[] = [];
  for (const icon of ICONS) {
    const mod = (await import(`lucide-react/dist/esm/icons/${icon.file}.mjs`)) as {
      __iconData: LucideData;
    };
    for (const px of icon.sizes)
      for (const colour of Object.keys(ICON_COLOURS) as IconColour[]) {
        const image = await rasterize(iconSvg(mod.__iconData, colour, icon.filled), px);
        out.push({ name: icon.name, px, colour, id: iconName(icon.name, px, colour), image });
      }
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
