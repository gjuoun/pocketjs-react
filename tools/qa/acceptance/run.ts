// Acceptance runner: gates 1 to 4 for one component, a list, or all 61 sections, plus the four mutants.
//   bun tools/qa/acceptance/run.ts --component button          one line, exit 0
//   bun tools/qa/acceptance/run.ts --all [--mutants]           every section (and the mutants), gates.json written
// The output is written to /tmp/pocketjs-react-qa/acceptance/. The channel (overlay or stock) is printed on each line.
import { mkdirSync, writeFileSync } from "node:fs";
import { SECTIONS } from "../../../test/fixtures/shadcn-gallery/layout.ts";
import { MUTANTS } from "../../../test/fixtures/acceptance-defects/mutants.tsx";
import { judgeTarget, summarize, type TargetGates } from "./gates.ts";
import type { Target } from "./screen.ts";

const OUT = "/tmp/pocketjs-react-qa/acceptance";
const arg = (flag: string) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

async function main(): Promise<number> {
  mkdirSync(OUT, { recursive: true });
  if (arg("--page") === "gallery") {
    const { judgePage } = await import("./page.ts");
    const page = await judgePage();
    const judged = page.sections.filter((s) => s.judged);
    const g1 = judged.reduce((n, s) => n + (s.g1?.fails.length ?? 0), 0);
    const g2 = judged.filter((s) => s.g2 && s.g2.findings.length).length;
    const g3 = judged.reduce((n, s) => n + (s.g3?.fails.length ?? 0), 0);
    writeFileSync(OUT + "/gallery-" + page.channel + ".json", JSON.stringify(page, null, 2));
    console.log("gallery: " + judged.length + "/" + page.sections.length + " sections judged at " + page.snaps + " snaps [" + page.channel + "] \u00b7 G1 fail " + g1 + " \u00b7 G2 sections failing " + g2 + " \u00b7 G3 fail " + g3);
    return 0;
  }
  const targets: Target[] = [];
  const one = arg("--component");
  if (one) targets.push(one in MUTANTS ? { kind: "mutant", name: one } : { kind: "section", name: one });
  if (process.argv.includes("--all")) for (const s of SECTIONS) targets.push({ kind: "section", name: s.name });
  if (process.argv.includes("--mutants") || process.argv.includes("--all"))
    for (const m of Object.keys(MUTANTS)) targets.push({ kind: "mutant", name: m });
  if (targets.length === 0) {
    console.error("usage: run.ts --component <name> | --all [--mutants]");
    return 2;
  }
  const rows: TargetGates[] = [];
  for (const t of targets) {
    const g = await judgeTarget(t);
    rows.push(g);
    console.log(summarize(g));
  }
  if (targets.length > 1 || process.argv.includes("--all")) {
    const file = OUT + "/gates.json";
    writeFileSync(file, JSON.stringify({ generated: new Date().toISOString(), rows }, null, 2));
    console.log("gates: " + file + " (" + rows.length + " targets)");
  } else {
    writeFileSync(OUT + "/" + one + ".json", JSON.stringify(rows[0], null, 2));
  }
  return 0;
}

process.exit(await main());
