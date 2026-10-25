// JG-155 step 6: the two C5 overlay lines (in-process only before this card) on the matrix. The
// scrim dims the page to slate-950 at 60% and the panel stays opaque; a tap on the scrim is inert.
import { expect, type Page, type TestInfo, test } from "@playwright/test";
import { BTN } from "../../tools/web/text-entry-host.js";
import { openHost, type Server, serveApp } from "./helpers.ts";

const SCRIM = [0x0f, 0x17, 0x2a]; // slate-950 (the scrim's colour)
const PANEL = [0x1e, 0x29, 0x3b]; // slate-800 (the panel's surface)

let server: Server;
test.beforeAll(async () => {
  server = await serveApp("overlays");
});
test.afterAll(async () => {
  await server?.stop();
});

const frame = (page: Page, buttons = 0) =>
  page.evaluate("window.__host.step(" + buttons + ")");
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
/** The drawn text runs: x,y,w,h and text, one per line of window.__host.texts(). */
async function runs(
  page: Page,
): Promise<{ x: number; y: number; w: number; h: number; text: string }[]> {
  const raw = await page.evaluate<string>("window.__host.texts()");
  return raw
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const tab = line.indexOf("\t");
      const [x, y, w, h] = line.slice(0, tab).split(",").map(Number);
      return { x, y, w, h, text: line.slice(tab + 1) };
    });
}
const titleRun = async (page: Page) =>
  (await runs(page)).find((r) => r.text === "Dialog title");
/** Client pixels of a logical point, then a real tap: touch on the touch tiers, a click on desktop. */
async function tapAt(
  page: Page,
  testInfo: TestInfo,
  x: number,
  y: number,
): Promise<void> {
  const [cx, cy] = await page.evaluate<[number, number]>(
    "(() => { const c = document.getElementById('screen'); const r = c.getBoundingClientRect(); return [r.left + " +
      x +
      " * r.width / c.width, r.top + " +
      y +
      " * r.height / c.height]; })()",
  );
  if (testInfo.project.use.hasTouch) await page.touchscreen.tap(cx, cy);
  else await page.mouse.click(cx, cy);
}

/** Focus the trigger (Under -> Open) and open the dialog with CIRCLE. */
async function openDialog(page: Page, testInfo: TestInfo): Promise<void> {
  await openHost(page, testInfo, server.url + "?manual=1");
  await frame(page);
  await press(page, BTN.DOWN); // no initial focus: the first DOWN takes Under
  await press(page, BTN.DOWN); // the second takes Open (the trigger)
  await press(page, BTN.CIRCLE);
  await frames(page, 4);
  expect(await titleRun(page)).toBeDefined();
}

test("the scrim dims the app behind it (slate-950 at 60%); the panel stays opaque", async ({
  page,
}, testInfo) => {
  await openHost(page, testInfo, server.url + "?manual=1");
  await frame(page);
  const base = await pixelAt(page, 2, 2); // the app's page, outside every panel
  await press(page, BTN.DOWN); // no initial focus: Under, then Open
  await press(page, BTN.DOWN);
  await press(page, BTN.CIRCLE);
  await frames(page, 4);
  const dimmed = await pixelAt(page, 2, 2);
  // darkened, not the opaque slate-950 the scrim used to paint, and within 3 levels of the 60% blend
  const want = base.map((v, i) => 0.4 * v + 0.6 * SCRIM[i]);
  expect(dimmed).not.toEqual(SCRIM);
  dimmed.forEach((v, i) => {
    expect(v).toBeLessThan(base[i]);
    expect(Math.abs(v - want[i])).toBeLessThanOrEqual(3);
  });
  // the panel is outside the scrim's blend: its surface is the primitive's slate-800
  const title = await titleRun(page);
  expect(title).toBeDefined();
  expect(await pixelAt(page, title!.x - 4, title!.y + 2)).toEqual(PANEL);
});

test("a tap on the scrim does not close the dialog; a tap on the panel keeps it open", async ({
  page,
}, testInfo) => {
  await openDialog(page, testInfo);
  const title = (await titleRun(page))!;
  await tapAt(page, testInfo, title.x + 2, title.y + 2); // the panel
  await frames(page, 4);
  expect(await titleRun(page)).toBeDefined();
  await tapAt(page, testInfo, 2, 2); // the scrim: inert to taps
  await frames(page, 4);
  expect(await titleRun(page)).toBeDefined();
  await press(page, BTN.CROSS);
  await frames(page, 2);
  expect(await titleRun(page)).toBeUndefined();
});
