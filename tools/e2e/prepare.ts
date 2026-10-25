// JG-155 e2e prepare (bun): builds the text-entry fixture, finds field A's canvas point once in
// headless Chrome, and writes dist/e2e/manifest.json. The node side (test/e2e) reads only the manifest.
//   bun tools/e2e/prepare.ts
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { FRAMEWORK_ROOT, HeadlessChrome } from "../../src/internal/pocket-build.ts";
import { build } from "../build.ts";
import { serveReader } from "../web/serve.ts";

const ROOT = resolve(import.meta.dir, "../..");
const OUT = join(ROOT, "dist/e2e");
const PROFILE = "/tmp/pocketjs-react-test/e2e-prepare-chrome";
const PORT = Number(process.env.E2E_PREPARE_PORT ?? 9431);
// The first canvas point (logical 480x272) the focusable field under it answers for: field A.
const FIND_FIELD = "(() => { for (let y = 0; y < 272; y += 2) for (let x = 0; x < 480; x += 2) if (globalThis.__pocketTextHitAt(x, y)) return x + ',' + y; return ''; })()";

export async function prepare(): Promise<Record<string, unknown>> {
  mkdirSync(OUT, { recursive: true });
  const app = await build(join(ROOT, "test/fixtures/text-entry/main.tsx"), { outdir: OUT, name: "text-entry" });
  const server = serveReader(app);
  const chrome = await HeadlessChrome.start({ port: PORT, profile: PROFILE, timeoutMs: 20000 });
  try {
    await chrome.navigate(server.url + "?manual=1");
    for (let i = 0; i < 100 && !(await chrome.evaluate("!!window.__ready")); i++) await Bun.sleep(100);
    await chrome.evaluate("window.__host.step(0)");
    const hit = String(await chrome.evaluate(FIND_FIELD)).split(",").map(Number);
    if (hit.length !== 2 || hit.some((n) => Number.isNaN(n))) throw new Error("prepare: field A not found on the text-entry page");
    const manifest = {
      files: {
        appJs: app.js,
        appPak: app.pak,
        readerHtml: join(ROOT, "tools/web/reader.html"),
        fsShim: join(ROOT, "tools/web/fs-shim.js"),
        textEntryHost: join(ROOT, "tools/web/text-entry-host.js"),
        wasm: join(FRAMEWORK_ROOT, "hosts/web/pocketjs.wasm"),
      },
      hostDir: join(FRAMEWORK_ROOT, "hosts/web"),
      screen: { width: 480, height: 272 },
      fieldA: { x: hit[0], y: hit[1] },
    };
    writeFileSync(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
    return manifest;
  } finally {
    chrome.stop();
    server.stop();
  }
}

if (import.meta.main) {
  const m = await prepare();
  console.log("prepare: manifest " + join(OUT, "manifest.json") + " fieldA=" + JSON.stringify((m as { fieldA: unknown }).fieldA));
}
