// Mutant pairs for the input-mode rule (test/native/keyboard-provenance.test.tsx). Each defect edits one line of a fresh copy
// of the tree and must make the named test fail for its stated reason; each control is the unedited copy and must pass with
// every test run. A run whose suite did not load (a driver that could not run) is reported as such, never as a defect caught.
// The working tree is never written. POCKETJS_CORE_ROOT is resolved here, before the copy runs, so a relative overlay path
// means the same core in the copy as in the checkout. Exit 1 when any row differs from its expectation.
//   bun tools/native/keyboard-mutants.ts
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "../..");
const SUITE = "test/native/keyboard-provenance.test.tsx";
const COPIED = ["src", "test", "tools", "package.json", "tsconfig.json", "node_modules"];

interface Defect {
  name: string;
  file: string;
  from: string;
  to: string;
  why: string;
  /** The test whose failure is the stated reason; any other failure, or none, is a mismatch. */
  reasonTest: string;
}

const DEFECTS: Defect[] = [
  {
    name: "keyboard-ignores-provenance",
    file: "src/input/text-field.ts",
    from: 'return inputSource() === "physical" ? "direct" : "panel";',
    to: 'return "panel";',
    why: "the field never hides its panel (the reported defect)",
    reasonTest: "the first physical key hides the on-screen keyboard",
  },
  {
    name: "keyboard-hides-on-onscreen-key",
    file: "src/input/Osk.tsx",
    from: 'const field = props.field;\n    setInputSource("onscreen");',
    to: 'const field = props.field;\n    setInputSource("physical");',
    why: "a press on an on-screen key hides the panel it types with",
    reasonTest: "a press on a key of the on-screen keyboard types into the field and keeps the keyboard up",
  },
];

/** A fresh copy of the tree; node_modules is an APFS clone, so the copy costs no disk. */
function fresh(): string {
  const dir = mkdtempSync(join(tmpdir(), "pjs-mut-"));
  Bun.spawnSync(["cp", "-cR", ...COPIED.map((p) => join(ROOT, p)), dir]);
  return dir;
}

/** The child's environment: the same core as the checkout, with an overlay path made absolute before the copy changes cwd. */
function childEnv(): Record<string, string> {
  const env = Object.fromEntries(Object.entries(process.env).filter((e): e is [string, string] => e[1] !== undefined));
  if (process.env.POCKETJS_CORE_ROOT) env.POCKETJS_CORE_ROOT = resolve(process.env.POCKETJS_CORE_ROOT);
  return env;
}

interface Run {
  /** The suite loaded and ran its tests; false when the driver could not run (import or setup error). */
  loaded: boolean;
  total: number;
  failed: string[];
  /** The first error line bun printed: the assertion for a failed test, or the load error. */
  error: string;
  /** The whole output, for the failing test's assertion. */
  text: string;
}

async function runSuite(dir: string): Promise<Run> {
  const proc = Bun.spawn(["bun", "test", SUITE], { cwd: dir, env: childEnv(), stdout: "pipe", stderr: "pipe" });
  const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  const code = await proc.exited;
  const text = out + err;
  const ran = /^Ran (\d+) tests?/m.exec(text);
  const errors = /^\s*(\d+) errors?\s*$/m.exec(text);
  const failed = [...text.matchAll(/^\(fail\) (.+?)(?: \[[\d.]+m?s\])?$/gm)].map((m) => m[1]);
  const error = /^error: .*$/m.exec(text)?.[0] ?? "";
  const loaded = ran !== null && (errors === null || errors[1] === "0") && (code === 0 || failed.length > 0);
  return { loaded, total: ran ? Number(ran[1]) : 0, failed, error, text };
}

/** The assertion bun printed for the named failing test: its error, expected and received values, and the test line. */
function failureOf(text: string, name: string): string {
  const lines = text.split("\n");
  const at = lines.findIndex((l) => l.startsWith("(fail) ") && l.includes(name));
  if (at < 0) return "";
  let start = at;
  while (start > 0 && !/^\((pass|fail)\) /.test(lines[start - 1])) start--;
  const block = lines.slice(start, at);
  const error = block.find((l) => l.startsWith("error: ")) ?? "";
  const values = block.filter((l) => /^(Expected|Received): /.test(l)).join(", ");
  const line = /keyboard-provenance\.test\.tsx:(\d+)/.exec(block.join("\n"))?.[1];
  return [error, values, line ? "test line " + line : ""].filter(Boolean).join(" · ");
}

const controlDir = fresh();

const control = await runSuite(controlDir);
rmSync(controlDir, { recursive: true, force: true });
const controlOk = control.loaded && control.failed.length === 0;
const TOTAL = control.total;

interface Row { name: string; kind: "defect" | "control"; ok: boolean; verdict: string; reason: string; }
const rows: Row[] = [];

for (const d of DEFECTS) {
  const dir = fresh();
  const path = join(dir, d.file);
  const text = readFileSync(path, "utf8");
  if (text.split(d.from).length !== 2) throw new Error(d.name + ": the edit target is not unique in " + d.file);
  writeFileSync(path, text.replace(d.from, d.to));
  const run = await runSuite(dir);
  rmSync(dir, { recursive: true, force: true });
  let verdict: string;
  let reason: string;
  if (!run.loaded || run.total !== TOTAL) {
    verdict = "MISMATCH: the driver could not run";
    reason = run.error || "suite did not load";
  } else if (run.failed.some((f) => f.includes(d.reasonTest))) {
    verdict = "fails for the stated reason";
    reason = "\"" + d.reasonTest + "\" · " + failureOf(run.text, d.reasonTest);
  } else if (run.failed.length > 0) {
    verdict = "MISMATCH: fails for another reason";
    reason = run.failed.join("; ");
  } else {
    verdict = "MISMATCH: not caught";
    reason = "all " + TOTAL + " tests pass";
  }
  rows.push({ name: d.name, kind: "defect", ok: verdict === "fails for the stated reason", verdict, reason: d.why + " · " + reason });
  rows.push({
    name: d.name + "-control", kind: "control", ok: controlOk,
    verdict: controlOk ? "passes" : control.loaded ? "MISMATCH: the unedited tree fails" : "MISMATCH: the driver could not run",
    reason: controlOk ? "all " + TOTAL + " tests pass on the unedited tree" : (control.loaded ? control.failed.join("; ") : control.error || "suite did not load"),
  });
}

for (const r of rows) console.log(r.name + " [" + r.kind + "]: " + r.verdict + "\n    reason: " + r.reason);
process.exit(rows.every((r) => r.ok) ? 0 : 1);
