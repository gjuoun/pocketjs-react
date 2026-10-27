// Report: visual-parity.md from the gate run (gates.json) and the structure expectations. Classification per
// section, from structure only (no pixel reference; see the header of the report):
//   缺失  an expected static text is not drawn, or is drawn with no ink
//   偏差  everything expected is drawn, but a gate finds contrast, overflow or alignment trouble
//   未比对 the section has no static text to compare
//   一致  everything expected is drawn with ink, and no gate finds trouble
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { execSync } from "node:child_process";
import { expectedTexts } from "../parity/structure.ts";
import type { TargetGates } from "./gates.ts";

const ROOT = join(import.meta.dir, "../../..");
const GATES = "/tmp/pocketjs-react-qa/acceptance/gates.json";
const DEFECTS = "/tmp/pocketjs-react-qa-defects.log";
const OUT = process.env.QA_REPORT_OUT ?? join(ROOT, "dist/qa/visual-parity.md");
const FENCE = "~~~";

export type Verdict = "一致" | "偏差" | "缺失" | "未比对";

/** Components whose content sits in a closed overlay or a collapsed item in the default state: text not drawn there is not compared. */
const CLOSED = new Set(["accordion", "alert-dialog", "collapsible", "command", "context-menu", "dialog", "drawer", "dropdown-menu", "hover-card", "menubar", "navigation-menu", "popover", "select", "sheet", "tabs", "tooltip"]);

export function classify(g: TargetGates, expected: string[]): { verdict: Verdict; missing: string[]; trouble: string[] } {
  const drawn = new Set(g.drawn);
  const inkless = new Set(g.g1.fails.filter((f) => f.reason?.includes("no ink")).map((f) => f.text));
  const notDrawn = expected.filter((t) => !drawn.has(t));
  const closed = CLOSED.has(g.target) ? notDrawn : [];
  const missing = expected.filter((t) => (!drawn.has(t) && !closed.includes(t)) || inkless.has(t));
  if (closed.length && missing.length === 0 && expected.length === closed.length) return { verdict: "未比对", missing: [], trouble: ["closed overlay or collapsed content in the default state: " + closed.length + " text(s) not compared"] };
  const trouble: string[] = [];
  for (const f of g.g1.fails) if (!f.reason?.includes("no ink")) trouble.push("G1 " + JSON.stringify(f.text) + " " + f.ratio + ":1");
  for (const f of g.g2.findings) trouble.push("G2 " + f.gate + " " + f.node + " " + f.overshoot + "px");
  for (const r of g.g3.fails) trouble.push("G3 row " + r.row + " spread " + r.spread);
  if (expected.length === 0) return { verdict: "未比对", missing, trouble };
  if (missing.length) return { verdict: "缺失", missing, trouble };
  if (trouble.length) return { verdict: "偏差", missing, trouble };
  return { verdict: "一致", missing, trouble };
}

const gateCell = (g: TargetGates, k: "g1" | "g2" | "g3"): string => {
  if (k === "g1") return g.g1.fails.length ? "fail " + g.g1.fails.length : g.g1.judged ? "pass" : "n/a";
  if (k === "g2") return g.g2.findings.length ? "fail " + g.g2.findings.length : g.g2.partial.length ? "partial " + g.g2.partial.length : "pass";
  return g.g3.fails.length ? "fail " + g.g3.fails.length : g.g3.rows.length ? "pass" : "n/a";
};

const MUTANTS = new Set(["white-button", "zero-size-badge", "overflow-carousel", "empty-sheet", "overflow-carousel-fixed"]);

