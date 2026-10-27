import { afterEach, expect, test } from "bun:test";
import { View } from "../../src/index.ts";
import { Spinner, type SpinnerSize } from "../../src/native/spinner.tsx";
import { ThemeProvider } from "../../src/native/theme.tsx";
import { THEMES, TOKENS } from "../../src/native/tokens.ts";
import { harness, ROOT } from "./support.ts";

const h = harness();
afterEach(() => h.dispose());
const PAGE = "#ffffff";
const INK = "#0f172a";

/** The ring's box: the bounding box of the ring colour on the screen (one spinner per test). */
function ring(ink = INK) {
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = 0; y < 272; y++) for (let x = 0; x < 480; x++) if (h.core.pixel(x, y) === ink) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, cx: x0 + (x1 - x0 + 1) / 2, cy: y0 + (y1 - y0 + 1) / 2 };
}

const SIZES: Array<[SpinnerSize, number, number]> = [["sm", 16, 2], ["md", 24, 3], ["lg", 32, 4]];
for (const [size, px, width] of SIZES) {
  test(size + " spinner is a " + px + " px ring, " + width + " px thick, with its gap at the top left", async () => {
    await h.boot(() => <View className={ROOT}><Spinner size={size} /></View>);
    const r = ring();
    expect(Math.abs(r.w - px)).toBeLessThanOrEqual(1);
    expect(Math.abs(r.h - px)).toBeLessThanOrEqual(1);
    // The ring is hollow: its centre is the page.
    expect(h.core.pixel(Math.floor(r.cx), Math.floor(r.cy))).toBe(PAGE);
    // The arc runs from 12 o'clock clockwise through 3, 6 and 9: the 6 o'clock point is ink, the top-left quarter is the gap.
    expect(h.core.pixel(Math.floor(r.cx), r.y + 1)).toBe(INK);
    expect(h.core.pixel(Math.floor(r.cx), r.y + r.h - 2)).toBe(INK);
    const gap = Math.floor(r.cx - r.w * 0.36);
    expect(h.core.pixel(gap, Math.floor(r.cy - r.h * 0.36))).toBe(PAGE);
    // Thickness along the right side, on the middle row: the ring's ink run is the stroke width (within 1 px).
    const row = Math.floor(r.cy);
    let run = 0;
    for (let x = r.x + r.w - 1; x >= r.x && h.core.pixel(x, row) === INK; x--) run++;
    expect(Math.abs(run - width)).toBeLessThanOrEqual(1);
  });
}

test("the dark theme draws the ring in white", async () => {
  await h.boot(() => <ThemeProvider theme="dark"><View className={THEMES.dark["theme.page"]}><Spinner size="md" /></View></ThemeProvider>);
  const r = ring("#ffffff");
  expect(Math.abs(r.w - 24)).toBeLessThanOrEqual(1);
});

test("every size has a token (structure)", () => {
  for (const s of ["sm", "md", "lg"]) expect(TOKENS[("spinner." + s) as keyof typeof TOKENS]).toBeDefined();
});
