// JG-155 engine matrix: chromium desktop, chromium with iPhone 15 emulation (trusted page.tap), and
// real WebKit with the same iPhone 15 emulation. Run with `bun run test:e2e` (prepare, then this).
import { defineConfig, devices } from "@playwright/test";

// The iPhone descriptor names a default browser; each project picks its engine by browserName.
const { defaultBrowserType: _chromiumDefault, ...desktopChrome } =
  devices["Desktop Chrome"];
const { defaultBrowserType: _iphoneDefault, ...iphone15 } =
  devices["iPhone 15"];

export default defineConfig({
  testDir: ".",
  testMatch: /.*\.e2e\.ts$/,
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  globalSetup: "./global-setup.ts",
  reporter: [["list"]],
  projects: [
    {
      name: "chromium",
      use: {
        ...desktopChrome,
        browserName: "chromium",
        viewport: { width: 1280, height: 800 },
      },
    },
    { name: "chromium-iphone", use: { ...iphone15, browserName: "chromium" } },
    { name: "webkit", use: { ...iphone15, browserName: "webkit" } },
  ],
});
