// e2e static server (node, no Bun APIs): the browser host page, the app bundle and the host
// files, routed the way tools/web/serve.ts routes them. Serves only what dist/e2e/manifest.json names.
// The host directories come from the manifest (WEB_HOST_SEARCH in src/internal/pocket-build.ts).

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { join, normalize, sep } from "node:path";

const TYPES = {
  html: "text/html; charset=utf-8",
  js: "text/javascript",
  wasm: "application/wasm",
  css: "text/css",
  json: "application/json",
};

/** Start the server on 127.0.0.1 with an OS-chosen port. Returns { url, stop }. */
export async function start(manifest) {
  const f = manifest.files;
  const routes = {
    "/": f.readerHtml,
    "/fs-shim.js": f.fsShim,
    "/text-entry-host.js": f.textEntryHost,
    "/dist/app.js": f.appJs,
    "/dist/app.pak": f.appPak,
  };
  const server = createServer(async (req, res) => {
    const path = new URL(req.url, "http://x").pathname.replace(/\.\.+/g, "");
    let file = routes[path];
    if (!file && path !== "/ws" && path.startsWith("/")) {
      const rel = normalize(path.slice(1));
      // The core's host page, searched in the order prepare resolved (page assets, binding dir, core root).
      if (!rel.startsWith("..") && !rel.includes(sep + ".."))
        file = manifest.hostDirs
          .map((dir) => join(dir, rel))
          .find((candidate) => existsSync(candidate));
    }
    try {
      if (!file || path === "/ws") throw new Error("not found");
      const body = await readFile(file);
      res.writeHead(200, {
        "content-type":
          TYPES[file.split(".").pop()] ?? "application/octet-stream",
        "cache-control": "no-store",
      });
      res.end(body);
    } catch {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("not found");
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  return {
    url: "http://127.0.0.1:" + port + "/",
    stop: () =>
      new Promise((resolve) => {
        server.closeAllConnections();
        server.close(resolve);
      }),
  };
}
