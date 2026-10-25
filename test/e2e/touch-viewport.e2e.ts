// Touch-tier canvas fit. The touch tiers (chromium-iphone, webkit) must show the 960 px
// canvas inside the phone viewport at 1:1, and a tap must map to the canvas point under it. The desktop
// tier keeps its 960x544 CSS geometry. The viewport meta comes from openHost on the mobile tiers (the test
// page); Step 3 removes that injection, so this spec then runs the shipped page.
import { expect, type Page, type TestInfo, test } from "@playwright/test";
import { openHost, type Server, serve } from "./helpers.ts";

let server: Server;
test.beforeAll(async () => {
  server = await serve();
});
test.afterAll(async () => {
  await server?.stop();
});

const isTouch = (testInfo: TestInfo) => testInfo.project.use.hasTouch === true;

/** Open the host page on the touch tiers with touch=1 (WebKit reports maxTouchPoints 0). */
async function open(page: Page, testInfo: TestInfo, query: string): Promise<void> {
  const q = isTouch(testInfo) && !query.includes("touch=1") ? query + "&touch=1" : query;
  await openHost(page, testInfo, server.url + "?" + q);
}

/** Canvas box and the page's layout and zoom state. */
const geometry = (page: Page) =>
  page.evaluate(() => {
    const r = document.getElementById("screen")!.getBoundingClientRect();
    return {
      left: r.left,
      right: r.right,
      top: r.top,
      width: r.width,
      height: r.height,
      layoutWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      zoom: visualViewport!.scale,
    };
  });

/** Client pixels of a canvas-logical point, through the canvas box (the same mapping a tap uses). */
const clientOf = (page: Page, x: number, y: number) =>
  page.evaluate<[number, number]>(
    "(() => { const c = document.getElementById('screen'); const r = c.getBoundingClientRect(); return [r.left + " +
      x + " * r.width / c.width, r.top + " + y + " * r.height / c.height]; })()",
  );

test("touch tier: the canvas fits the phone viewport at 1:1, nothing overflows", async ({ page }, testInfo) => {
  test.skip(!isTouch(testInfo), "touch tiers only");
  await open(page, testInfo, "manual=1");
  const g = await geometry(page);
  // Not zoomed out: at 1:1 the page is readable, and the canvas sits inside the layout viewport.
  expect(g.zoom).toBeCloseTo(1, 2);
  expect(g.right).toBeLessThanOrEqual(g.layoutWidth);
  expect(g.scrollWidth).toBeLessThanOrEqual(g.layoutWidth);
});

test("touch tier: a tap maps to the canvas point under it, on the whole canvas", async ({ page }, testInfo) => {
  test.skip(!isTouch(testInfo), "touch tiers only");
  await open(page, testInfo, "manual=1");
  // Corners and middle of the 480x272 logical canvas. The far corner is the one that fell off the viewport.
  for (const [x, y] of [
    [240, 136],
    [20, 20],
    [460, 252],
  ] as const) {
    await page.evaluate("globalThis.__pocketPointer = []");
    const [cx, cy] = await clientOf(page, x, y);
    const layoutWidth = await page.evaluate<number>("document.documentElement.clientWidth");
    const innerH = await page.evaluate<number>("innerHeight");
    // The tap must land on screen: a point past the layout viewport never reaches the canvas on WebKit.
    expect(cx, `tap x for logical (${x},${y})`).toBeLessThan(layoutWidth);
    expect(cy, `tap y for logical (${x},${y})`).toBeLessThan(innerH);
    await page.touchscreen.tap(cx, cy);
    const pts = await page.evaluate<{ x: number; y: number; down: boolean }[]>("globalThis.__pocketPointer ?? []");
    // One CSS px is 1.33 logical px at the 0.75 scale: allow 2 logical px for rounding.
    const hit = pts.find((p) => p.down && Math.abs(p.x - x) <= 2 && Math.abs(p.y - y) <= 2);
    expect(hit, `tap at logical (${x},${y}) reached the canvas`).toBeDefined();
  }
});

test("desktop tier: the canvas keeps its 960x544 CSS geometry", async ({ page }, testInfo) => {
  test.skip(isTouch(testInfo), "desktop tier only");
  await open(page, testInfo, "manual=1");
  const g = await geometry(page);
  expect(g.width).toBe(960);
  expect(g.height).toBe(544);
});
