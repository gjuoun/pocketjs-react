// The browser host page for a built app: the npm package's hosts/web (app-instance.js, the wasm
// core and runtime glyphs) plus tools/web/reader.html (loop, keys, file picker, fs, mouse) and
// the app bundle at /dist/app.{js,pak}.
//   bun tools/web/serve.ts --js <bundle.js> --pak <bundle.pak> [--port 8140]
import { existsSync } from "node:fs";
import { FRAMEWORK_ROOT } from "../../src/internal/pocket-build.ts";

const HERE = import.meta.dir + "/";
const TYPES: Record<string, string> = {
  html: "text/html; charset=utf-8",
  js: "text/javascript",
  wasm: "application/wasm",
  css: "text/css",
};

export interface ReaderServer {
  url: string;
  stop(): void;
}

export function serveReader(
  app: { js: string; pak: string },
  port = 0,
): ReaderServer {
  const host = FRAMEWORK_ROOT + "hosts/web/";
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port,
    fetch(req) {
      const path = new URL(req.url).pathname.replace(/\.\.+/g, "");
      const file =
        path === "/"
          ? HERE + "reader.html"
          : path === "/fs-shim.js"
            ? HERE + "fs-shim.js"
            : path === "/dist/app.js"
              ? app.js
              : path === "/dist/app.pak"
                ? app.pak
                : host + path.slice(1);
      if (path === "/ws" || !existsSync(file))
        return new Response("not found", { status: 404 });
      return new Response(Bun.file(file), {
        headers: {
          "content-type":
            TYPES[file.split(".").pop() ?? ""] ?? "application/octet-stream",
          "cache-control": "no-store",
        },
      });
    },
  });
  return {
    url: "http://127.0.0.1:" + server.port + "/",
    stop: () => server.stop(true),
  };
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  let js = get("--js");
  let pak = get("--pak");
  if (!js || !pak) {
    const { buildReader } = await import("../build-reader.ts");
    const built = await buildReader();
    js = built.js;
    pak = built.pak;
  }
  const server = serveReader({ js, pak }, Number(get("--port") ?? 8140));
  console.log("reader: " + server.url);
}
