// Gate 1, legibility: text ink against its own background, WCAG contrast >= 3:1. Synthetic pixel sources:
// each case is a page the gate must judge without any PocketJS in the loop.
import { expect, test } from "bun:test";
import { checkRun, contrast, luminance, type Pixels } from "../../tools/qa/acceptance/legibility.ts";

/** A pixel source from a function of (x, y), 480 x 272 like the screen. */
function source(fn: (x: number, y: number) => string): Pixels {
  return { pixel: (x: number, y: number) => fn(x, y) };
}
const HOST = { x: 10, y: 10, w: 100, h: 20 };
const RUN = { x: 20, y: 14, w: 40, h: 12 };
/** Paint a run's text as a block of ink colour inside the run rect (every other pixel stays the host fill). */
function paint(bg: string, ink: string) {
  return source((x, y) => (x >= RUN.x && x < RUN.x + 24 && y >= RUN.y && y < RUN.y + 8 ? ink : bg));
}

test("legibility: black text on white is 21:1 and passes", () => {
  const r = checkRun(paint("#ffffff", "#000000"), { text: "Ok", rect: RUN, host: HOST });
  expect(r.status).toBe("pass");
  expect(r.ratio).toBeCloseTo(21, 0);
});

test("legibility: #bbbbbb on white is about 1.9:1 and fails", () => {
  const r = checkRun(paint("#ffffff", "#bbbbbb"), { text: "Grey", rect: RUN, host: HOST });
  expect(r.status).toBe("fail");
  expect(r.ratio).toBeLessThan(3);
  expect(r.ratio).toBeGreaterThan(1.8);
});

test("legibility: white text on a white host is invisible and fails with no ink", () => {
  const r = checkRun(paint("#ffffff", "#ffffff"), { text: "Save", rect: RUN, host: HOST });
  expect(r.status).toBe("fail");
  expect(r.reason).toContain("no ink");
});

test("legibility: a host with a mixed background is unresolved, never a pass", () => {
  const mixed = source((x, y) => (x % 2 === 0 ? "#ffffff" : "#000000"));
  const r = checkRun(mixed, { text: "Mixed", rect: RUN, host: HOST });
  expect(r.status).toBe("unresolved");
});

test("legibility: a run with no host box is unresolved", () => {
  const r = checkRun(paint("#ffffff", "#000000"), { text: "Orphan", rect: RUN, host: null });
  expect(r.status).toBe("unresolved");
});

test("legibility: the WCAG formula matches its reference points", () => {
  expect(luminance("#ffffff")).toBeCloseTo(1, 3);
  expect(luminance("#000000")).toBeCloseTo(0, 3);
  expect(contrast("#ffffff", "#000000")).toBeCloseTo(21, 0);
});
