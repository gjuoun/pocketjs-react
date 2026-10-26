// C6 placement: placePopper is pure geometry (no core), so these run without a host.
import { expect, test } from "bun:test";
import { type Box, placePopper } from "../src/primitives/anchor.ts";

const VP = { w: 480, h: 272 };
const PANEL = { w: 220, h: 100 };
const at = (x: number, y: number, w = 100, h = 30): Box => ({ x, y, w, h });

test("default: below the anchor, left-aligned, offset by sideOffset", () => {
  expect(
    placePopper({
      anchor: at(40, 60),
      panel: PANEL,
      viewport: VP,
      sideOffset: 4,
    }),
  ).toEqual({
    x: 40,
    y: 94,
    side: "bottom",
  });
});

test("flips above when the bottom has no room and the top does", () => {
  expect(
    placePopper({
      anchor: at(40, 220),
      panel: PANEL,
      viewport: VP,
      sideOffset: 4,
    }),
  ).toEqual({
    x: 40,
    y: 116,
    side: "top",
  });
});

test("does not flip when the opposite side is no roomier", () => {
  const tall = { w: 220, h: 260 };
  expect(
    placePopper({
      anchor: at(40, 60),
      panel: tall,
      viewport: VP,
      sideOffset: 4,
    }).side,
  ).toBe("bottom");
});

test("clamps inside the right edge of the viewport", () => {
  expect(
    placePopper({
      anchor: at(400, 60, 60),
      panel: PANEL,
      viewport: VP,
      sideOffset: 4,
    }).x,
  ).toBe(260);
});

test("clamps inside the left edge of the viewport", () => {
  expect(
    placePopper({
      anchor: at(0, 60, 40),
      panel: PANEL,
      viewport: VP,
      align: "end",
    }).x,
  ).toBe(0);
});

test("align center centres the panel on the anchor", () => {
  expect(
    placePopper({
      anchor: at(200, 60),
      panel: PANEL,
      viewport: VP,
      align: "center",
    }).x,
  ).toBe(140);
});

test("align end right-aligns the panel to the anchor", () => {
  expect(
    placePopper({
      anchor: at(300, 60),
      panel: PANEL,
      viewport: VP,
      align: "end",
    }).x,
  ).toBe(180);
});

test("side top places the panel above by sideOffset", () => {
  expect(
    placePopper({
      anchor: at(40, 200),
      panel: PANEL,
      viewport: VP,
      side: "top",
      sideOffset: 4,
    }).y,
  ).toBe(96);
});

test("side right places the panel beside the anchor, centred on the cross axis", () => {
  expect(
    placePopper({
      anchor: at(40, 100, 100, 30),
      panel: { w: 60, h: 40 },
      viewport: VP,
      side: "right",
      align: "center",
    }),
  ).toEqual({
    x: 140,
    y: 95,
    side: "right",
  });
});

test("collisionPadding keeps the panel off the viewport edge", () => {
  expect(
    placePopper({
      anchor: at(0, 60, 40),
      panel: PANEL,
      viewport: VP,
      align: "end",
      collisionPadding: 8,
    }).x,
  ).toBe(8);
});

test("alignOffset shifts a start-aligned panel along the cross axis", () => {
  expect(
    placePopper({
      anchor: at(40, 60),
      panel: PANEL,
      viewport: VP,
      align: "start",
      alignOffset: -4,
    }).x,
  ).toBe(36);
});

test("alignOffset moves an end-aligned panel inward", () => {
  expect(
    placePopper({
      anchor: at(300, 60),
      panel: PANEL,
      viewport: VP,
      align: "end",
      alignOffset: 4,
    }).x,
  ).toBe(176);
});
