// The app icon, drawn in code (no third-party artwork): an open book on a rounded square.
// makeIcns() renders it at 1024 px, scales an .iconset with sips and packs it with iconutil.
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { encodePng } from "../../test/png.ts";

type Rgb = [number, number, number];
const BG: Rgb = [30, 41, 59];
const PAGE: Rgb = [248, 250, 252];
const LINE: Rgb = [148, 163, 184];

/** Inside a rounded rectangle (x, y, w, h, corner radius r)? */
function inRound(px: number, py: number, x: number, y: number, w: number, h: number, r: number): boolean {
  if (px < x || py < y || px > x + w || py > y + h) return false;
  const cx = Math.min(Math.max(px, x + r), x + w - r);
  const cy = Math.min(Math.max(py, y + r), y + h - r);
  return (px - cx) ** 2 + (py - cy) ** 2 <= r * r;
}

/** The colour at a point of the 1024-unit design, or null outside the icon. */
function shade(x: number, y: number): Rgb | null {
  if (!inRound(x, y, 100, 100, 824, 824, 185)) return null;
  for (const left of [212, 524]) {
    if (inRound(x, y, left, 262, 288, 500, 28)) {
      for (let i = 0; i < 6; i++) if (inRound(x, y, left + 44, 330 + i * 64, i === 5 ? 120 : 200, 20, 10)) return LINE;
      return PAGE;
    }
  }
  return BG;
}

/** RGBA pixels of the icon at `size` px, 4x4 supersampled. */
export function drawIcon(size = 1024): Uint8Array {
  const out = new Uint8Array(size * size * 4);
  const unit = 1024 / size;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, hits = 0;
      for (let sy = 0; sy < 4; sy++) {
        for (let sx = 0; sx < 4; sx++) {
          const c = shade((px + (sx + 0.5) / 4) * unit, (py + (sy + 0.5) / 4) * unit);
          if (!c) continue;
          r += c[0]; g += c[1]; b += c[2]; hits++;
        }
      }
      const o = (py * size + px) * 4;
      if (hits) out.set([Math.round(r / hits), Math.round(g / hits), Math.round(b / hits), Math.round((hits / 16) * 255)], o);
    }
  }
  return out;
}

function run(cmd: string[]): void {
  const proc = Bun.spawnSync(cmd);
  if (proc.exitCode !== 0) throw new Error(cmd[0] + " failed: " + proc.stderr.toString());
}

/** Write AppIcon.icns to `icns`, using `work` for the intermediate .iconset. */
export async function makeIcns(icns: string, work: string): Promise<void> {
  const set = join(work, "AppIcon.iconset");
  rmSync(set, { recursive: true, force: true });
  mkdirSync(set, { recursive: true });
  const master = join(work, "icon-1024.png");
  await Bun.write(master, encodePng(drawIcon(1024), 1024, 1024));
  for (const base of [16, 32, 128, 256, 512]) {
    for (const scale of [1, 2]) {
      const px = base * scale;
      const name = "icon_" + base + "x" + base + (scale === 2 ? "@2x" : "") + ".png";
      run(["sips", "-z", String(px), String(px), master, "--out", join(set, name)]);
    }
  }
  run(["iconutil", "-c", "icns", set, "-o", icns]);
}
