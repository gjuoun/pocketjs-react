// Gate 3, alignment: the centre lines of the children of a centred row (items-center, not flex-col) are within 1 px.
import { afterEach, expect, test } from "bun:test";
import { rootMirror } from "../../src/internal/pocket.ts";
import { checkAlignment } from "../../tools/qa/acceptance/alignment.ts";
import { geometryFor } from "../../tools/qa/acceptance/geometry.ts";
import { bootTarget, disposeTarget, type Booted } from "../../tools/qa/acceptance/screen.ts";

let b: Booted | undefined;
afterEach(() => {
  if (b) disposeTarget(b);
  b = undefined;
});

async function judge() {
  b = await bootTarget({ kind: "fixture", name: "alignment" });
  return checkAlignment(rootMirror, geometryFor(b.core));
}

test("alignment: the centred row passes with zero spread", async () => {
  const rep = await judge();
  const row = rep.rows.find((r) => r.row === "row-centred");
  expect(row?.status).toBe("pass");
  expect(row?.spread).toBe(0);
});

test("alignment: a centre line 3 px off fails the row", async () => {
  const rep = await judge();
  const row = rep.rows.find((r) => r.row === "row-off");
  expect(row?.status).toBe("fail");
  expect(row?.spread).toBeGreaterThanOrEqual(2);
  expect(rep.fails.map((r) => r.row)).toContain("row-off");
});

test("alignment: a top-aligned row is not a centred row and is not judged", async () => {
  const rep = await judge();
  expect(rep.rows.map((r) => r.row)).not.toContain("row-start");
});
