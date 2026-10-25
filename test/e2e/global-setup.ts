// Guard: the matrix runs only on browsers already in the Playwright cache (no download).
import { existsSync } from "node:fs";
import { chromium, webkit } from "@playwright/test";

export default function globalSetup(): void {
  const missing = [
    ["chromium", chromium.executablePath()],
    ["webkit", webkit.executablePath()],
  ].filter(([, path]) => !existsSync(path));
  if (missing.length) {
    throw new Error(
      "playwright: browser missing from cache: " +
        missing.map(([name, path]) => name + " (" + path + ")").join(", ") +
        " - run playwright install (not in the matrix guard)",
    );
  }
}
