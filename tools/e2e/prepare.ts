// JG-155 e2e prepare (bun): builds the text-entry fixture, finds field A's canvas point once in
// headless Chrome, and writes dist/e2e/manifest.json. The node side (test/e2e) reads only the manifest.
//   bun tools/e2e/prepare.ts
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { FIELD_FONT_SLOT } from "../../src/input/text-field.ts";
import {
  FRAMEWORK_ROOT,
  HeadlessChrome,
} from "../../src/internal/pocket-build.ts";
import { build } from "../build.ts";
import { serveReader } from "../web/serve.ts";

const ROOT = resolve(import.meta.dir, "../..");
const OUT = join(ROOT, "dist/e2e");
const PROFILE = "/tmp/pocketjs-react-test/e2e-prepare-chrome";
const PORT = Number(process.env.E2E_PREPARE_PORT ?? 9431);
// The centre of field A (logical 480x272): the first hit's box, not its corner (a corner sits on the edge).
const FIND_FIELD =
  "(() => { const hit = (x, y) => globalThis.__pocketTextHitAt(x, y); let x0 = -1, y0 = -1; outer: for (let y = 0; y < 272; y += 2) for (let x = 0; x < 480; x += 2) if (hit(x, y)) { x0 = x; y0 = y; break outer; } if (x0 < 0) return ''; let x1 = x0; while (x1 + 1 < 480 && hit(x1 + 1, y0)) x1++; let y1 = y0; while (y1 + 1 < 272 && hit(x0, y1 + 1)) y1++; return Math.floor((x0 + x1) / 2) + ',' + Math.floor((y0 + y1) / 2); })()";

export async function prepare(): Promise<Record<string, unknown>> {
  mkdirSync(OUT, { recursive: true });
  const app = await build(join(ROOT, "test/fixtures/text-entry/main.tsx"), {
    outdir: OUT,
    name: "text-entry",
  });
  // The C5 overlays page: its own bundle, served by its own manifest entry (see overlay.e2e.ts).
  const overlays = await build(
    join(ROOT, "test/fixtures/shadcn-vendor/overlays-main.tsx"),
    {
      outdir: OUT,
      name: "overlays",
    },
  );
  // The C9 sub-menu page: its own bundle and manifest entry (see submenu.e2e.ts).
  const submenu = await build(join(ROOT, "test/fixtures/shadcn-vendor/submenu-main.tsx"), {
    outdir: OUT,
    name: "submenu",
  });
  const server = serveReader(app);
  const chrome = await HeadlessChrome.start({
    port: PORT,
    profile: PROFILE,
    timeoutMs: 20000,
  });
  try {
    await chrome.navigate(server.url + "?manual=1");
    for (
      let i = 0;
      i < 100 && !(await chrome.evaluate("!!window.__ready"));
      i++
    )
      await Bun.sleep(100);
    await chrome.evaluate("window.__host.step(0)");
    const hit = String(await chrome.evaluate(FIND_FIELD))
      .split(",")
      .map(Number);
    if (hit.length !== 2 || hit.some((n) => Number.isNaN(n)))
      throw new Error("prepare: field A not found on the text-entry page");
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
      fieldFontSlot: FIELD_FONT_SLOT,
      fieldA: { x: hit[0], y: hit[1] },
      apps: {
        "text-entry": { js: app.js, pak: app.pak },
        overlays: { js: overlays.js, pak: overlays.pak },
        submenu: { js: submenu.js, pak: submenu.pak },
      },
    };
    writeFileSync(
      join(OUT, "manifest.json"),
      JSON.stringify(manifest, null, 2) + "\n",
    );
    return manifest;
  } finally {
    chrome.stop();
    server.stop();
  }
}

if (import.meta.main) {
  const m = await prepare();
  console.log(
    "prepare: manifest " +
      join(OUT, "manifest.json") +
      " fieldA=" +
      JSON.stringify((m as { fieldA: unknown }).fieldA),
  );
}
