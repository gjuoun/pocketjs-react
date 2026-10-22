// Locates and checks the macOS desktop host from a sibling PocketJS checkout (POCKETJS_ROOT).
// The npm package does not ship hosts/desktop; its version must match the pinned package.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { FRAMEWORK_ROOT } from "../../src/internal/pocket-build.ts";

export interface DesktopHost { root: string; bin: string }

export function desktopHost(): DesktopHost {
  const root = process.env.POCKETJS_ROOT;
  if (!root) throw new Error("set POCKETJS_ROOT to a PocketJS checkout (the desktop host is not in the npm package)");
  const bin = join(root, "hosts/desktop/target/release/pocket-desktop-host");
  if (!existsSync(bin)) throw new Error("no desktop host at " + bin + " — build it there: bun run macos hero --build-only");
  const checkout = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;
  const pinned = JSON.parse(readFileSync(join(FRAMEWORK_ROOT, "package.json"), "utf8")).version;
  const sha = Bun.spawnSync(["git", "-C", root, "rev-parse", "--short", "HEAD"]).stdout.toString().trim();
  console.log("desktop host: checkout v" + checkout + " @ " + sha + ", pinned @pocketjs/framework v" + pinned);
  if (checkout !== pinned) throw new Error("desktop host checkout v" + checkout + " does not match the pinned framework v" + pinned);
  return { root, bin };
}

/** Desktop key names for --press NAME@TICK (X = CIRCLE, Z = CROSS on this host). */
export const DESKTOP_KEY: Record<string, string> = { up: "up", down: "down", left: "left", right: "right", circle: "x", cross: "z", start: "space", ltrigger: "q", rtrigger: "w" };
