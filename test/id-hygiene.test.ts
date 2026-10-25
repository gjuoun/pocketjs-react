// Anti-regression guard for the public-repo red line: no internal card ids in tracked text files.
// Scans the git index (git ls-files), so untracked scratch files never trip it. bun.lock is excluded:
// its base64 integrity hashes contain letter-digit runs that match the pattern by chance.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { expect, test } from "bun:test";

const ROOT = import.meta.dir + "/..";
const TEXT_FILE = /\.(ts|tsx|js|mjs|md|json|html|css|txt|xhtml)$/;
const EXCLUDED = new Set(["bun.lock"]);
// Allowlist: empty by design. A path belongs here only with a reason recorded in the commit message.
const ALLOWLIST: readonly string[] = [];
// A card id is a letter pair (JG or JW), an optional dash, and digits, on a word boundary.
const CARD_ID = /\b(?:JG|JW)-?\d+\b/i;

function trackedTextFiles(): string[] {
  return execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" })
    .split("\n")
    .filter((f) => TEXT_FILE.test(f) && !EXCLUDED.has(f) && !ALLOWLIST.includes(f));
}

test("the tracked source tree carries no internal card ids", () => {
  const files = trackedTextFiles();
  // Sanity floor: an empty or near-empty scan would pass vacuously.
  expect(files.length).toBeGreaterThan(100);
  const hits: string[] = [];
  for (const f of files) {
    readFileSync(`${ROOT}/${f}`, "utf8")
      .split("\n")
      .forEach((line, i) => {
        if (CARD_ID.test(line)) hits.push(`${f}:${i + 1}: ${line.trim()}`);
      });
  }
  expect(hits.join("\n")).toBe("");
});
