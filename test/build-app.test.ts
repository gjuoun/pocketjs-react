// PocketReader.app's layout, Info.plist and signature. Needs the desktop host from a PocketJS
// checkout (POCKETJS_ROOT, as for measure:desktop); skipped without it.
import { expect, test } from "bun:test";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { BUNDLE_ID, buildApp } from "../tools/build-app.ts";

const plistValue = (plist: string, key: string) => Bun.spawnSync(["plutil", "-extract", key, "raw", plist]).stdout.toString().trim();

test.skipIf(!process.env.POCKETJS_ROOT)("build:app makes a signed bundle that runs the launcher", async () => {
  const { app } = await buildApp({ outdir: "/tmp/pocketjs-react-test/app" });
  const contents = join(app, "Contents");
  for (const file of ["MacOS/PocketReader", "MacOS/pocket-desktop-host", "Resources/reader.js", "Resources/reader.pak", "Resources/AppIcon.icns"]) {
    expect(existsSync(join(contents, file))).toBe(true);
  }
  expect(statSync(join(contents, "MacOS/PocketReader")).mode & 0o111).not.toBe(0);
  const plist = join(contents, "Info.plist");
  expect(plistValue(plist, "CFBundleExecutable")).toBe("PocketReader");
  expect(plistValue(plist, "CFBundleIdentifier")).toBe(BUNDLE_ID);
  expect(plistValue(plist, "CFBundleIconFile")).toBe("AppIcon");
  expect(plistValue(plist, "LSMinimumSystemVersion")).toBe("11.0");
  expect(plistValue(plist, "NSHighResolutionCapable")).toBe("true");
  const verify = Bun.spawnSync(["codesign", "--verify", "--strict", app]);
  expect(verify.exitCode).toBe(0);
}, 120000);
