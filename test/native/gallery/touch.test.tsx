// Touch paging (touch.ts) on the Tabs page: a tap in the edge band beside a tab presses the tab and does not page;
// a tap in the edge band with no control near it pages.
import { afterEach, expect, test } from "bun:test";
import { useEffect } from "react";
import { View } from "../../../src/index.ts";
import { onPointerTap } from "../../../src/input/pointer.ts";
import { harness, ROOT } from "../support.ts";
import { PageFrame, TabsPage } from "./pages.tsx";
import { touchTap } from "./touch.ts";

const h = harness();
let stop: (() => void) | undefined;
let backs = 0;
let forwards = 0;
afterEach(() => { stop?.(); stop = undefined; backs = 0; forwards = 0; h.dispose(); delete (globalThis as { __pocketPointer?: unknown }).__pocketPointer; });

/** The Tabs page in its gallery frame, with the gallery's touch tap installed (as main.tsx does). */
function Tabs() {
  useEffect(() => {
    stop = onPointerTap((x, y) => touchTap(x, y, 480, { back: () => backs++, forward: () => forwards++ }));
    return () => stop?.();
  }, []);
  return (
    <View className={ROOT}>
      <PageFrame index={5} total={25} name="Tabs" active flush={false}>
        <TabsPage />
      </PageFrame>
    </View>
  );
}

/** A press and release at one point, read by the pointer pump on the frames after each is queued. */
function touch(c: { step(b: number): void }, x: number, y: number) {
  const q = ((globalThis as { __pocketPointer?: unknown[] }).__pocketPointer ??= []);
  q.push({ x, y, down: true });
  c.step(0);
  c.step(0);
  q.push({ x, y, down: false });
  c.step(0);
  c.step(0);
  c.step(0);
  c.step(0);
}

const start = () => h.boot(() => <Tabs />);

const at = (c: { texts(): { x: number; y: number; w: number; h: number; text: string }[] }, text: string) => {
  const r = c.texts().find((t) => t.text === text);
  if (!r) throw new Error("no text " + text);
  return r;
};

test("a tap on a tab selects it", async () => {
  const c = await start();
  const pw = at(c, "Password");
  touch(c, pw.x + 2, pw.y + 2);
  expect(c.texts().map((t) => t.text)).toContain("Password settings here");
  expect(backs + forwards).toBe(0);
});

test("a tap in the left edge band beside the Account tab selects it; the page does not change", async () => {
  const c = await start();
  const pw = at(c, "Password");
  touch(c, pw.x + 2, pw.y + 2);
  const acc = at(c, "Account");
  // x 9 is the TabsList margin, 3 px left of the tab (its box starts at x 12): the edge band, with no ink of the tab there.
  touch(c, 9, acc.y + 8);
  expect(c.texts().map((t) => t.text)).toContain("Account settings here");
  expect(backs).toBe(0);
  expect(forwards).toBe(0);
});

test("a tap in the left edge band with no control near it pages back", async () => {
  const c = await start();
  touch(c, 2, 150);
  expect(backs).toBe(1);
  expect(forwards).toBe(0);
});

test("a tap in the right edge band with no control near it pages forward", async () => {
  const c = await start();
  touch(c, 470, 150);
  expect(forwards).toBe(1);
  expect(backs).toBe(0);
});

test("a tap in the middle of the canvas, with no control there, pages nothing", async () => {
  const c = await start();
  touch(c, 240, 150);
  expect(backs + forwards).toBe(0);
});
