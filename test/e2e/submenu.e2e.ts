// C9 sub-menus on the matrix: the vendored dropdown with a sub-menu runs in the browser host. RIGHT opens
// the sub-menu, CROSS closes one level, CIRCLE on an item closes the whole tree; a held row shows active:.
import { expect, type Page, test } from "@playwright/test";
import { BTN } from "../../tools/web/text-entry-host.js";
import { openHost, type Server, serveApp } from "./helpers.ts";

const BLUE_600 = [0x25, 0x63, 0xeb]; // focus:bg-blue-600
const BLUE_500 = [0x3b, 0x82, 0xf6]; // active:bg-blue-500
// The measured open sub-menu draws ~44k non-background and ~22k panel pixels; a blank canvas draws 0.
const MIN_NON_BG = 10000;
const MIN_PANEL = 5000;

let server: Server;
test.beforeAll(async () => {
  server = await serveApp("submenu");
});
test.afterAll(async () => {
  await server?.stop();
});

const frame = (page: Page, buttons = 0) => page.evaluate("window.__host.step(" + buttons + ")");
const frames = async (page: Page, n: number) => {
  for (let i = 0; i < n; i++) await frame(page);
};
const press = (page: Page, bit: number) =>
  page.evaluate(
    "(() => { for (let i = 0; i < 3; i++) window.__host.step(" +
      bit +
      "); for (let i = 0; i < 3; i++) window.__host.step(0); })()",
  );
/** The framebuffer pixel at a logical point, after a draw: [r, g, b]. */
const pixelAt = (page: Page, x: number, y: number) =>
  page.evaluate<number[]>(
    "(() => { window.__host.draw(); const fb = window.__host.pixels(); const i = (" +
      y +
      " * 480 + " +
      x +
      ") * 4; return [fb[i], fb[i + 1], fb[i + 2]]; })()",
  );
/** The drawn text runs (x, y, w, h, text) of window.__host.texts(). */
async function runs(page: Page): Promise<{ x: number; y: number; text: string }[]> {
  const raw = await page.evaluate<string>("window.__host.texts()");
  return raw
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const tab = line.indexOf("\t");
      const [x, y] = line.slice(0, tab).split(",").map(Number);
      return { x, y, text: line.slice(tab + 1) };
    });
}
const shows = async (page: Page, label: string) => (await runs(page)).some((r) => r.text === label);
/** The row colour at a label's left padding. */
async function rowPaint(page: Page, label: string): Promise<number[]> {
  const run = (await runs(page)).find((r) => r.text === label);
  expect(run).toBeDefined();
  return pixelAt(page, run!.x - 3, run!.y + 2);
}


/** Repaint the canvas from the core. In manual mode step() does not draw; draw() does (reader.html). */
const settle = async (page: Page, n = 6) => {
  await frames(page, n);
  await page.evaluate("window.__host.draw()");
};
/** Census of the canvas as displayed (read back from its 2D context): non-background and panel pixels. */
const canvasCensus = (page: Page) =>
  page.evaluate<{ total: number; nonBg: number; panel: number }>(
    "(() => { const c = document.getElementById('screen'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; const bg = [d[0], d[1], d[2]]; let nonBg = 0, panel = 0; for (let i = 0; i < d.length; i += 4) { if (d[i] !== bg[0] || d[i + 1] !== bg[1] || d[i + 2] !== bg[2]) nonBg++; if (d[i] === 0x1e && d[i + 1] === 0x29 && d[i + 2] === 0x3b) panel++; } return { total: d.length / 4, nonBg, panel }; })()",
  );
/** Open the page, then move the d-pad to Menu and open it with CIRCLE. */
async function openMenu(page: Page, testInfo: Parameters<typeof openHost>[1]): Promise<void> {
  await openHost(page, testInfo, server.url + "?manual=1");
  await frame(page);
  await press(page, BTN.DOWN); // no initial focus: the first DOWN takes Menu
  await press(page, BTN.CIRCLE);
  await frames(page, 4);
  expect(await shows(page, "Edit")).toBe(true);
}

test("RIGHT opens the sub-menu, CROSS closes one level, CROSS again closes the menu", async ({ page }, testInfo) => {
  await openMenu(page, testInfo);
  await press(page, BTN.DOWN); // More
  await press(page, BTN.RIGHT);
  await frames(page, 4);
  expect(await shows(page, "Copy")).toBe(true);
  expect(await shows(page, "Paste")).toBe(true);
  await settle(page);
  // Abort before saving: a blank canvas must never reach the screenshot file.
  const census = await canvasCensus(page);
  expect(census.nonBg, "canvas blank: no non-background pixels").toBeGreaterThanOrEqual(MIN_NON_BG);
  expect(census.panel, "canvas shows no panel-coloured pixels").toBeGreaterThanOrEqual(MIN_PANEL);
  console.log("SUBMENU-OPEN census", JSON.stringify(census));
  await page.screenshot({ path: "/tmp/pocketjs-react-test/c9/submenu-open.png" });
  await press(page, BTN.CROSS);
  await frames(page, 4);
  expect(await shows(page, "Copy")).toBe(false);
  expect(await shows(page, "Edit")).toBe(true);
  await press(page, BTN.CROSS);
  await frames(page, 4);
  expect(await shows(page, "Edit")).toBe(false);
});

test("CIRCLE on a sub-item selects it once and closes the whole tree", async ({ page }, testInfo) => {
  await openMenu(page, testInfo);
  await press(page, BTN.DOWN); // More
  await press(page, BTN.RIGHT);
  await press(page, BTN.CIRCLE); // Copy
  await frames(page, 4);
  expect(await shows(page, "Copies 1")).toBe(true);
  expect(await shows(page, "Edit")).toBe(false);
  expect(await shows(page, "Paste")).toBe(false);
});

test("active: a held row that stays open shows blue-500 and returns to blue-600 on release", async ({ page }, testInfo) => {
  await openMenu(page, testInfo);
  await press(page, BTN.DOWN); // More
  await press(page, BTN.RIGHT);
  await press(page, BTN.DOWN); // Copy is focus; move to Paste
  await press(page, BTN.DOWN); // Keep
  expect(await shows(page, "Keep")).toBe(true);
  await frame(page, BTN.CIRCLE);
  await frame(page, BTN.CIRCLE);
  expect(await rowPaint(page, "Keep")).toEqual(BLUE_500);
  await page.screenshot({ path: "/tmp/pocketjs-react-test/c9/submenu-active.png" });
  await frame(page, 0);
  await frame(page, 0);
  expect(await rowPaint(page, "Keep")).toEqual(BLUE_600);
  expect(await shows(page, "Keeps 1")).toBe(true);
});
