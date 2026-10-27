// The native judge, on the overlay core only (POCKETJS_CORE_ROOT must be set; stock geometry is not evidence).
//   bun tools/native/judge.ts --page       gates 1-4 for the five gallery pages, plus a text-fit check
//   bun tools/native/judge.ts --mutants    each defect must fail its gate; each control must pass it
// Gates come unchanged from tools/qa/acceptance; this file only boots the native entries and drives them.
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { BTN } from "@pocketjs/framework/input";
import { rootMirror, type NodeMirror } from "../../src/internal/pocket.ts";
import { compatStats, resetCompatStats } from "../../src/index.ts";
import { compileClasses } from "../../src/internal/pocket-build.ts";
import { installBuildStyles } from "../../src/style/build-styles.ts";
import { bootCore, type Core } from "../../test/harness.ts";
import { build } from "../build.ts";
import { geometryFor, isText, walk, type Geometry } from "../qa/acceptance/geometry.ts";
import { judgeLegibility, type LegibilityReport } from "../qa/acceptance/gates.ts";
import { checkOverflow, type OverflowReport } from "../qa/acceptance/overflow.ts";
import { checkAlignment, type AlignmentReport } from "../qa/acceptance/alignment.ts";
import { runDriver, settle, type Verdict } from "../qa/acceptance/interaction.ts";
import { PAGE_DRIVERS } from "./drivers.ts";
import { MUTANTS } from "../../test/native/mutants.tsx";

const ROOT = resolve(import.meta.dir, "../..");
const OUT = join(ROOT, "dist/native-judge");
const QA = "/tmp/pocketjs-react-qa/native";

function find(root: NodeMirror, debugName: string): NodeMirror | undefined {
  if (root.debugName === debugName) return root;
  for (const k of root.children) { const f = find(k, debugName); if (f) return f; }
  return undefined;
}

/** Text-fit: every drawn run of a text node sits inside its host box (reported beside the gates, not a gate). */
function textFit(core: Core, root: NodeMirror, geo: Geometry): { runs: number; outside: string[] } {
  const runs = core.texts();
  const used = new Set<number>();
  const outside: string[] = [];
  let n = 0;
  walk(root, (node) => {
    if (!isText(node)) return;
    const text = (node as unknown as { text: string }).text;
    const host = node.parent ?? undefined;
    const hr = host ? geo.rect(host) : null;
    const i = runs.findIndex((r, k) => !used.has(k) && r.text === text);
    if (i < 0) return;
    used.add(i);
    n++;
    const r = runs[i];
    if (!hr) return;
    if (r.x < hr.x || r.x + r.w > hr.x + hr.w || r.y < hr.y || r.y + r.h > hr.y + hr.h) outside.push(text);
  });
  return { runs: n, outside };
}

async function judgePages() {
  const entry = resolve(ROOT, "test/native/gallery/main.tsx");
  const built = await build(entry, { outdir: OUT, name: "native-gallery" });
  const core = await bootCore({ classes: built.tokens, fontSlots: built.fontSlots });
  installBuildStyles({}, compileClasses([]).bin, built.tokens);
  await import(entry);
  core.step(0); core.step(0); core.render();
  const geo = geometryFor(core);
  resetCompatStats();
  const rows: Array<{ page: number; g1: LegibilityReport; g2: OverflowReport; g3: AlignmentReport; g4: Verdict[]; fit: { runs: number; outside: string[] } }> = [];
  for (let i = 0; i < 5; i++) {
    if (i > 0) core.press(BTN.RTRIGGER);
    settle(core);
    const page = find(rootMirror, "page-" + (i + 1));
    if (!page) throw new Error("page-" + (i + 1) + " not in the mirror tree");
    const box = geo.rect(page) ?? undefined;
    const g1 = judgeLegibility(core, page, geo, box);
    const g2 = checkOverflow(page, geo);
    const g3 = checkAlignment(page, geo);
    const fit = textFit(core, page, geo);
    const g4: Verdict[] = [];
    for (const d of PAGE_DRIVERS[i + 1] ?? []) {
      g4.push(runDriver(core, rootMirror, geo, d));
      core.press(BTN.CROSS, 2);
      settle(core);
    }
    rows.push({ page: i + 1, g1, g2, g3, g4, fit });
  }
  const s = compatStats();
  core.dispose();
  return { channel: geo.channel, rows, compat: { unsupported: s.unsupported, classMiss: s.classMiss.tokens, tokenMap: s.tokenMap } };
}

