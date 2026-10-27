// The collector follows the app's own imports whether they are relative or absolute: an entry generated
// under dist/ names its sources by absolute path, and their class literals must reach the style table.
import { expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { collect } from "../tools/collect.ts";

test("collect: a class literal in a file imported by absolute path reaches the literal list", async () => {
  const dir = mkdtempSync(join(tmpdir(), "collect-abs-"));
  const src = join(dir, "section.tsx");
  writeFileSync(src, 'export const Body = () => <div className="h-[7777px] w-full" />;\n');
  const entryDir = join(dir, "generated");
  mkdirSync(entryDir);
  const entry = join(entryDir, "screen.tsx");
  writeFileSync(entry, 'import { Body } from "' + src + '";\nexport default Body;\n');
  const found = await collect(entry, []);
  expect(found.literals).toContain("h-[7777px] w-full");
  expect(found.files).toContain(src);
});
