// Judge one acceptance target (a gallery section or a defect mutant) on all four geometric and interaction gates.
// The screen is booted in-process, so the mirror tree and node geometry are available to every gate.
import { compatStats } from "../../../src/index.ts";
import { rootMirror } from "../../../src/internal/pocket.ts";
import { type SectionName } from "../../../test/fixtures/shadcn-gallery/layout.ts";
import { checkAlignment, type AlignmentReport } from "./alignment.ts";
import { DRIVERS } from "./drivers.ts";
import { type Box, geometryFor, type Geometry, isText, walk } from "./geometry.ts";
import { checkRun, type LegibilityResult } from "./legibility.ts";
import { checkOverflow, type OverflowReport } from "./overflow.ts";
import { runDriver, settle, type Verdict } from "./interaction.ts";
import { bootTarget, disposeTarget, MUTANT_COMPONENT, type Target, targetName } from "./screen.ts";
import type { NodeMirror } from "../../../src/internal/pocket.ts";
import type { Core } from "../../../test/harness.ts";

export interface LegibilityReport {
  icons: number;
  judged: number;
  fails: LegibilityResult[];
  unresolved: number;
  worst: number;
}

export interface TargetGates {
  target: string;
  channel: "overlay" | "stock";
  g1: LegibilityReport;
  g2: OverflowReport;
  g3: AlignmentReport;
  g4: Verdict;
  /** Distinct text the core drew (captureTexts), in draw order. */
  drawn: string[];
  unsupported: Record<string, number>;
  classMiss: number;
}

/** Gate 1 over every text run on the screen: each run's host box comes from the mirror, in draw order. */
export function judgeLegibility(core: Core, root: NodeMirror, geo: Geometry, inside?: Box): LegibilityReport {
  core.render();
  const within = (r: Box) => {
    if (!inside) return true;
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    return cx >= inside.x && cx < inside.x + inside.w && cy >= inside.y && cy < inside.y + inside.h;
  };
  // One-character runs are icon glyphs on this runtime (ASCII placeholders), judged apart from text.
  const all = core.texts().filter((r) => r.text.trim() !== "" && within(r));
  const runs = all.filter((r) => r.text.trim().length >= 2);
  const icons = all.length - runs.length;
  const hosts: { text: string; host: NodeMirror | undefined }[] = [];
  walk(root, (n) => {
    if (isText(n)) hosts.push({ text: (n as unknown as { text: string }).text, host: n.parent ?? undefined });
  });
  const used = new Set<number>();
  const px = { pixel: (x: number, y: number) => core.pixel(x, y) };
  const results: LegibilityResult[] = runs.map((run) => {
    const i = hosts.findIndex((h, k) => !used.has(k) && h.text === run.text);
    let host: Box | null = null;
    if (i >= 0) {
      used.add(i);
      const h = hosts[i].host;
      host = h ? geo.rect(h) : null;
    }
    return checkRun(px, { text: run.text, rect: run, host });
  });
  const fails = results.filter((r) => r.status === "fail");
  return {
    icons,
    judged: results.filter((r) => r.status !== "unresolved").length,
    fails,
    unresolved: results.filter((r) => r.status === "unresolved").length,
    worst: results.reduce((m, r) => (r.status === "unresolved" ? m : Math.min(m, r.ratio || Infinity)), Infinity),
  };
}

/** Boot one target, judge gates 1 to 4, dispose. Gate 4 presses the trigger, so it runs last. */
export async function judgeTarget(t: Target): Promise<TargetGates> {
  const b = await bootTarget(t);
  try {
    const geo = geometryFor(b.core);
    settle(b.core);
    const g1 = judgeLegibility(b.core, rootMirror, geo);
    const g2 = checkOverflow(rootMirror, geo);
    const g3 = checkAlignment(rootMirror, geo);
    const name = t.kind === "mutant" ? MUTANT_COMPONENT(t.name) : t.name;
    const g4 = runDriver(b.core, rootMirror, geo, DRIVERS[name as SectionName] ?? { kind: "unresolved", reason: "no driver entry" });
    const s = compatStats();
    const drawn = [...new Set(b.core.texts().map((r) => r.text))];
    return { target: targetName(t), channel: geo.channel, g1, g2, g3, g4, drawn, unsupported: s.unsupported, classMiss: s.classMiss.tokens };
  } finally {
    disposeTarget(b);
  }
}

/** One line per target: the verdict of each gate. */
export function summarize(g: TargetGates): string {
  const g1 = g.g1.fails.length
    ? "fail(" + g.g1.fails.length + ")"
    : g.g1.judged === 0
      ? "n/a"
      : g.g1.unresolved
        ? "pass(" + g.g1.unresolved + " unresolved)"
        : "pass";
  const g2 = g.g2.findings.length ? "fail(" + g.g2.findings.length + ")" : g.g2.partial.length ? "partial(" + g.g2.partial.length + ")" : "pass";
  const g3 = g.g3.fails.length ? "fail(" + g.g3.fails.length + ")" : g.g3.rows.length ? "pass" : "n/a";
  return g.target + ": G1 " + g1 + " \u00b7 G2 " + g2 + " \u00b7 G3 " + g3 + " \u00b7 G4 " + g.g4.status + " [" + g.channel + "]";
}
