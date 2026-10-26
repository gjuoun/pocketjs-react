// Smoke: one test per matrix tier. The page boots and the pure OSK helpers import under node.
import { expect, test } from "@playwright/test";
import { layoutRows, oskLayer } from "../../src/input/osk-layout.ts";
import { manifest, openHost, type Server, serve } from "./helpers.ts";

let server: Server;
test.beforeAll(async () => {
  server = await serve();
});
test.afterAll(async () => {
  await server?.stop();
});

test("the host page boots and the guest is ready", async ({
  page,
}, testInfo) => {
  await openHost(page, testInfo, server.url + "?manual=1");
  expect(
    await page.evaluate(
      () => (window as unknown as { __ready?: boolean }).__ready,
    ),
  ).toBe(true);
  expect(layoutRows(oskLayer("lower"), 472, 4).length).toBeGreaterThan(0);
  expect(manifest.fieldFontSlot).toBe(2);
});
