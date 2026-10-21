// bun run measure:web — the example on the browser WASM host (the npm package's hosts/web,
// headless Chrome). Serves hosts/web plus the wrapped guest, plays the d-pad script through
// the host's virtual buttons, prints the measurement lines and a summary over RUNS runs.
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { FRAMEWORK_ROOT, HeadlessChrome } from "../../src/internal/pocket-build.ts";
import { OUT, RUNS, SCRIPT, buildExample, report, summarize, wrapGuest, type RunSummary } from "./common.ts";

const BTN: Record<string, number> = { up: 0x10, down: 0x40, circle: 0x2000, cross: 0x4000 };
const built = await buildExample();
const guest = await wrapGuest(built.js, join(OUT, "web-guest.js"));
const HOST = FRAMEWORK_ROOT + "hosts/web/";
const TYPES: Record<string, string> = { html: "text/html", js: "text/javascript", wasm: "application/wasm" };
const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch(req) {
    const path = new URL(req.url).pathname.replace(/\.\.+/g, "");
    if (path === "/ws") return new Response("no devtools", { status: 404 });
    if (path === "/demos") return Response.json([{ name: "app", hasPak: true, mounts: true }]);
    if (path === "/dist/app.js") return new Response(Bun.file(guest), { headers: { "content-type": "text/javascript" } });
    if (path === "/dist/app.pak") return new Response(Bun.file(built.pak));
    const file = path === "/" ? "index.html" : path.slice(1);
    if (!existsSync(HOST + file)) return new Response("not found", { status: 404 });
    return new Response(Bun.file(HOST + file), { headers: { "content-type": TYPES[file.split(".").pop() ?? ""] ?? "application/octet-stream" } });
  },
});
const runs: RunSummary[] = [];
try {
  for (let i = 0; i < RUNS; i++) {
    // A fresh browser and profile per run: every first render is cold (no code cache).
    const profile = join(OUT, "chrome-profile-" + i);
    rmSync(profile, { recursive: true, force: true });
    const chrome = await HeadlessChrome.start({ port: 9371 + i, profile, timeoutMs: 20000 });
    try {
    await chrome.navigate("http://127.0.0.1:" + server.port + "/?demo=app");
    for (let t = 0; t < 100; t++) {
      if (await chrome.evaluate("!!(globalThis.__measure && globalThis.__measure.lines.length)")) break;
      await Bun.sleep(100);
    }
    for (const name of SCRIPT) {
      await chrome.evaluate("import('/engine.js').then(m => m.pressVirtual(" + BTN[name] + ", true))");
      await Bun.sleep(120);
      await chrome.evaluate("import('/engine.js').then(m => m.pressVirtual(" + BTN[name] + ", false))");
      await Bun.sleep(120);
    }
    await Bun.sleep(500);
    const lines: string[] = await chrome.evaluate("globalThis.__measure.lines");
    console.log("== web run " + (i + 1));
    for (const line of lines) if (!line.includes(" press ") || line.includes("circle")) console.log(line);
    runs.push(summarize(lines));
    } finally {
      chrome.stop();
    }
  }
} finally {
  server.stop(true);
}
process.exit(report("web", runs, built));