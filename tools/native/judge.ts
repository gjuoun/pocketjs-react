// The native judge, on the overlay core only (POCKETJS_CORE_ROOT must be set; stock geometry is not evidence).
//   bun tools/native/judge.ts --page       gates 1-4 for every gallery page, plus a text-fit check (pages from names.ts)
//   bun tools/native/judge.ts --mutants    each defect must fail its gate; each control must pass it
// Gates come unchanged from tools/qa/acceptance; this file only boots the native entries and drives them.
import { mkdirSync, writeFileSync } from "node:fs";
import { relative, resolve, join, sep } from "node:path";
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
import { PAGE_DRIVERS, PAGE_REJUDGE } from "./drivers.ts";
import { PAGE_NAMES } from "../../test/native/gallery/names.ts";
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

/** The gallery pages in mirror order: page-N debugNames, N from 1. */
function pageNodes(root: NodeMirror): Array<{ index: number; node: NodeMirror }> {
  const out: Array<{ index: number; node: NodeMirror }> = [];
  walk(root, (n) => {
    const m = /^page-(\d+)$/.exec(n.debugName ?? "");
    if (m) out.push({ index: Number(m[1]), node: n });
  });
  return out.sort((a, b) => a.index - b.index);
}

/** The page name, read back from its drawn title ("NN/MM Name"). */
function titleName(page: NodeMirror): string {
  let title = "";
  walk(page, (n) => {
    if (!title && isText(n)) title = (n as unknown as { text: string }).text;
  });
  return title.replace(/^\d+\/\d+\s+/, "");
}

interface PageRow {
  page: number;
  name: string;
  g1: LegibilityReport;
  g2: OverflowReport;
  g3: AlignmentReport;
  g4: Verdict[];
  fit: { runs: number; outside: string[] };
  /** Gates 1-3 again after a driver that changes the page state (pages in REJUDGE only). */
  after: Array<{ trigger: string; g1: LegibilityReport; g2: OverflowReport; g3: AlignmentReport }>;
}

async function judgePages() {
  const entry = resolve(ROOT, "test/native/gallery/main.tsx");
  const built = await build(entry, { outdir: OUT, name: "native-gallery" });
  const styles = compileClasses(built.literals);
  const core = await bootCore({ classes: built.literals, fontSlots: built.fontSlots });
  installBuildStyles(styles.ids, styles.bin, built.tokens);
  await import(entry);
  core.step(0); core.step(0); core.render();
  const geo = geometryFor(core);
  resetCompatStats();
  const pages = pageNodes(rootMirror);
  if (pages.length !== PAGE_NAMES.length) throw new Error("judge: " + pages.length + " pages in the mirror, names.ts lists " + PAGE_NAMES.length);
  const rows: PageRow[] = [];
  for (let i = 0; i < pages.length; i++) {
    if (i > 0) core.press(BTN.RTRIGGER);
    settle(core);
    const { index, node: page } = pages[i];
    const name = titleName(page);
    if (name !== PAGE_NAMES[i]) throw new Error("judge: page " + index + " is titled " + JSON.stringify(name) + ", names.ts says " + JSON.stringify(PAGE_NAMES[i]));
    const box = geo.rect(page) ?? undefined;
    const g1 = judgeLegibility(core, page, geo, box);
    const g2 = checkOverflow(page, geo);
    const g3 = checkAlignment(page, geo);
    const fit = textFit(core, page, geo);
    const g4: Verdict[] = [];
    const after: PageRow["after"] = [];
    for (const d of PAGE_DRIVERS[index] ?? []) {
      const v = runDriver(core, rootMirror, geo, d);
      g4.push(v);
      if (PAGE_REJUDGE[index] && v.status === "pass") {
        settle(core);
        const b = geo.rect(page) ?? undefined;
        after.push({ trigger: d.kind === "driven" ? d.trigger : "", g1: judgeLegibility(core, page, geo, b), g2: checkOverflow(page, geo), g3: checkAlignment(page, geo) });
      }
      core.press(BTN.CROSS, 2);
      settle(core);
    }
    rows.push({ page: index, name, g1, g2, g3, g4, fit, after });
  }
  const s = compatStats();
  core.dispose();
  return { channel: geo.channel, rows, compat: { unsupported: s.unsupported, classMiss: s.classMiss.tokens, tokenMap: s.tokenMap } };
}

function pageLine(channel: string, r: PageRow): string {
  const g4 = r.g4.length ? r.g4.map((v) => v.status).join("/") : "n/a";
  const after = r.after.map((a) => " · after " + JSON.stringify(a.trigger) + ": G1 fails " + a.g1.fails.length + " · G2 findings " + a.g2.findings.length + " · G3 fails " + a.g3.fails.length).join("");
  return r.page + " " + r.name + " [" + channel + "]: G1 fails " + r.g1.fails.length + " · G2 findings " + r.g2.findings.length + " · G3 fails " + r.g3.fails.length + " · G4 " + g4 + " · text-fit outside " + r.fit.outside.length + "/" + r.fit.runs + after;
}

async function judgeMutants() {
  const rel = relative(OUT, join(ROOT, "test/native/mutants.tsx")).split(sep).join("/");
  const mutantsImport = rel.startsWith(".") ? rel : "./" + rel;
  const rows: Array<{ name: string; defect: boolean; gate: string; fails: boolean; expected: boolean; ok: boolean }> = [];
  mkdirSync(OUT, { recursive: true });
  for (const name of Object.keys(MUTANTS)) {
    const m = MUTANTS[name];
    const entry = join(OUT, "mutant-" + name + ".tsx");
    writeFileSync(entry, [
      "import { mount } from " + JSON.stringify(ROOT + "/src/index.ts") + ";",
      // Relative, not absolute: the build scan follows relative imports only, so the mutant bodies' classes are collected.
      "import { MUTANTS } from " + JSON.stringify(mutantsImport) + ";",
      "export const unmount = mount(MUTANTS[" + JSON.stringify(name) + "].render() as never, { compat: { classMiss: \"throw\", tokenMap: false } });",
      "",
    ].join("\n"));
    const built = await build(entry, { outdir: OUT, name: "mutant-" + name });
    const styles = compileClasses(built.literals);
    const core = await bootCore({ classes: built.literals, fontSlots: built.fontSlots });
    installBuildStyles(styles.ids, styles.bin, built.tokens);
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
  const failing = out.rows.some((r) => r.g1.fails.length || r.g2.findings.length || r.g3.fails.length || r.g4.some((v) => v.status === "fail") || r.after.some((a) => a.g1.fails.length || a.g2.findings.length || a.g3.fails.length));
  return failing ? 1 : 0;
}

process.exit(await main());
