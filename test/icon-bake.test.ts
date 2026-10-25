// Icon bake: every baked variant is a pow2 PSM_8888 IMG entry, deterministic, centred, and
// drawn in its own colour. The bake is offline (resvg-wasm), so these run with no network.
import { createHash } from "node:crypto";
import { expect, test } from "bun:test";
import { type IconEntry, ICON_COLOURS, bakeIcons, iconBlobs, lucideIcons } from "../tools/icon-bake.ts";
import { PSM } from "../src/internal/pocket-build.ts";
import { ICON_COLOUR_NAMES } from "../src/style/icon-names.ts";

/** The five demo icons the vendored sources draw: their centring is held to the box centre. */
const DEMO = ["chevron-down", "chevron-up", "chevron-right", "x", "check"];

let entries: IconEntry[] | undefined;
async function baked(): Promise<IconEntry[]> {
  return (entries ??= await bakeIcons());
}

/** Bounding box of the pixels with any alpha. */
function ink(e: IconEntry) {
  const { width: w, height: h, rgba } = e.image;
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (rgba[(y * w + x) * 4 + 3] > 0) {
        x0 = Math.min(x0, x); y0 = Math.min(y0, y);
        x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      }
  return { x0, y0, x1: x1 + 1, y1: y1 + 1 };
}

test("the bake yields every canonical lucide icon at 16 px in three colours, plus the 8 px circle", async () => {
  // lucide-react 1.61.0: 1903 canonical icons; the circle also bakes its filled 8 px variant.
  expect((await lucideIcons()).length).toBe(1903);
  const ids = (await baked()).map((e) => e.id);
  expect(ids.length).toBe(1903 * 3 + 3);
  expect(new Set(ids).size).toBe(ids.length);
  for (const c of ICON_COLOUR_NAMES) {
    expect(ids).toContain("icon.circle.8." + c);
    expect(ids).toContain("icon.grid-2x2.16." + c);
  }
});

test("every variant draws some ink", async () => {
  for (const e of await baked()) {
    const b = ink(e);
    expect(b.x1).toBeGreaterThan(b.x0);
  }
});

test("every entry is a pow2 PSM_4444 IMG blob with straight-alpha pixels", async () => {
  for (const blob of iconBlobs(await baked())) {
    const dv = new DataView(blob.data.buffer, blob.data.byteOffset, blob.data.byteLength);
    const w = dv.getUint16(0, true), h = dv.getUint16(2, true);
    expect(blob.key.startsWith("ui:img.icon.")).toBe(true);
    expect(w & (w - 1)).toBe(0);
    expect(h).toBe(w);
    expect(blob.data[4]).toBe(PSM.PSM_4444);
    expect(blob.data.length).toBe(8 + w * h * 2);
  }
});

test("a PSM_4444 entry decodes to its source within 8 of 255 per channel", async () => {
  const sources = new Map((await baked()).map((e) => [e.id, e.image.rgba]));
  for (const blob of iconBlobs(await baked())) {
    const dv = new DataView(blob.data.buffer, blob.data.byteOffset, blob.data.byteLength);
    const w = dv.getUint16(0, true), h = dv.getUint16(2, true);
    const src = sources.get(blob.key.slice("ui:img.".length))!;
    for (let p = 0; p < w * h; p++) {
      // pak.ts 4444 layout: (a << 12) | (b << 8) | (g << 4) | r, little-endian.
      const v = dv.getUint16(8 + p * 2, true);
      const got = [v & 15, (v >> 4) & 15, (v >> 8) & 15, (v >> 12) & 15].map((n) => n * 17);
      for (let c = 0; c < 4; c++) expect(Math.abs(got[c] - src[p * 4 + c])).toBeLessThanOrEqual(8);
    }
  }
});

test("the bake is deterministic: two runs give identical bytes", async () => {
  const digest = (es: IconEntry[]) => {
    const hash = createHash("sha256");
    for (const b of iconBlobs(es)) hash.update(b.data);
    return hash.digest("hex");
  };
  const first = digest(await baked());
  expect(digest(await bakeIcons())).toBe(first);
});

test("opaque pixels take the variant's colour; partial pixels are its colour at partial alpha", async () => {
  for (const e of await baked()) {
    const hex = ICON_COLOURS[e.colour];
    const want = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    const { rgba } = e.image;
    for (let i = 0; i < rgba.length; i += 4) {
      const a = rgba[i + 3];
      if (a === 0) continue;
      if (a === 255) expect([rgba[i], rgba[i + 1], rgba[i + 2]]).toEqual(want);
      // The core composites premultiplied colour, so the error that shows is the premultiplied one. resvg's
      // 8-bit blending of overlapping strokes leaves at most 3 of 255 there (straight error is that over alpha).
      else for (let c = 0; c < 3; c++) expect(Math.abs(rgba[i + c] * a / 255 - want[c] * a / 255)).toBeLessThanOrEqual(3);
    }
  }
});

test("each stroked icon is centred in its square box and not stretched", async () => {
  for (const e of (await baked()).filter((x) => DEMO.includes(x.name))) {
    const b = ink(e);
    const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
    // Chevrons and X are symmetric about the box centre; the check mark sits lower, so only its x is held.
    expect(Math.abs(cx - e.px / 2)).toBeLessThanOrEqual(1);
    if (e.name !== "check") expect(Math.abs(cy - e.px / 2)).toBeLessThanOrEqual(1);
    expect(b.x1 - b.x0).toBeGreaterThan(e.px / 3);
  }
});

test("the filled circle is a solid disc in the middle of its box", async () => {
  for (const e of (await baked()).filter((x) => x.name === "circle" && x.px === 8)) {
    const { width: w, rgba } = e.image;
    const mid = (w / 2) * w + w / 2;
    expect(rgba[mid * 4 + 3]).toBeGreaterThanOrEqual(250);
    expect(rgba[0 * 4 + 3]).toBe(0); // corner is outside the disc
  }
});
