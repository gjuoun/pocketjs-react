// bun tools/build-app.ts [--outdir=dist] — PocketReader.app: the reader on the PocketJS desktop
// host as a double-clickable macOS app.
//
//   Contents/Info.plist
//   Contents/MacOS/PocketReader           the launcher (tools/app/launcher.sh), CFBundleExecutable
//   Contents/MacOS/pocket-desktop-host    the host from POCKETJS_ROOT, copied unchanged
//   Contents/Resources/reader.js|.pak     the reader build (tools/build-reader.ts, minified)
//   Contents/Resources/AppIcon.icns       drawn by tools/app/icon.ts
//
// Signed ad-hoc (codesign -s -): it runs on the Mac that built it. There is no Developer ID
// signature and no notarization, so Gatekeeper on another Mac refuses it until it is opened
// with right-click > Open.
import { createHash } from "node:crypto";
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { makeIcns } from "./app/icon.ts";
import { buildReader } from "./build-reader.ts";
import { desktopHost } from "./measure/desktop-host.ts";

const ROOT = resolve(import.meta.dir, "..");
export const BUNDLE_ID = "io.github.pocketjs-react.pocketreader";

function run(cmd: string[]): string {
  const proc = Bun.spawnSync(cmd);
  if (proc.exitCode !== 0)
    throw new Error(
      cmd.join(" ") +
        " failed: " +
        proc.stderr.toString() +
        proc.stdout.toString(),
    );
  return proc.stdout.toString() + proc.stderr.toString();
}

const sha256 = (file: string) =>
  createHash("sha256").update(readFileSync(file)).digest("hex");

export async function buildApp(
  opts: { outdir?: string; cjk?: boolean } = {},
): Promise<{ app: string }> {
  const host = desktopHost();
  const outdir = resolve(opts.outdir ?? join(ROOT, "dist"));
  const stage = join(outdir, "app-stage");
  const built = await buildReader({
    outdir: stage,
    minify: true,
    cjk: opts.cjk,
  });

  const app = join(outdir, "PocketReader.app");
  const macos = join(app, "Contents/MacOS");
  const resources = join(app, "Contents/Resources");
  rmSync(app, { recursive: true, force: true });
  mkdirSync(macos, { recursive: true });
  mkdirSync(resources, { recursive: true });

  copyFileSync(
    join(ROOT, "tools/app/launcher.sh"),
    join(macos, "PocketReader"),
  );
  chmodSync(join(macos, "PocketReader"), 0o755);
  const hostCopy = join(macos, "pocket-desktop-host");
  copyFileSync(host.bin, hostCopy);
  chmodSync(hostCopy, 0o755);
  const hash = sha256(hostCopy);
  if (hash !== sha256(host.bin))
    throw new Error("host copy differs from " + host.bin);
  console.log(
    "  host: identical to upstream build (sha256 " + hash.slice(0, 16) + ")",
  );
  copyFileSync(built.js, join(resources, "reader.js"));
  copyFileSync(built.pak, join(resources, "reader.pak"));
  await makeIcns(join(resources, "AppIcon.icns"), stage);

  const plist = join(app, "Contents/Info.plist");
  run(["plutil", "-create", "xml1", plist]);
  const strings: Record<string, string> = {
    CFBundleIdentifier: BUNDLE_ID,
    CFBundleName: "PocketReader",
    CFBundleDisplayName: "PocketReader",
    CFBundleExecutable: "PocketReader",
    CFBundleIconFile: "AppIcon",
    CFBundlePackageType: "APPL",
    CFBundleShortVersionString: "0.1.0",
    CFBundleVersion: "1",
    LSMinimumSystemVersion: "11.0",
  };
  for (const [key, value] of Object.entries(strings))
    run(["plutil", "-insert", key, "-string", value, plist]);
  run(["plutil", "-insert", "NSHighResolutionCapable", "-bool", "YES", plist]);

  // Inside out: the nested Mach-O first, then the bundle (whose main executable is the script).
  run(["codesign", "--force", "-s", "-", hostCopy]);
  run(["codesign", "--force", "-s", "-", app]);
  const kb = run(["du", "-sk", app]).split(/\s+/)[0];
  console.log("  app: " + app + " (" + kb + " KB, signed ad-hoc)");
  return { app };
}

if (import.meta.main) {
  try {
    const args = process.argv.slice(2);
    await buildApp({
      outdir: args.find((a) => a.startsWith("--outdir="))?.slice(9),
      cjk: args.includes("--cjk"),
    });
  } catch (error) {
    console.error(String(error instanceof Error ? error.message : error));
    process.exit(1);
  }
}
