import { afterEach, expect, test } from "bun:test";
import { View } from "../../src/index.ts";
import { rootMirror, type NodeMirror } from "../../src/internal/pocket.ts";
import { walk } from "../../tools/qa/acceptance/geometry.ts";
import { Avatar, type AvatarSize } from "../../src/native/avatar.tsx";
import { ThemeProvider } from "../../src/native/theme.tsx";
import { harness, inkOf, ROOT } from "./support.ts";

const h = harness();
afterEach(() => h.dispose());
const PAGE = "#ffffff";
const FILL = "#e2e8f0";

/** The circle: the bounding box of the fill colour on the screen (one avatar per test). Centres are pixel edges. */
function circle(fill: string) {
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = 0; y < 272; y++) for (let x = 0; x < 480; x++) if (h.core.pixel(x, y) === fill) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  const w = x1 - x0 + 1;
  const hh = y1 - y0 + 1;
  return { x: x0, y: y0, w, h: hh, cx: x0 + w / 2, cy: y0 + hh / 2, r: w / 2 };
}

/** The ink box of the glyphs: non-fill pixels inside the circle (two pixels in from its edge). */
function inkBox(fill: string, c: ReturnType<typeof circle>) {
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = c.y; y < c.y + c.h; y++) for (let x = c.x; x < c.x + c.w; x++) {
    const d = Math.hypot(x + 0.5 - c.cx, y + 0.5 - c.cy);
    if (d > c.r - 2) continue;
    if (h.core.pixel(x, y) === fill) continue;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return { cx: (x0 + x1 + 1) / 2, cy: (y0 + y1 + 1) / 2 };
}

const SIZES: Array<[AvatarSize, number]> = [["sm", 24], ["md", 32], ["lg", 40]];
for (const [size, px] of SIZES) {
  test(size + " avatar is a " + px + " px circle with its initials centred within 1 px", async () => {
    await h.boot(() => <View className={ROOT}><Avatar size={size}>AK</Avatar></View>);
    const c = circle(FILL);
    expect(Math.abs(c.w - px)).toBeLessThanOrEqual(1);
    expect(Math.abs(c.h - px)).toBeLessThanOrEqual(1);
    // The circle is a circle: the corner of its box is the page, not the fill.
    expect(h.core.pixel(c.x, c.y)).toBe(PAGE);
    // Tolerance 1 px: the glyph line box centres the caps to within half a pixel on x and about 1 px on y (lg).
    const ink = inkBox(FILL, c);
    expect(Math.abs(ink.cx - c.cx)).toBeLessThanOrEqual(1);
    expect(Math.abs(ink.cy - c.cy)).toBeLessThanOrEqual(1);
  });
}

test("the initials are drawn in slate-900 on the slate-200 fill", async () => {
  await h.boot(() => <View className={ROOT}><Avatar>AK</Avatar></View>);
  expect(inkOf(h.core, h.core.texts().find((t) => t.text === "AK")!)).toBe("#0f172a");
});

test("the dark theme draws the circle in slate-700 with white initials", async () => {
  await h.boot(() => <ThemeProvider theme="dark"><View className={ROOT}><Avatar>AK</Avatar></View></ThemeProvider>);
  const c = circle("#334155");
  expect(c.w).toBe(32);
  expect(inkOf(h.core, h.core.texts().find((t) => t.text === "AK")!)).toBe("#ffffff");
});

function markers(): string[] {
  const out: string[] = [];
  walk(rootMirror as NodeMirror, (n) => { if (n.debugName?.startsWith("avatar-fallback")) out.push(n.debugName); });
  return out;
}

test("a src with no built image draws the initials, reports the miss once, and is marked in the mirror", async () => {
  const misses: string[] = [];
  await h.boot(() => <View className={ROOT}><Avatar src="team/ak.png" onImageMissing={(s) => misses.push(s)}>AK</Avatar></View>);
  for (let i = 0; i < 5; i++) { h.core.step(0); h.core.render(); }
  expect(misses).toEqual(["team/ak.png"]);
  expect(markers()).toEqual(["avatar-fallback:missing"]);
  expect(h.core.texts().map((t) => t.text)).toContain("AK");
  expect(circle(FILL).w).toBe(32);
});

test("an avatar without a src reports nothing and is marked as a plain fallback", async () => {
  const misses: string[] = [];
  await h.boot(() => <View className={ROOT}><Avatar onImageMissing={(s) => misses.push(s)}>AK</Avatar></View>);
  expect(misses).toEqual([]);
  expect(markers()).toEqual(["avatar-fallback"]);
});

test("the miss path draws the same circle as the plain fallback", async () => {
  await h.boot(() => <View className={ROOT}><Avatar>AK</Avatar></View>);
  const plain = circle(FILL);
  await h.boot(() => <View className={ROOT}><Avatar src="team/ak.png">AK</Avatar></View>);
  const miss = circle(FILL);
  expect(miss).toEqual(plain);
});
