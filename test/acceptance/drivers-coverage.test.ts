// Coverage: every vendored component has a driver entry, and the entries name real components.
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "bun:test";
import { SECTIONS } from "../fixtures/shadcn-gallery/layout.ts";
import { DRIVERS } from "../../tools/qa/acceptance/drivers.ts";

const UI = join(import.meta.dir, "../fixtures/shadcn-full/ui");
const GALLERY_SRC = await Bun.file(join(import.meta.dir, "../fixtures/shadcn-gallery/sections.tsx")).text();

test("drivers: one entry per vendored component, and no stray names", () => {
  const files = readdirSync(UI).filter((f) => f.endsWith(".tsx")).map((f) => f.replace(/\.tsx$/, "")).sort();
  expect(Object.keys(DRIVERS).sort()).toEqual(files);
  expect(SECTIONS.map((s) => s.name).sort()).toEqual(files);
});

test("drivers: every static entry says why, every unresolved entry says what is missing", () => {
  for (const [name, d] of Object.entries(DRIVERS)) {
    if (d.kind === "static" || d.kind === "unresolved") expect([name, d.reason.length > 0]).toEqual([name, true]);
  }
});

test("drivers: a driven entry names a trigger that exists in its section's source", () => {
  for (const [name, d] of Object.entries(DRIVERS)) {
    if (d.kind !== "driven") continue;
    expect(GALLERY_SRC).toContain(d.trigger);
  }
});
