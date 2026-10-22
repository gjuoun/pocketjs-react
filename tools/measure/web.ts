// bun run measure:web — the example on the browser WASM host (the npm package's hosts/web,
// headless Chrome). Serves hosts/web plus the wrapped guest, plays the d-pad script through
// the host's virtual buttons, prints the measurement lines and a summary over RUNS runs.
// A profile with webPage "app-instance" runs on tools/web/reader.html instead: app-instance.js
// with runtime glyphs, its own 60 Hz loop, buttons through window.__host.press.
//
// runWeb(profile) is the same runner for a profile defined outside this repo (an app repo that
// depends on pocketjs-react); the CLI below passes the built-in profile named by --app.
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { FRAMEWORK_ROOT, HeadlessChrome } from "../../src/internal/pocket-build.ts";
import { OUT, RUNS, profileFromArgs, report, summarize, wrapGuest, type Profile, type RunSummary } from "./common.ts";

const BTN: Record<string, number> = { start: 0x8, up: 0x10, right: 0x20, down: 0x40, left: 0x80, ltrigger: 0x100, rtrigger: 0x200, circle: 0x2000, cross: 0x4000 };
const TYPES: Record<string, string> = { html: "text/html", js: "text/javascript", wasm: "application/wasm" };

/** Run one profile on the browser host, RUNS times; returns the report's exit code. */
export async function runWeb(profile: Profile): Promise<number> {
  const built = await profile.build();
  const shots = profile.shots ?? {};
  const guest = await wrapGuest(built.js, join(OUT, "web-guest.js"));
  const HOST = FRAMEWORK_ROOT + "hosts/web/";
  const WEB = import.meta.dir + "/../web/";
  const appInstance = profile.webPage === "app-instance";
  const pressJs = (bit: number, down: boolean) => appInstance ? "window.__host.press(" + bit + ", " + down + ")" : "import('/engine.js').then(m => m.pressVirtual(" + bit + ", " + down + "))";
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch(req) {
      const path = new URL(req.url).pathname.replace(/\.\.+/g, "");
      if (path === "/ws") return new Response("no devtools", { status: 404 });
      if (path === "/demos") return Response.json([{ name: "app", hasPak: true, mounts: true }]);
      if (path === "/dist/app.js") return new Response(Bun.file(guest), { headers: { "content-type": "text/javascript" } });
      if (path === "/dist/app.pak") return new Response(Bun.file(built.pak));
      if (appInstance && (path === "/" || path === "/fs-shim.js")) return new Response(Bun.file(WEB + (path === "/" ? "reader.html" : "fs-shim.js")), { headers: { "content-type": path === "/" ? "text/html" : "text/javascript" } });
      const file = path === "/" ? "index.html" : path.slice(1);
      if (!existsSync(HOST + file)) return new Response("not found", { status: 404 });
      return new Response(Bun.file(HOST + file), { headers: { "content-type": TYPES[file.split(".").pop() ?? ""] ?? "application/octet-stream" } });
    },
  });
  const runs: RunSummary[] = [];
  try {
    for (let i = 0; i < RUNS; i++) {
      // A fresh browser and profile per run: every first render is cold (no code cache).
      const profileDir = join(OUT, "chrome-profile-" + i);
      rmSync(profileDir, { recursive: true, force: true });
      const chrome = await HeadlessChrome.start({ port: 9371 + i, profile: profileDir, timeoutMs: 20000 });
      try {
        await chrome.navigate("http://127.0.0.1:" + server.port + "/?demo=app");
        for (let t = 0; t < 100; t++) {
          if (await chrome.evaluate("!!(globalThis.__measure && globalThis.__measure.lines.length)")) break;
          await Bun.sleep(100);
        }
        const started = performance.now();
        const shoot = async (label: string | undefined) => {
          if (!label || i !== 0) return;
          await Bun.sleep(300);
          const ms = performance.now() - started;
          const rect = await chrome.evaluate("(() => { const r = document.querySelector('canvas').getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; })()");
          const file = "web-" + profile.name + "-" + label + ".png";
          await Bun.write(join(OUT, "shots", file), await chrome.screenshot(rect));
          console.log("shot " + label + " at_ms=" + ms.toFixed(0) + " file=" + file);
        };
        await shoot(shots[-1]);
        for (const [k, name] of profile.script.entries()) {
          await chrome.evaluate(pressJs(BTN[name], true));
          await Bun.sleep(120);
          await chrome.evaluate(pressJs(BTN[name], false));
          await Bun.sleep(120);
          await shoot(shots[k]);
        }
        await Bun.sleep(500);
        const lines: string[] = await chrome.evaluate("globalThis.__measure.lines");
        console.log("== web run " + (i + 1));
        for (const line of lines) console.log(line);
        runs.push(summarize(lines, profile));
      } finally {
        chrome.stop();
      }
    }
  } finally {
    server.stop(true);
  }
  return report("web", runs, built, profile);
}

if (import.meta.main) process.exit(await runWeb(profileFromArgs()));
