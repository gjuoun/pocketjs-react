// bun run measure:desktop-shot — real-window pixels on the macOS desktop host.
// 1. Runs the example on the wasm core in Bun to learn where the Alpha and Bravo labels are
//    drawn (the desktop host runs the same core, at density 2).
// 2. Runs it on the desktop host with a scripted d-pad sequence, captures this process's own
//    window after each press (screencapture -l <window id>) and reads the pixels there.
// 3. Fails unless the drawn result follows the state: Alpha's label moves right when it is
//    toggled on, and Bravo's label returns to its first position when toggled off.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FB_W, FRAMEWORK_ROOT, createWasmUi } from "../../src/internal/pocket-build.ts";
import { OUT, buildExample, wrapGuest } from "./common.ts";
import { desktopHost } from "./desktop-host.ts";

const DENSITY = 2;
const VIEWPORT = { w: 480, h: 272 };
const host = desktopHost();
const built = await buildExample();

// ---- 1. layout from the wasm core ---------------------------------------------------
const core = await createWasmUi(await Bun.file(FRAMEWORK_ROOT + "hosts/web/pocketjs.wasm").arrayBuffer());
const ops = core.ops as Record<string, any>;
const g = globalThis as Record<string, any>;
g.ui = ops;
g.__pak = await Bun.file(built.pak).arrayBuffer();
(0, eval)(await Bun.file(built.js).text());
g.frame(0);
core.tick();
ops.captureTexts(0, 0);
core.render();
const runs = String(ops.capturedTexts(0)).split("\n").map((l) => { const [r, t] = l.split("\t"); const [x, y, w, h] = (r ?? "").split(",").map(Number); return { x, y, w, h, t }; });
const where = (t: string) => { const r = runs.find((run) => run.t === t); if (!r) throw new Error("not drawn on the wasm core: " + t); return r; };
const alpha = where("Alpha");
const bravo = where("Bravo");
delete g.ui;
void FB_W;

// ---- 2. desktop host + window captures ------------------------------------------------
const shots = join(OUT, "shots");
await Bun.$`mkdir -p ${shots}`;
const guest = await wrapGuest(built.js, join(OUT, "shot-guest.js"));
const presses = ["down@60", "x@150", "down@240", "x@330", "x@420"];
const proc = Bun.spawn([host.bin, "--app", "pocketjs-react", "--title", "pocketjs-react shot", "--viewport", VIEWPORT.w + "x" + VIEWPORT.h, "--density", String(DENSITY), "--fixed", "--quit-after", "540", "--js", guest, "--pak", built.pak, ...presses.flatMap((p) => ["--press", p])], {
  cwd: host.root, stdout: "pipe", stderr: "pipe", env: { ...process.env, RUST_LOG: "info" },
});
let windowId = "";
for (let i = 0; i < 50 && !windowId; i++) {
  const list = await Bun.$`osascript -l JavaScript ${import.meta.dir}/window-ids.js ${proc.pid}`.nothrow().text();
  windowId = list.split("\n").find((l) => l.includes('"Width":' + VIEWPORT.w + ","))?.split(":")[0] ?? "";
  if (!windowId) await Bun.sleep(100);
}
if (!windowId) {
  proc.kill();
  throw new Error("desktop host window not found");
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
    files.push(join(shots, "s" + n + ".png"));
    captures.push(Bun.sleep(1000).then(async () => {
      await Bun.$`screencapture -x -o -l ${windowId} ${files[n]}`.quiet();
      await Bun.$`sips -s format bmp ${files[n]} --out ${files[n]}.bmp`.quiet();
    }));
  }
}
await proc.exited;
await Promise.all(captures);

// ---- 3. read pixels ------------------------------------------------------------------
function bmp(path: string) {
  const b = readFileSync(path);
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const off = dv.getUint32(10, true), w = dv.getInt32(18, true), h = dv.getInt32(22, true), bpp = dv.getUint16(28, true);
  const stride = Math.ceil((w * bpp) / 32) * 4;
  const top = Math.abs(h) - VIEWPORT.h * DENSITY; // window title bar above the canvas
  const rgb = (x: number, y: number) => {
    const px = x * DENSITY + 1, py = top + y * DENSITY + 1;
    const row = h > 0 ? Math.abs(h) - 1 - py : py;
    const i = off + row * stride + (px * bpp) / 8;
    return [b[i + 2], b[i + 1], b[i]];
  };
  return { rgb };
}
const hex = (c: number[]) => "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
const textStart = (img: ReturnType<typeof bmp>, run: { x: number; y: number; h: number }) => {
  const y = run.y + Math.floor(run.h / 2);
  for (let x = run.x - 8; x < run.x + 24; x++) { const c = img.rgb(x, y); if (c[0] > 200 && c[1] > 200 && c[2] > 200) return x; }
  return -1;
};
const rows = files.map((f, i) => {
  const img = bmp(f + ".bmp");
  const row = { shot: i, alphaX: textStart(img, alpha), alphaBg: hex(img.rgb(alpha.x - 6, alpha.y + 2)), bravoX: textStart(img, bravo), bravoBg: hex(img.rgb(bravo.x - 6, bravo.y + 2)) };
  console.log("shot" + i + " AlphaTextX=" + row.alphaX + " AlphaRowBg=" + row.alphaBg + " BravoTextX=" + row.bravoX + " BravoRowBg=" + row.bravoBg);
  return row;
});
// shots: 0 after first render, 1 after down (Alpha focused), 2 after circle (Alpha on),
// 3 after down (Bravo focused), 4 after circle (Bravo on), 5 after circle (Bravo off)
const ok = rows.length === 6 && rows[2].alphaX > rows[1].alphaX && rows[4].bravoX > rows[3].bravoX && rows[5].bravoX === rows[3].bravoX && rows[3].alphaBg !== rows[1].alphaBg;
console.log(ok ? "desktop-shot ok: drawn rows follow the state" : "desktop-shot FAILED: drawn rows do not follow the state");
process.exit(ok ? 0 : 1);