function main(): void {
  const data = JSON.parse(readFileSync(GATES, "utf8")) as { generated: string; rows: TargetGates[] };
  const comps = data.rows.filter((r) => !MUTANTS.has(r.target));
  const exp = expectedTexts();
  const rows = comps.map((g) => ({ g, c: classify(g, exp.get(g.target) ?? []) }));
  const count = (v: Verdict) => rows.filter((r) => r.c.verdict === v).length;
  const wasm = createHash("sha256").update(readFileSync(join(ROOT, "node_modules/@pocketjs/framework/hosts/web/pocketjs.wasm"))).digest("hex");
  const manifest = JSON.parse(readFileSync(join(ROOT, ".cache/core-overlay/7853cd83/MANIFEST.json"), "utf8"));
  const head = execSync("git rev-parse --short HEAD", { cwd: ROOT }).toString().trim();
  const channel = comps[0]?.channel ?? "unknown";
  const l: string[] = [];
  l.push("# Visual parity: PocketJS gallery acceptance");
  l.push("");
  l.push("Generated " + data.generated + " by tools/qa/acceptance/run.ts --all --mutants. Do not edit by hand.");
  l.push("");
  l.push("- Build: " + head + " (branch acceptance-rebuild)");
  l.push("- Geometry channel: " + channel + " (overlay = nodeRect, untrimmed box; stock = debugInspect, screen-clipped)");
  l.push("- Overlay core: ref " + String(manifest.ref).slice(0, 8) + ", wasm sha256 " + String(manifest.sha256).slice(0, 16) + "...");
  l.push("- Stock core wasm sha256: " + wasm.slice(0, 16) + "...");
  l.push("- **Gate 5 mode: structure-only, no pixel reference.** The offline install of the real React, Tailwind and Radix reference packages succeeded (114 packages), but the 61 section bodies import PocketJS-only APIs (useButton, mount, BTN, pocketjs-react/* shims) that need DOM stand-ins; this round did not build them. Descriptor tolerances are not calibrated.");
  l.push("");
  l.push("## Verdicts");
  l.push("");
  l.push("| 一致 | 偏差 | 缺失 | 未比对 | total |");
  l.push("| --- | --- | --- | --- | --- |");
  l.push("| " + count("一致") + " | " + count("偏差") + " | " + count("缺失") + " | " + count("未比对") + " | " + rows.length + " |");
  l.push("");
  l.push("## Gates across the components (" + channel + " channel)");
  l.push("");
  const gateRow = (k: "g1" | "g2" | "g3", label: string) => {
    const cells = comps.map((g) => gateCell(g, k));
    return "| " + label + " | " + cells.filter((c) => c === "pass").length + " | " + cells.filter((c) => c.startsWith("fail")).length + " | " + cells.filter((c) => c.startsWith("partial")).length + " | " + cells.filter((c) => c === "n/a").length + " |";
  };
  l.push("| gate | pass | fail | partial | n/a |");
  l.push("| --- | --- | --- | --- | --- |");
  l.push(gateRow("g1", "G1 legibility (3:1)"));
  l.push(gateRow("g2", "G2 overflow and zero-area"));
  l.push(gateRow("g3", "G3 alignment (1 px, centred rows)"));
  const g4 = comps.map((g) => g.g4.status);
  l.push("| G4 interaction (driven entries) | " + g4.filter((s) => s === "pass").length + " | " + g4.filter((s) => s === "fail").length + " | 0 | n/a " + g4.filter((s) => s === "n/a").length + ", unresolved " + g4.filter((s) => s === "unresolved").length + " |");
  l.push("");
  l.push("## Components");
  l.push("");
  l.push("| component | verdict | G1 | G2 | G3 | G4 | unsupported utilities | notes |");
  l.push("| --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const { g, c } of rows) {
    const uns = Object.entries(g.unsupported).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => k + "x" + v).join(" ") || "-";
    const parts = [...(c.missing.length ? ["missing " + JSON.stringify(c.missing.slice(0, 2))] : []), ...c.trouble.slice(0, 2)];
    l.push("| " + g.target + " | " + c.verdict + " | " + gateCell(g, "g1") + " | " + gateCell(g, "g2") + " | " + gateCell(g, "g3") + " | " + g.g4.status + " | " + uns + " | " + (parts.join("; ") || "-").replace(/\|/g, "/") + " |");
  }
  l.push("");
  l.push("## Defect proof (red then green)");
  l.push("");
  l.push("From tools/qa/acceptance/defects.ts (bun run qa:defects, last recorded run):");
  l.push("");
  l.push(FENCE + "text");
  try {
    l.push(...readFileSync(DEFECTS, "utf8").split("\n").filter((s) => s.includes(" on ") || s.startsWith("defects:")));
  } catch {
    l.push("(no defects run recorded)");
  }
  l.push(FENCE);
  l.push("");
  l.push("## Not compared");
  l.push("");
  const nc = rows.filter((r) => r.c.verdict === "未比对").map((r) => r.g.target);
  l.push("- 未比对 (no static text to compare): " + (nc.join(", ") || "none"));
  l.push("- G4 unresolved (interactive, no driver yet): " + comps.filter((g) => g.g4.status === "unresolved").length + " of " + comps.length + ". Only sheet is driven; the rest are in drivers.ts as unresolved with a reason.");
  l.push("- Gate 5 pixel comparison: not run (structure-only).");
  l.push("");
  l.push("## Work queue (fix first)");
  l.push("");
  const queue = rows.filter((r) => r.c.verdict === "缺失" || r.c.verdict === "偏差").sort((a, b) => b.c.missing.length - a.c.missing.length || b.c.trouble.length - a.c.trouble.length);
  queue.slice(0, 15).forEach((r, i) => l.push((i + 1) + ". " + r.g.target + " (" + r.c.verdict + "): " + (r.c.missing.length ? "text not visible " + JSON.stringify(r.c.missing.slice(0, 2)) : r.c.trouble.slice(0, 2).join("; "))));
  l.push("");
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, l.join("\n") + "\n");
  console.log("report: " + OUT + " (" + rows.length + " components: 一致 " + count("一致") + " 偏差 " + count("偏差") + " 缺失 " + count("缺失") + " 未比对 " + count("未比对") + ")");
}

main();
