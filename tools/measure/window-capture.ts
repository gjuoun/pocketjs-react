// Runs a guest on the macOS desktop host with scripted presses and captures this process's own
// window (screencapture -l <window id>) shortly after the first render and after each press,
// while the host is still running. Returns the PNG paths in that order.
import { join } from "node:path";
import type { DesktopHost } from "./desktop-host.ts";

export const DENSITY = 2; // pixels per logical pixel the host renders at
export const VIEWPORT = { w: 480, h: 272 };

export async function captureWindow(host: DesktopHost, opts: { guest: string; pak: string; presses: string[]; quitAfter: number; dir: string; prefix: string }): Promise<string[]> {
  await Bun.$`mkdir -p ${opts.dir}`;
  const proc = Bun.spawn([host.bin, "--app", "pocketjs-react", "--title", "pocketjs-react shot", "--viewport", VIEWPORT.w + "x" + VIEWPORT.h, "--density", String(DENSITY), "--fixed", "--quit-after", String(opts.quitAfter), "--js", opts.guest, "--pak", opts.pak, ...opts.presses.flatMap((p) => ["--press", p])], {
    cwd: host.root, stdout: "pipe", stderr: "pipe", env: { ...process.env, RUST_LOG: "info" },
  });
  let windowId = "";
  let list = "";
  for (let i = 0; i < 100 && !windowId; i++) {
    list = await Bun.$`osascript -l JavaScript ${import.meta.dir}/window-ids.js ${proc.pid}`.nothrow().text();
    // The host's one normal-layer window. Its size follows the display (a fixed viewport is scaled
    // to fit), so it is not matched by size; captures are scaled back to logical pixels.
    windowId = list.split("\n").find((l) => l.split(":")[1] === "0" && /"Height":(\d{3,})/.test(l))?.split(":")[0] ?? "";
    if (!windowId) await Bun.sleep(100);
  }
  if (!windowId) {
    proc.kill();
    throw new Error("desktop host window not found; windows of pid " + proc.pid + ": " + JSON.stringify(list));
  }
  const files: string[] = [];
  const captures: Promise<void>[] = [];
  let buffer = "";
  const reader = proc.stderr.getReader();
  for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
    buffer += new TextDecoder().decode(chunk.value);
    let nl: number;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl);
      buffer = buffer.slice(nl + 1);
      if (!/MEASURE (first-render|press)/.test(line)) continue;
      const n = files.length;
      files.push(join(opts.dir, opts.prefix + n + ".png"));
      captures.push(Bun.sleep(700).then(async () => {
        const shot = await Bun.$`screencapture -x -o -l ${windowId} ${files[n]}`.quiet().nothrow();
        if (shot.exitCode !== 0) throw new Error("screencapture of window " + windowId + " failed for capture " + n + " (windows: " + JSON.stringify(list) + "): " + shot.stderr.toString());
        await Bun.$`sips -s format bmp ${files[n]} --out ${files[n]}.bmp`.quiet();
      }));
    }
  }
  await proc.exited;
  await Promise.all(captures);
  return files;
}

/** Pixel reader over a captured window, in logical coordinates of the 480x272 canvas. */
export function readCapture(png: string) {
  const b = require("node:fs").readFileSync(png + ".bmp") as Buffer;
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const off = dv.getUint32(10, true), w = dv.getInt32(18, true), h = dv.getInt32(22, true), bpp = dv.getUint16(28, true);
  const stride = Math.ceil((w * bpp) / 32) * 4;
  // The canvas fills the window's width; the title bar sits above it.
  const scale = w / VIEWPORT.w;
  const top = Math.abs(h) - Math.round(VIEWPORT.h * scale);
  const rgb = (x: number, y: number): [number, number, number] => {
    const px = Math.floor((x + 0.5) * scale), py = top + Math.floor((y + 0.5) * scale);
    const row = h > 0 ? Math.abs(h) - 1 - py : py;
    const i = off + row * stride + (px * bpp) / 8;
    return [b[i + 2], b[i + 1], b[i]];
  };
  /** Dark pixels (text on the light theme) inside a logical rect. */
  const ink = (r: { x: number; y: number; w: number; h: number }) => {
    let n = 0;
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < Math.min(r.x + r.w, VIEWPORT.w); x++) { const [R, G, B] = rgb(x, y); if (R + G + B < 300) n++; }
    return n;
  };
  /** Signature of a rect's pixels, to tell two captures apart. */
  const hash = (r: { x: number; y: number; w: number; h: number }) => {
    let acc = 0;
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < Math.min(r.x + r.w, VIEWPORT.w); x++) { const [R, G, B] = rgb(x, y); acc = (Math.imul(acc, 31) + R * 65536 + G * 256 + B) | 0; }
    return acc;
  };
  return { rgb, ink, hash, scale };
}
