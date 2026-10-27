// Red then green for the four defect classes. Each mutant must fail its designated gate, and the real section it
// replaces must pass the same gate. The overflow class is judged on the overlay channel only: the stock channel
// can not see overflow past the screen edge, so a stock run reports the class as partial, and that is a fail here.
//   bun run qa:defects  (exit 0 only when all four pairs hold)
import { MUTANTS } from "../../../test/fixtures/acceptance-defects/mutants.tsx";
import { judgeTarget, type TargetGates } from "./gates.ts";

type Gate = "G1" | "G2" | "G4";
const DESIGNATED: Record<string, Gate> = {
  "white-button": "G1",
  "zero-size-badge": "G2",
  "overflow-carousel": "G2",
  "empty-sheet": "G4",
};

/** Red: the designated gate fails on the target; evidence is the first failing item. */
function red(gate: Gate, g: TargetGates): { ok: boolean; evidence: string } {
  if (gate === "G1") {
    const f = g.g1.fails[0];
    return { ok: g.g1.fails.length > 0, evidence: f ? JSON.stringify(f.text) + " " + (f.reason ?? "") : "no failing run" };
  }
  if (gate === "G2") {
    const f = g.g2.findings[0];
    if (g.channel !== "overlay" && g.g2.partial.length > 0 && g.g2.findings.length === 0)
      return { ok: false, evidence: "stock channel: " + g.g2.partial.length + " node(s) partial, not a fail" };
    return { ok: g.g2.findings.length > 0, evidence: f ? f.gate + " " + f.node + " " + f.detail : "no finding" };
  }
  return { ok: g.g4.status === "fail", evidence: g.g4.reason };
}

/** Green: the same gate passes on the real section. */
function green(gate: Gate, g: TargetGates): { ok: boolean; evidence: string } {
  if (gate === "G1") return { ok: g.g1.fails.length === 0, evidence: g.g1.judged + " runs judged, 0 fail" };
  if (gate === "G2") {
    if (g.channel !== "overlay") return { ok: false, evidence: "stock channel only; the green needs the overlay channel" };
    return { ok: g.g2.findings.length === 0, evidence: g.g2.checked + " nodes checked, " + g.g2.findings.length + " finding(s)" };
  }
  return { ok: g.g4.status === "pass", evidence: g.g4.metric ?? g.g4.status };
}

async function main(): Promise<number> {
  let allOk = true;
  for (const name of Object.keys(DESIGNATED)) {
    const gate = DESIGNATED[name];
    const m = MUTANTS[name];
    const r = red(gate, await judgeTarget({ kind: "mutant", name }));
    const g = green(gate, await judgeTarget({ kind: "section", name: m.component }));
    const control = name === "overflow-carousel" ? await judgeTarget({ kind: "mutant", name: "overflow-carousel-fixed" }) : null;
    const c = control ? green(gate, control) : null;
    allOk &&= r.ok && g.ok && (c ? c.ok : true);
    console.log(
      name + " (" + m.defect + "): " + (r.ok ? "red" : "NOT RED") + " on " + gate + " (" + r.evidence + ") \u00b7 " +
        (g.ok ? "green" : "NOT GREEN") + " on " + m.component + " (" + g.evidence + ")" +
        (c ? " \u00b7 " + (c.ok ? "control green" : "control NOT GREEN") + " (" + c.evidence + ")" : ""),
    );
  }
  console.log(allOk ? "defects: 4/4 red then green" : "defects: a pair did not hold");
  return allOk ? 0 : 1;
}

process.exit(await main());
