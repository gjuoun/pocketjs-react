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

test("mutant zero-size-badge: the badge wrapper is 0 x 0 and its label is not drawn", async () => {
  b = await bootTarget({ kind: "mutant", name: "zero-size-badge" });
  const wrap = findNode((n) => classOf(n).includes("w-0") && classOf(n).includes("h-0"));
  expect(wrap).toBeDefined();
  const r = geometryFor(b.core).rect(wrap!);
  expect(r && r.w === 0 && r.h === 0).toBe(true);
  expect(b.core.texts().map((t) => t.text)).not.toContain("New");
});

test("mutant overflow-carousel: the 600 px slide is wider than its 400 px viewport", async () => {
  b = await bootTarget({ kind: "mutant", name: "overflow-carousel" });
  const slide = findNode((n) => classOf(n).includes("bg-slate-200"));
  expect(slide).toBeDefined();
  const geo = geometryFor(b.core);
  const r = geo.rect(slide!);
  // Overlay: the untrimmed box is 600 wide. Stock: the paint box stops at the 480 px screen edge.
  expect(r?.w).toBe(geo.channel === "overlay" ? 600 : 480);
});

test("mutant empty-sheet: the trigger is there and the panel has no title", async () => {
  b = await bootTarget({ kind: "mutant", name: "empty-sheet" });
  const texts = b.core.texts().map((t) => t.text);
  expect(texts).toContain("Open sheet");
  expect(texts).not.toContain("Edit");
});
