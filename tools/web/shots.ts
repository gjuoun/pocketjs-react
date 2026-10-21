// bun tools/web/shots.ts — screenshots of the reader on the browser host page (headless Chrome):
// the library, the contents (opened with CIRCLE), a reading page (opened with a MOUSE CLICK on
// "4. Proof-of-Work") and the next page (RIGHT). After each step it prints what the host's wasm
// core drew (ui.captureTexts), so the screenshots come with their text.
import { join, resolve } from "node:path";
import { rmSync } from "node:fs";
import { HeadlessChrome } from "../../src/internal/pocket-build.ts";
import { buildReader } from "../build-reader.ts";
import { serveReader } from "./serve.ts";

const OUT = resolve(import.meta.dir, "../../dist/shots");
const built = await buildReader({ outdir: join(OUT, "build") });
const server = serveReader(built);
const profile = join(OUT, "chrome-profile");
rmSync(profile, { recursive: true, force: true });
const chrome = await HeadlessChrome.start({ port: 9431, profile, timeoutMs: 20000 });
let failed = false;
try {
  await chrome.viewport(1100, 760);
  await chrome.navigate(server.url);
  for (let i = 0; i < 100 && !(await chrome.evaluate("!!globalThis.frame && !!window.__ready")); i++) await Bun.sleep(100);
  await Bun.sleep(400);
  const rect = await chrome.evaluate("(() => { const r = document.querySelector('#screen').getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; })()");
  const drawn = async (): Promise<{ x: number; y: number; t: string }[]> => {
    await chrome.evaluate("globalThis.ui.captureTexts(0, 0)");
    await Bun.sleep(150);
    const raw: string = await chrome.evaluate("globalThis.ui.capturedTexts(0)");
    return raw.split("\n").filter(Boolean).map((l) => { const [r, t] = l.split("\t"); const [x, y] = r.split(",").map(Number); return { x, y, t }; });
  };
  const shot = async (name: string) => {
    await Bun.sleep(250);
    await Bun.write(join(OUT, "browser-reader-" + name + ".png"), await chrome.screenshot(rect));
    const runs = await drawn();
    console.log(name + ": " + runs.slice(0, 6).map((r) => JSON.stringify(r.t)).join(" | "));
    return runs;
  };
  const press = async (bit: number) => {
    await chrome.evaluate("import('/engine.js').then(m => m.pressVirtual(" + bit + ", true))");
    await Bun.sleep(120);
    await chrome.evaluate("import('/engine.js').then(m => m.pressVirtual(" + bit + ", false))");
    await Bun.sleep(150);
  };
  const click = async (x: number, y: number) => {
    const cx = rect.x + (x / 480) * rect.width, cy = rect.y + (y / 272) * rect.height;
    for (const type of ["mousePressed", "mouseReleased"]) await chrome.send("Input.dispatchMouseEvent", { type, x: cx, y: cy, button: "left", clickCount: 1 });
    await Bun.sleep(200);
  };
  const library = await shot("library");
  await press(0x2000); // CIRCLE on the focused book
  const contents = await shot("contents");
  const entry = contents.find((r) => r.t === "4. Proof-of-Work");
  if (!entry) throw new Error("contents did not draw 4. Proof-of-Work");
  await click(entry.x + 30, entry.y + 6); // the mouse layer: click the entry
  const page1 = await shot("reading-page-1");
  await press(0x20); // RIGHT
  const page2 = await shot("reading-page-2");
  const checks: [string, boolean][] = [
    ["library lists the bundled whitepaper", library.some((r) => r.t === "Bitcoin: A Peer-to-Peer Electronic Cash System")],
    ["CIRCLE opened the contents", contents.some((r) => r.t === "Abstract")],
    ["a mouse click opened chapter 4", page1[0]?.t === "4. Proof-of-Work" && page1.some((r) => r.t === "page 1/4")],
    ["RIGHT turned to page 2", page2.some((r) => r.t === "page 2/4")],
  ];
  for (const [label, ok] of checks) console.log((ok ? "ok   " : "FAIL ") + label);
  failed = !checks.every(([, ok]) => ok);
  console.log("screenshots: " + ["library", "contents", "reading-page-1", "reading-page-2"].map((n) => join(OUT, "browser-reader-" + n + ".png")).join(" "));
} finally {
  chrome.stop();
  server.stop();
}
process.exit(failed ? 1 : 0);
