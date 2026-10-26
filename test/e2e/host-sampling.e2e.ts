// Host input sampling: the reader's rAF loop must hand the guest every press as a raise and a fall,
// whatever the timing. Runs the loop (no ?manual=1), so it is the real per-frame path, on every tier.
import { expect, type Page, test } from "@playwright/test";
import { openHost, type Server, serveApp } from "./helpers.ts";

const DOWN = 0x40;
type Guest = {
  __seen: number[];
  __host: {
    instance: { step(buttons: number): unknown } | null;
    press(bit: number, down: boolean): void;
  };
};

let server: Server;
test.beforeAll(async () => {
  server = await serveApp("overlays");
});
test.afterAll(async () => {
  await server?.stop();
});

/** Record every buttons value the guest's frame receives (one per step), from now on. */
async function observe(page: Page): Promise<void> {
  await page.evaluate(() => {
    const g = window as unknown as Guest;
    g.__seen = [];
    const inst = g.__host.instance;
    if (!inst) throw new Error("guest not booted");
    const step = inst.step.bind(inst);
    inst.step = (buttons: number) => {
      g.__seen.push(buttons);
      return step(buttons);
    };
  });
}
const mark = (page: Page): Promise<number> =>
  page.evaluate(() => (window as unknown as Guest).__seen.length);
const since = (page: Page, from: number): Promise<number[]> =>
  page.evaluate(
    (from) => (window as unknown as Guest).__seen.slice(from),
    from,
  );
/** Rising edges of DOWN in a run of guest frames: one per press the guest saw. */
function raises(seen: number[]): number {
  let n = 0;
  let prev = 0;
  for (const buttons of seen) {
    const down = buttons & DOWN ? 1 : 0;
    if (down && !prev) n++;
    prev = down;
  }
  return n;
}

test("a press shorter than a frame reaches the guest as a raise (virtual path)", async ({
  page,
}, testInfo) => {
  await openHost(page, testInfo, server.url);
  await observe(page);
  const from = await mark(page);
  await page.evaluate((bit) => {
    const host = (window as unknown as Guest).__host;
    host.press(bit, true);
    host.press(bit, false);
  }, DOWN);
  await page.waitForFunction(
    (from) => (window as unknown as Guest).__seen.length >= from + 2,
    from,
    { timeout: 5000 },
  );
  expect(raises(await since(page, from))).toBe(1);
});

test("re-presses 2-6 ms apart are not merged into one hold", async ({
  page,
}, testInfo) => {
  await openHost(page, testInfo, server.url);
  await observe(page);
  const from = await mark(page);
  const presses = 16;
  await page.evaluate((presses) => {
    const send = (type: string) =>
      window.dispatchEvent(
        new KeyboardEvent(type, { code: "ArrowDown", key: "ArrowDown" }),
      );
    const spin = (ms: number) => {
      const t = performance.now();
      while (performance.now() - t < ms);
    };
    for (let i = 0; i < presses; i++) {
      send("keydown");
      spin(2 + ((i * 7) % 5));
      send("keyup");
      spin(2 + ((i * 3) % 5));
    }
  }, presses);
  await page.waitForFunction(
    ([from, presses]) => {
      const seen = (window as unknown as Guest).__seen.slice(from);
      let n = 0;
      let prev = 0;
      for (const b of seen) {
        const d = b & 0x40 ? 1 : 0;
        if (d && !prev) n++;
        prev = d;
      }
      return n >= presses;
    },
    [from, presses] as const,
    { timeout: 8000 },
  );
  expect(raises(await since(page, from))).toBe(presses);
});

test("presses 200 ms apart are each seen once (the control)", async ({
  page,
}, testInfo) => {
  await openHost(page, testInfo, server.url);
  await observe(page);
  const per: number[] = [];
  for (let i = 0; i < 12; i++) {
    const from = await mark(page);
    await page.keyboard.down("ArrowDown");
    await page.waitForTimeout(80);
    await page.keyboard.up("ArrowDown");
    await page.waitForTimeout(200);
    per.push(raises(await since(page, from)));
  }
  expect(per).toEqual(Array(12).fill(1));
});

test("a key held across many frames is one hold, not an oscillation", async ({
  page,
}, testInfo) => {
  await openHost(page, testInfo, server.url);
  await observe(page);
  const from = await mark(page);
  await page.keyboard.down("ArrowDown");
  await page.waitForTimeout(600);
  await page.keyboard.up("ArrowDown");
  await page.waitForTimeout(200);
  const seen = await since(page, from);
  expect(raises(seen)).toBe(1);
  expect(seen.filter((b) => b & DOWN).length).toBeGreaterThan(20);
});
