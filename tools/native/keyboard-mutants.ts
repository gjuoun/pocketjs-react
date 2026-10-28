// Mutant pairs for the input-mode rule (test/native/keyboard-provenance.test.tsx). Each defect edits one line of a fresh copy
// of the tree and must make the field suite fail; each control is the unedited copy and must pass. The working tree is never
// written. Exit 1 when any row differs from its expectation.
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
}

const DEFECTS: Defect[] = [
  {
    name: "keyboard-ignores-provenance",
    file: "src/input/text-field.ts",
    from: 'return inputSource() === "physical" ? "direct" : "panel";',
    to: 'return "panel";',
    why: "the field never hides its panel (the reported defect)",
  },
  {
    name: "keyboard-hides-on-onscreen-key",
    file: "src/input/Osk.tsx",
    from: 'const field = props.field;\n    setInputSource("onscreen");',
    to: 'const field = props.field;\n    setInputSource("physical");',
    why: "a press on an on-screen key hides the panel it types with",
  },
];

/** A fresh copy of the tree; node_modules is an APFS clone, so the copy costs no disk. */
function fresh(): string {
  const dir = mkdtempSync(join(tmpdir(), "pjs-mut-"));
  Bun.spawnSync(["cp", "-cR", ...COPIED.map((p) => join(ROOT, p)), dir]);
  return dir;
}

async function suitePasses(dir: string): Promise<boolean> {
  const proc = Bun.spawn(["bun", "test", SUITE], { cwd: dir, stdout: "ignore", stderr: "ignore" });
  return (await proc.exited) === 0;
}

interface Row {
  name: string;
  defect: boolean;
  passed: boolean;
  ok: boolean;
  why: string;
}

const rows: Row[] = [];
const controlDir = fresh();
const control = await suitePasses(controlDir);
rmSync(controlDir, { recursive: true, force: true });

for (const d of DEFECTS) {
  const dir = fresh();
  const path = join(dir, d.file);
  const text = readFileSync(path, "utf8");
  if (text.split(d.from).length !== 2) throw new Error(d.name + ": the edit target is not unique in " + d.file);
  writeFileSync(path, text.replace(d.from, d.to));
  const passed = await suitePasses(dir);
  rmSync(dir, { recursive: true, force: true });
  rows.push({ name: d.name, defect: true, passed, ok: !passed, why: d.why });
  rows.push({ name: d.name + "-control", defect: false, passed: control, ok: control, why: "unedited tree" });
}

for (const r of rows) {
  const want = r.defect ? "must fail" : "must pass";
  const got = r.passed ? "pass" : "fail";
  console.log(r.name + " [" + (r.defect ? "defect" : "control") + "]: " + got + " (" + want + ") " + (r.ok ? "ok" : "MISMATCH") + " · " + r.why);
}
process.exit(rows.every((r) => r.ok) ? 0 : 1);
