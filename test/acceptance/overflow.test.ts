// Gate 2, overflow and zero-area, against fixture cases with known answers. The overlay channel sees the
// untrimmed box, so the off-screen node is 2a. The stock channel only sees the screen-clipped box, so an edge-touching
// node is partial there, never a pass.
import { afterEach, expect, test } from "bun:test";
import { rootMirror } from "../../src/internal/pocket.ts";
import { geometryFor } from "../../tools/qa/acceptance/geometry.ts";
import { checkOverflow } from "../../tools/qa/acceptance/overflow.ts";
import { bootTarget, disposeTarget, type Booted } from "../../tools/qa/acceptance/screen.ts";

let b: Booted | undefined;
afterEach(() => {
  if (b) disposeTarget(b);
  b = undefined;
});

async function judge() {
  b = await bootTarget({ kind: "fixture", name: "overflow" });
  return checkOverflow(rootMirror, geometryFor(b.core));
}

test("overflow: the known defects are found, and the control and scroll child are not", async () => {
  const rep = await judge();
  const hit = rep.findings.map((f) => f.gate + ":" + f.node).sort();
  expect(hit).toContain("2b:clip-child");
  expect(hit).toContain("2c:zero");
  expect(hit.some((h) => h.endsWith(":control") || h.endsWith(":scroll-child"))).toBe(false);
  if (rep.channel === "overlay") expect(hit).toContain("2a:offscreen");
});

test("overflow: the off-screen node is 2a on the overlay channel with the right overshoot, and partial on stock", async () => {
  const rep = await judge();
  if (rep.channel === "overlay") {
    const f = rep.findings.find((x) => x.node === "offscreen");
    expect(f?.gate).toBe("2a");
    expect(f?.overshoot).toBe(40);
  } else {
    expect(rep.partial).toContain("offscreen");
    expect(rep.findings.some((x) => x.node === "offscreen")).toBe(false);
  }
});

test("overflow: the clipped child overshoots its clip by 100 px (200 px child in a 100 px clip)", async () => {
  const rep = await judge();
  const f = rep.findings.find((x) => x.node === "clip-child");
  expect(f?.gate).toBe("2b");
  expect(f?.overshoot).toBe(100);
});

test("overflow: the report counts what it checked and names the channel", async () => {
  const rep = await judge();
  expect(["overlay", "stock"]).toContain(rep.channel);
  expect(rep.checked).toBeGreaterThanOrEqual(5);
});

test("overflow: a slide wholly outside its clip is clipped away, not overflow (a carousel's off-track slide)", async () => {
  const rep = await judge();
  expect(rep.findings.some((x) => x.node === "track-slide-off")).toBe(false);
  expect(rep.clippedAway).toBeGreaterThanOrEqual(1);
});

test("overflow: a slide that is partly shown and runs 128 px past its clip is a 2b finding", async () => {
  b = await bootTarget({ kind: "mutant", name: "overflow-carousel" });
  const geo = geometryFor(b.core);
  const rep = checkOverflow(rootMirror, geo);
  // The overshoot needs the overlay channel: the stock box is already clipped to the screen.
  if (geo.channel !== "overlay") return;
  const f = rep.findings.find((x) => x.gate === "2b" && x.overshoot === 128);
  expect(f).toBeDefined();
});
