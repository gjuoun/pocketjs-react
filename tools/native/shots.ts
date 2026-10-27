// Screenshots of every native gallery page in headless Chrome, on the browser host page.
// Pages are turned with RTRIGGER (the d-pad stays free for focus). Each shot checks the page title is drawn.
//   POCKETJS_CORE_ROOT=<overlay> bun tools/native/shots.ts   (needs dist/native-gallery.{js,pak} from tools/build.ts)
import { mkdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { HeadlessChrome } from "../../src/internal/pocket-build.ts";
import { serveReader } from "../web/serve.ts";
import { PAGE_NAMES } from "../../test/native/gallery/names.ts";

const ROOT = resolve(import.meta.dir, "../..");
const OUT = join(ROOT, "dist/native/shots");
const RTRIGGER = 0x0200;
const TITLES: string[] = [...PAGE_NAMES];
const TOTAL = String(TITLES.length).padStart(2, "0");

mkdirSync(OUT, { recursive: true });
const server = serveReader({ js: join(ROOT, "dist/native-gallery.js"), pak: join(ROOT, "dist/native-gallery.pak") }, 0);
const profile = join(OUT, "chrome-profile");
rmSync(profile, { recursive: true, force: true });
const chrome = await HeadlessChrome.start({ port: 9442, profile, timeoutMs: 20000 });
let failed = false;
try {
  await chrome.viewport(1100, 760);
  await chrome.navigate(server.url);
  for (let i = 0; i < 100 && !(await chrome.evaluate("!!window.__ready")); i++) await Bun.sleep(100);
  await Bun.sleep(400);
  const rect = await chrome.evaluate("(() => { const r = document.querySelector('#screen').getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; })()");
  const drawn = async (): Promise<string[]> => {
    await chrome.evaluate("globalThis.ui.captureTexts(0, 0)");
    await Bun.sleep(150);
    const raw: string = await chrome.evaluate("globalThis.ui.capturedTexts(0)");
    return raw.split("\n").filter(Boolean).map((l) => l.split("\t")[1] ?? "");
  };
  for (let i = 0; i < TITLES.length; i++) {
    if (i > 0) {
      await chrome.evaluate("window.__host.press(" + RTRIGGER + ", true)");
      await Bun.sleep(60);
      await chrome.evaluate("window.__host.press(" + RTRIGGER + ", false)");
      await Bun.sleep(300);
    }
    await Bun.sleep(250);
    const num = String(i + 1).padStart(2, "0");
    const title = num + "/" + TOTAL + " " + TITLES[i];
    const texts = await drawn();
    const ok = texts.includes(title);
    if (!ok) failed = true;
    const file = join(OUT, "page-" + num + "-" + TITLES[i].toLowerCase().replace(/\s+/g, "-") + ".png");
    await Bun.write(file, await chrome.screenshot(rect));
    console.log("page " + num + ": title " + (ok ? "drawn" : "MISSING") + " -> " + file);
  }
} finally {
  chrome.stop?.();
  server.stop();
}
process.exit(failed ? 1 : 0);
