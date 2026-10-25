// Web hover on the browser matrix. A mouse over a Menu row paints it with the focus blue, moving off
// restores it, and focus never moves. On the touch tiers a tap opens the menu and lights no hover row.
import { expect, type Page, type TestInfo, test } from "@playwright/test";
import { BTN } from "../../tools/web/text-entry-host.js";
import { openHost, type Server, serveApp } from "./helpers.ts";

const BLUE_600 = [0x25, 0x63, 0xeb]; // focus:bg-blue-600, the same blue as the hover overlay
const PANEL = [0x1e, 0x29, 0x3b]; // slate-800: the menu panel, a row at rest

let server: Server;
test.beforeAll(async () => {
  server = await serveApp("overlays");
});
test.afterAll(async () => {
  await server?.stop();
});

const frame = (page: Page) => page.evaluate("window.__host.step(0)");
const frames = async (page: Page, n: number) => {
  for (let i = 0; i < n; i++) await frame(page);
};
const press = (page: Page, bit: number) =>
  page.evaluate(
    "(() => { for (let i = 0; i < 3; i++) window.__host.step(" + bit + "); for (let i = 0; i < 3; i++) window.__host.step(0); })()",
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
/** The drawn text runs (x, y, w, h, text), one per line of window.__host.texts(). */
async function runs(page: Page): Promise<{ x: number; y: number; w: number; h: number; text: string }[]> {
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
/** The row colour at a label's left padding (the same probe as the submenu tier). */
async function rowPaint(page: Page, label: string): Promise<number[]> {
  const run = (await runs(page)).find((r) => r.text === label);
  expect(run, label + " is drawn").toBeDefined();
  return pixelAt(page, run!.x - 3, run!.y + 2);
}
/** A logical point inside a drawn label. */
async function labelPoint(page: Page, label: string): Promise<{ x: number; y: number }> {
  const run = (await runs(page)).find((r) => r.text === label);
  expect(run, label + " is drawn").toBeDefined();
  return { x: run!.x + 4, y: run!.y + 4 };
}
/** The client (CSS) point of a logical canvas point. */
const clientOf = (page: Page, x: number, y: number) =>
  page.evaluate<[number, number]>(
    "(() => { const c = document.getElementById('screen'); const r = c.getBoundingClientRect(); return [r.left + " +
      x +
      " * r.width / c.width, r.top + " +
      y +
      " * r.height / c.height]; })()",
  );

/** Open the overlays page, then open its Menu by a real click (desktop) or tap (touch tiers). */
async function openMenu(page: Page, testInfo: TestInfo): Promise<void> {
  await openHost(page, testInfo, server.url + "?manual=1");
  await frame(page);
  const trigger = await labelPoint(page, "Menu");
  const [cx, cy] = await clientOf(page, trigger.x, trigger.y);
  if (testInfo.project.use.hasTouch) await page.touchscreen.tap(cx, cy);
  else await page.mouse.click(cx, cy);
  await frames(page, 4);
  expect((await runs(page)).some((r) => r.text === "Delete")).toBe(true);
}

test("desktop: a mouse over a Menu row paints it; focus stays put; leaving restores the row", async ({ page }, testInfo) => {
  test.skip(testInfo.project.use.hasTouch === true, "the mouse hover is the desktop chromium tier");
  await openMenu(page, testInfo);
  // The first item takes focus on open (Edit), so it is blue; Delete is at rest.
  expect(await rowPaint(page, "Delete")).toEqual(PANEL);
  expect(await rowPaint(page, "Edit")).toEqual(BLUE_600);
  const row = await labelPoint(page, "Delete");
  const [dx, dy] = await clientOf(page, row.x, row.y);
  await page.mouse.move(dx, dy);
  await frames(page, 4);
  // One highlight: the hover claims it, so the focused row (Edit) is suppressed to the panel colour.
  expect(await rowPaint(page, "Edit")).toEqual(PANEL);
  await page.mouse.move(0, 0); // off the canvas: pointerleave
  await frames(page, 4);
  expect(await rowPaint(page, "Delete")).toEqual(PANEL);
  expect(await rowPaint(page, "Edit")).toEqual(BLUE_600); // hover-out: the focused row is blue again
});

test("touch tiers: a tap opens the menu and lights no hover row", async ({ page }, testInfo) => {
  test.skip(testInfo.project.use.hasTouch !== true, "the touch tiers only");
  await openMenu(page, testInfo);
  expect(await rowPaint(page, "Delete")).toEqual(PANEL);
  expect(await rowPaint(page, "Edit")).toEqual(BLUE_600);
});

test("desktop: a d-pad move clears the hover; the next mouse move lights the row again", async ({ page }, testInfo) => {
  test.skip(testInfo.project.use.hasTouch === true, "the mouse hover is the desktop chromium tier");
  await openMenu(page, testInfo);
  const del = await labelPoint(page, "Delete");
  const [dx, dy] = await clientOf(page, del.x, del.y);
  await page.mouse.move(dx, dy);
  await frames(page, 4);
  expect(await rowPaint(page, "Delete")).toEqual(BLUE_600);
  await press(page, BTN.DOWN); // focus moves Edit -> Delete: the hover is cleared, Delete takes the focus blue
  expect(await rowPaint(page, "Delete")).toEqual(BLUE_600);
  expect(await rowPaint(page, "Edit")).toEqual(PANEL);
  await press(page, BTN.UP); // focus moves back to Edit: the hover on Delete was cleared by the focus move
  expect(await rowPaint(page, "Edit")).toEqual(BLUE_600);
  expect(await rowPaint(page, "Delete")).toEqual(PANEL);
  await page.mouse.move(dx + 2, dy); // the next mouse move lights Delete again, and suppresses the focused Edit
  await frames(page, 4);
  expect(await rowPaint(page, "Delete")).toEqual(BLUE_600);
  expect(await rowPaint(page, "Edit")).toEqual(PANEL);
});

test("desktop: CIRCLE over the hovered, focused row presses it; the press closes the menu and no hover lingers", async ({ page }, testInfo) => {
  test.skip(testInfo.project.use.hasTouch === true, "the mouse hover is the desktop chromium tier");
  await openMenu(page, testInfo);
  const edit = await labelPoint(page, "Edit");
  const [ex, ey] = await clientOf(page, edit.x, edit.y);
  await page.mouse.move(ex, ey);
  await frames(page, 4);
  expect(await rowPaint(page, "Edit")).toEqual(BLUE_600); // focus: the hover adds no overlay over the focused row
  // CIRCLE is held: the item presses on the press edge and closes, as the README records for closing rows.
  for (let i = 0; i < 4; i++) await page.evaluate("window.__host.step(" + BTN.CIRCLE + ")");
  await frames(page, 4);
  const drawn = (await runs(page)).map((r) => r.text);
  expect(drawn).not.toContain("Edit");
  expect(drawn).not.toContain("Delete");
});
