// Gate 4, interaction response, on known answers: the empty-sheet mutant opens a layer with no text (fail), the
// real sheet opens with its title (pass), and entries that are not driven are never a pass.
import { afterEach, expect, test } from "bun:test";
import { rootMirror } from "../../src/internal/pocket.ts";
import { DRIVERS } from "../../tools/qa/acceptance/drivers.ts";
import { geometryFor } from "../../tools/qa/acceptance/geometry.ts";
import { runDriver } from "../../tools/qa/acceptance/interaction.ts";
import { bootTarget, disposeTarget, type Booted } from "../../tools/qa/acceptance/screen.ts";

let b: Booted | undefined;
afterEach(() => {
  if (b) disposeTarget(b);
  b = undefined;
});

test("interaction: the empty sheet opens a layer with no text, so the gate fails", async () => {
  b = await bootTarget({ kind: "mutant", name: "empty-sheet" });
  const v = runDriver(b.core, rootMirror, geometryFor(b.core), DRIVERS.sheet);
  expect(v.status).toBe("fail");
  expect(v.reason).toContain("no text run added");
});

test("interaction: the real sheet opens with its title, so the gate passes on the layer metric", async () => {
  b = await bootTarget({ kind: "section", name: "sheet" });
  const v = runDriver(b.core, rootMirror, geometryFor(b.core), DRIVERS.sheet);
  expect(v.status).toBe("pass");
  expect(v.metric).toBe("layer");
});

test("interaction: static is n/a and unresolved is never a pass, with no press", async () => {
  b = await bootTarget({ kind: "section", name: "alert" });
  const geo = geometryFor(b.core);
  expect(runDriver(b.core, rootMirror, geo, DRIVERS.alert).status).toBe("n/a");
  expect(runDriver(b.core, rootMirror, geo, DRIVERS.button).status).toBe("unresolved");
});
