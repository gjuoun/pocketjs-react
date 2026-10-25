// JG-155 e2e helpers: the manifest, the static server, and the host-page opener shared by all tiers.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Page, TestInfo } from "@playwright/test";
import { start } from "./server.mjs";

export const ROOT = fileURLToPath(new URL("../..", import.meta.url));
export type AppName = "text-entry" | "overlays";
export const manifest = JSON.parse(
  readFileSync(join(ROOT, "dist/e2e/manifest.json"), "utf8"),
) as {
  fieldA: { x: number; y: number };
  screen: { width: number; height: number };
  fieldFontSlot: number;
  apps: Record<AppName, { js: string; pak: string }>;
  files: Record<string, string>;
  hostDir: string;
};
export type Server = { url: string; stop(): Promise<void> };
/** The host page serving one built app (its bundle and pak come from the manifest). */
export const serveApp = (app: AppName): Promise<Server> =>
  start({
    ...manifest,
    files: {
      ...manifest.files,
      appJs: manifest.apps[app].js,
      appPak: manifest.apps[app].pak,
    },
  });
export const serve = (): Promise<Server> => serveApp("text-entry");

/** Open a host-page URL and wait for the guest's __ready flag. */
export async function openHost(
  page: Page,
  _testInfo: TestInfo,
  url: string,
): Promise<void> {
  // The page declares its own viewport (width=device-width) and scales its canvas on coarse pointers.
  await page.goto(url);
  await page.waitForFunction(
    () => (window as unknown as { __ready?: boolean }).__ready === true,
    undefined,
    { timeout: 15000 },
  );
}
