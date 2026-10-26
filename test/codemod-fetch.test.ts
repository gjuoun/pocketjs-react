// Offline tests for the registry fetch helpers: argv, remap, NOTICE upsert and --verify.
// Nothing here fetches; the network path is exercised only by a manual run.
import { afterAll, expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import {
  mergeNotice,
  parseArgs,
  remap,
  sha256,
  verifyDir,
} from "../tools/codemod/fetch-shadcn.ts";

const TMP = "/tmp/pocketjs-react-test/codemod-fetch";
afterAll(() => rmSync(TMP, { recursive: true, force: true }));

test("parseArgs: --all, --out and --style parse; unknown flags and bare --all with names are errors", () => {
  const all = parseArgs(["--all", "--out", "/tmp/x"]);
  expect(all.all).toBe(true);
  expect(all.out).toBe("/tmp/x");
  expect(parseArgs(["button", "--style", "new-york"]).style).toBe("new-york");
  expect(() => parseArgs(["--bogus"])).toThrow("unknown flag --bogus");
  expect(() => parseArgs(["--out"])).toThrow("--out needs a value");
  expect(() => parseArgs(["--all", "button"])).toThrow("--all takes no names");
});

test("remap: the documented remaps, plus local ui and hook names, and a report of what is left unresolved", () => {
  const source = [
    'import { cn } from "@/lib/utils"',
    'import { Separator } from "@/registry/new-york-v4/ui/separator"',
    'import { useIsMobile } from "@/registry/new-york-v4/hooks/use-mobile"',
    'import { Ghost } from "@/registry/new-york-v4/ui/ghost"',
    'import { Button } from "@/registry/new-york-v4/ui/button"',
  ].join("\n");
  const out = remap(source, {
    separator: "separator.tsx",
    "use-mobile": "use-mobile.ts",
  });
  expect(out.text).toContain('from "pocketjs-react"');
  expect(out.text).toContain('from "./separator.tsx"');
  expect(out.text).toContain('from "./use-mobile.ts"');
  expect(out.text).toContain('from "./button.tsx"');
  expect(out.text).toContain('from "@/registry/new-york-v4/ui/ghost"');
  expect(out.unresolved).toEqual(["@/registry/new-york-v4/ui/ghost"]);
  // Without locals the five-name behaviour is unchanged: only the documented remaps fire.
  expect(remap(source).text).toContain(
    'from "@/registry/new-york-v4/ui/separator"',
  );
});

test("mergeNotice: rows upsert by file name, one header, and a second style is refused", () => {
  const first = mergeNotice("", {
    style: "new-york-v4",
    fetched: "2026-10-26",
    entries: [
      {
        name: "button",
        file: "button.tsx",
        url: "u1",
        bytes: 3,
        sha256: "a".repeat(64),
        remaps: [],
      },
    ],
  });
  const second = mergeNotice(first, {
    style: "new-york-v4",
    fetched: "2026-10-26",
    entries: [
      {
        name: "badge",
        file: "badge.tsx",
        url: "u2",
        bytes: 4,
        sha256: "b".repeat(64),
        remaps: ['from "cn" -> "pocketjs-react"'],
      },
      {
        name: "button",
        file: "button.tsx",
        url: "u1",
        bytes: 5,
        sha256: "c".repeat(64),
        remaps: [],
      },
    ],
    notPublished: ["toast"],
  });
  expect(second.match(/^# Vendored shadcn sources/gm)?.length).toBe(1);
  expect(second.match(/^\| `button\.tsx`/gm)?.length).toBe(1);
  expect(second).toContain("| `button.tsx` | 5 |");
  expect(second).toContain("| `badge.tsx` | 4 |");
  expect(second).toContain("## Not published in new-york-v4");
  expect(() =>
    mergeNotice(second, { style: "new-york", fetched: "x", entries: [] }),
  ).toThrow("refusing to mix");
});

test("verifyDir: a file with no NOTICE row fails, and a clean tree passes", async () => {
  const root = TMP + "/tree";
  const out = root + "/upstream";
  mkdirSync(out, { recursive: true });
  const body = "export const a = 1;\n";
  writeFileSync(out + "/a.tsx", body);
  const bytes = new TextEncoder().encode(body);
  writeFileSync(
    root + "/NOTICE.md",
    "| file | bytes | sha256 | upstream | import remaps |\n|---|---|---|---|---|\n" +
      "| `a.tsx` | " +
      bytes.byteLength +
      " | `" +
      sha256(bytes) +
      "` | u | none |\n",
  );
  expect(await verifyDir(out)).toBe(0);
  writeFileSync(out + "/b.tsx", "export const b = 2;\n");
  expect(await verifyDir(out)).toBe(1);
});
