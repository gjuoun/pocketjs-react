// R8 (batch 2): the overlay packages without a PocketJS-native shape are not in the codemod's import edges
// beyond the three that have one. The remap moves only the module specifier.
import { expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { codemod } from "../tools/codemod/shadcn.ts";

const TMP = "/tmp/pocketjs-react-test/batch2-r8";

test("R8: vaul, sonner and next-themes imports point at the native modules", async () => {
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP + "/upstream", { recursive: true });
  writeFileSync(
    TMP + "/upstream/overlay.tsx",
    [
      'import { Drawer as DrawerPrimitive } from "vaul"',
      'import { Toaster as Sonner } from "sonner"',
      'import { useTheme } from "next-themes"',
      'export const x = [DrawerPrimitive, Sonner, useTheme]',
      "",
    ].join("\n"),
  );
  const report = await codemod(TMP + "/upstream");
  const after = report.files[0].after;
  expect(after).toContain('from "pocketjs-react/vaul"');
  expect(after).toContain('from "pocketjs-react/sonner"');
  expect(after).toContain('from "pocketjs-react/next-themes"');
  expect(after).not.toMatch(/from "(vaul|sonner|next-themes)"/);
});