const NAMES = ["Button", "Input", "Card", "Dialog", "Tabs"];
function pageLine(channel: string, r: { page: number; g1: LegibilityReport; g2: OverflowReport; g3: AlignmentReport; g4: Verdict[]; fit: { runs: number; outside: string[] } }): string {
  const g4 = r.g4.length ? r.g4.map((v) => v.status).join("/") : "n/a";
  return r.page + " " + NAMES[r.page - 1] + " [" + channel + "]: G1 fails " + r.g1.fails.length + " · G2 findings " + r.g2.findings.length + " · G3 fails " + r.g3.fails.length + " · G4 " + g4 + " · text-fit outside " + r.fit.outside.length + "/" + r.fit.runs;
}

async function judgeMutants() {
  const rows: Array<{ name: string; defect: boolean; gate: string; fails: boolean; expected: boolean; ok: boolean }> = [];
  mkdirSync(OUT, { recursive: true });
  for (const name of Object.keys(MUTANTS)) {
    const m = MUTANTS[name];
    const entry = join(OUT, "mutant-" + name + ".tsx");
    writeFileSync(entry, [
      "import { mount } from " + JSON.stringify(ROOT + "/src/index.ts") + ";",
      "import { MUTANTS } from " + JSON.stringify(ROOT + "/test/native/mutants.tsx") + ";",
      "export const unmount = mount(MUTANTS[" + JSON.stringify(name) + "].render() as never, { compat: { classMiss: \"throw\", tokenMap: false } });",
      "",
    ].join("\n"));
    const built = await build(entry, { outdir: OUT, name: "mutant-" + name });
    const core = await bootCore({ classes: built.tokens, fontSlots: built.fontSlots });
    installBuildStyles({}, compileClasses([]).bin, built.tokens);
    const mod = (await import(entry)) as { unmount: () => void };
    core.step(0); core.step(0); core.render();
    const geo = geometryFor(core);
    settle(core);
    let fails = false;
    if (m.gate === "G1") fails = judgeLegibility(core, rootMirror, geo).fails.length > 0;
    if (m.gate === "G2") fails = checkOverflow(rootMirror, geo).findings.length > 0;
    if (m.gate === "G3") fails = checkAlignment(rootMirror, geo).fails.length > 0;
    if (m.gate === "G4") fails = m.driver ? runDriver(core, rootMirror, geo, m.driver).status === "fail" : false;
    rows.push({ name, defect: m.defect, gate: m.gate, fails, expected: m.defect, ok: fails === m.defect });
    console.log(name + " [" + geo.channel + "]: " + m.gate + " " + (fails ? "fail" : "pass") + (m.defect ? " (defect, must fail)" : " (control, must pass)") + (fails === m.defect ? " ok" : " MISMATCH"));
    try { mod.unmount(); } catch {}
    core.dispose();
  }
  return rows;
}

async function main(): Promise<number> {
  if (!process.env.POCKETJS_CORE_ROOT) { console.error("judge: set POCKETJS_CORE_ROOT to the overlay core (stock geometry is not evidence)"); return 2; }
  mkdirSync(QA, { recursive: true });
  if (process.argv.includes("--mutants")) {
    const rows = await judgeMutants();
    writeFileSync(QA + "/mutants.json", JSON.stringify(rows, null, 2));
    const bad = rows.filter((r) => !r.ok).length;
    console.log("mutants: " + rows.length + " targets, " + bad + " mismatch");
    return bad === 0 ? 0 : 1;
  }
  const out = await judgePages();
  for (const r of out.rows) console.log(pageLine(out.channel, r));
  console.log("compat: unsupported " + JSON.stringify(out.compat.unsupported) + " · classMiss " + out.compat.classMiss + " · tokenMap " + JSON.stringify(out.compat.tokenMap));
  writeFileSync(QA + "/gates.json", JSON.stringify(out, null, 2));
  if (out.channel !== "overlay") { console.error("judge: channel is " + out.channel + ", not overlay"); return 2; }
  const failing = out.rows.some((r) => r.g1.fails.length || r.g2.findings.length || r.g3.fails.length || r.g4.some((v) => v.status === "fail"));
  return failing ? 1 : 0;
}

process.exit(await main());
