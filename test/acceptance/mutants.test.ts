// Step 2: each defect mutant mounts on the real core and carries its defect's structure.
import { afterEach, expect, test } from "bun:test";
import { classOf } from "../../src/style/class-runtime.ts";
import { disposeTarget, findNode, type Booted, bootTarget } from "../../tools/qa/acceptance/screen.ts";
import { geometryFor } from "../../tools/qa/acceptance/geometry.ts";

let b: Booted | undefined;
afterEach(() => {
  if (b) disposeTarget(b);
  b = undefined;
});

test("mutant white-button: the Save label sits on an element that is white-on-white", async () => {
  b = await bootTarget({ kind: "mutant", name: "white-button" });
  expect(b.core.texts().map((t) => t.text)).toContain("Save");
  expect(findNode((n) => classOf(n).includes("bg-white") && classOf(n).includes("text-white"))).toBeDefined();
});

test("mutant zero-size-badge: the badge itself is 0 x 0, and its label is a child of that box", async () => {
  b = await bootTarget({ kind: "mutant", name: "zero-size-badge" });
  const badge = findNode((n) => classOf(n).includes("w-0") && classOf(n).includes("h-0"));
  expect(badge).toBeDefined();
  const r = geometryFor(b.core).rect(badge!);
  expect(r && r.w === 0 && r.h === 0).toBe(true);
  expect(findNode((n) => (n as unknown as { text?: string }).text === "New", badge!)).toBeDefined();
});

test("mutant overflow-carousel: a 400 px slide, 200 px into its 400 px viewport, runs past the viewport", async () => {
  b = await bootTarget({ kind: "mutant", name: "overflow-carousel" });
  const slide = findNode((n) => classOf(n).includes("bg-slate-200"));
  expect(slide).toBeDefined();
  const geo = geometryFor(b.core);
  const r = geo.rect(slide!);
  // Overlay: the untrimmed box starts at x 208 and is 400 wide, so it runs to 608 past the 408 px viewport edge.
  // Stock: the paint box is clipped to the screen, so it is narrower than 400; the stock channel can only call it partial.
  if (geo.channel === "overlay") expect(r).toMatchObject({ x: 208, w: 400 });
  else expect(r?.w ?? 0).toBeLessThan(400);
});

test("mutant empty-sheet: the trigger is there and the panel has no title", async () => {
  b = await bootTarget({ kind: "mutant", name: "empty-sheet" });
  const texts = b.core.texts().map((t) => t.text);
  expect(texts).toContain("Open sheet");
  expect(texts).not.toContain("Edit");
});
