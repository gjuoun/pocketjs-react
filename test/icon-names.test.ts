// Every canonical lucide name round-trips through the variant name. Names with digits (grid-2x2,
// clock-6, arrow-down-01) must parse, or their baked variants would be unreachable at runtime.
import { readdirSync, readFileSync } from "node:fs";
import { expect, test } from "bun:test";
import { ICON_COLOUR_NAMES, ICON_NAME, iconName } from "../src/style/icon-names.ts";

const ICON_DIR = "node_modules/lucide-react/dist/esm/icons";

function canonicalNames(): string[] {
  const out: string[] = [];
  for (const f of readdirSync(ICON_DIR)) {
    if (!f.endsWith(".mjs")) continue;
    const src = readFileSync(ICON_DIR + "/" + f, "utf8");
    const m = /name: "([a-z0-9-]+)"/.exec(src);
    if (m && src.includes("__iconData")) out.push(m[1]);
  }
  return out;
}

test("the digit-bearing lucide names round-trip through the variant name", () => {
  const names = canonicalNames().filter((n) => /\d/.test(n));
  expect(names.length).toBeGreaterThanOrEqual(89);
  for (const n of names)
    for (const c of ICON_COLOUR_NAMES) {
      const id = iconName(n, 16, c);
      const m = ICON_NAME.exec(id);
      expect(m?.[1]).toBe(n);
      expect(m?.[2]).toBe("16");
      expect(m?.[3]).toBe(c);
    }
});

test("a name with an uppercase letter or a stray character does not parse", () => {
  expect(ICON_NAME.test("icon.Grid-2x2.16.white")).toBe(false);
  expect(ICON_NAME.test("icon.grid_2.16.white")).toBe(false);
});
