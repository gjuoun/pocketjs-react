// Judge one acceptance target (a gallery section or a defect mutant) on all four geometric and interaction gates.
// The screen is booted in-process, so the mirror tree and node geometry are available to every gate.
import { compatStats } from "../../../src/index.ts";
import { rootMirror } from "../../../src/internal/pocket.ts";
import { type SectionName } from "../../../test/fixtures/shadcn-gallery/layout.ts";
import { checkAlignment, type AlignmentReport } from "./alignment.ts";
import { DRIVERS } from "./drivers.ts";
import { geometryFor, type Geometry, isText, walk } from "./geometry.ts";
import { type Box, type Candidate, checkRun, type LegibilityResult, SCREEN_H, SCREEN_W } from "./legibility.ts";
import { checkOverflow, type OverflowReport } from "./overflow.ts";
import { runDriver, settle, type Verdict } from "./interaction.ts";
import { bootTarget, disposeTarget, MUTANT_COMPONENT, type Target, targetName } from "./screen.ts";
import type { NodeMirror } from "../../../src/internal/pocket.ts";
import type { Core } from "../../../test/harness.ts";

export interface LegibilityReport {
  /** One-character runs (icon placeholders): counted, judged apart from text. */
  icons: number;
  /** Text runs judged to a verdict: a pass, or a contrast fail. */
  judged: number;
  /** Every failing run: a contrast fail, a no-ink fail, and each could-not-judge run. */
  fails: LegibilityResult[];
  /** Runs that failed because the gate could not judge them, by cause (no third state: each one is in fails). */
  cannotJudge: number;
  causes: Record<string, number>;
  /** How each text run's backdrop was chosen, for every run judged or not. */
  backdrops: Record<string, number>;
  cannotJudgeRuns: Array<LegibilityResult & { rect: Box }>;
  worst: number;
}

/** The surroundings searched for a run's backdrop before its enclosing boxes (px). */
const RING = 3;

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

/** Gate 1 over every text run on the screen. Hosts are looked up in the whole mirror, so a layer outside the page (a toast)
 *  finds its own text. The backdrop of a run is the nearest box, climbing from its text host, that is at least twice the run's
 *  area: a text box is its own ink, so it never stands for the background. A run with no text host is placed in the deepest
 *  element that contains it. */
export function judgeLegibility(core: Core, geo: Geometry, inside?: Box): LegibilityReport {
  core.render();
  const within = (r: Box) => {
    if (!inside) return true;
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    return cx >= inside.x && cx < inside.x + inside.w && cy >= inside.y && cy < inside.y + inside.h;
  };
  // One-character runs are icon glyphs on this runtime (ASCII placeholders). They are judged like text (same rules, same
  // report); `icons` counts them so the report can say how many were glyphs.
  const runs = core.texts().filter((r) => r.text.trim() !== "" && within(r));
  const icons = runs.filter((r) => r.text.trim().length === 1).length;
  const elements: Array<{ node: NodeMirror; rect: Box | null }> = [];
  const chainOf = new Map<NodeMirror, NodeMirror[]>();
  const texts: Array<{ text: string; host: NodeMirror | undefined }> = [];
  walk(rootMirror, (n, anc) => {
    if (isText(n)) {
      texts.push({ text: (n as unknown as { text: string }).text, host: n.parent ?? undefined });
      return;
    }
    chainOf.set(n, [...anc].reverse());
    elements.push({ node: n, rect: geo.rect(n) });
  });
  const rects = new Map<NodeMirror, Box | null>(elements.map((e) => [e.node, e.rect]));
  const screen: Box = { x: 0, y: 0, w: SCREEN_W, h: SCREEN_H };
  const used = new Set<number>();
  const px = { pixel: (x: number, y: number) => core.pixel(x, y) };
  // Every drawn text run (icons and runs outside the page included): its pixels are ink, never backdrop.
  const allRuns = core.texts().filter((r) => r.text.trim() !== "").map((r) => ({ x: r.x, y: r.y, w: r.w, h: r.h }));
  const results = runs.map((run) => {
    const runArea = run.w * run.h;
    const i = texts.findIndex((t, k) => !used.has(k) && t.text === run.text);
    let chain: NodeMirror[] = [];
    let matched = false;
    if (i >= 0) {
      used.add(i);
      const h = texts[i].host;
      if (h) chain = [h, ...(chainOf.get(h) ?? [])];
      matched = true;
    } else {
      const holders = elements
        .filter((e) => e.rect && e.rect.x <= run.x && e.rect.y <= run.y && e.rect.x + e.rect.w >= run.x + run.w && e.rect.y + e.rect.h >= run.y + run.h)
        .sort((a, b) => a.rect!.w * a.rect!.h - b.rect!.w * b.rect!.h);
      if (holders[0]) chain = [holders[0].node, ...(chainOf.get(holders[0].node) ?? [])];
    }
    // Candidates, nearest first: the run's own surroundings (3 px all round, text masked out), then each enclosing box at
    // least twice the run's area, then the screen. A run beside a sibling panel is judged on the page it sits on, not the panel.
    const candidates: Candidate[] = [{ box: { x: run.x - RING, y: run.y - RING, w: run.w + 2 * RING, h: run.h + 2 * RING }, how: "ring " + RING + " px around the run" }];
    for (let k = 0; k < chain.length; k++) {
      const r = rects.get(chain[k]);
      if (!r || r.w * r.h < 2 * runArea) continue;
      const step = k === 0 ? "" : " +" + k;
      candidates.push({ box: r, how: matched ? (k === 0 ? "text host" : "ancestor" + step) : "containing box" + step + " (no text mirror matches the run)" });
    }
    candidates.push({ box: screen, how: "screen" });
    return { ...checkRun(px, { text: run.text, rect: run, candidates, mask: allRuns }), rect: run };
  });
  const cannot = results.filter((r) => r.cannotJudge);
  const causes: Record<string, number> = {};
  for (const r of cannot) causes[r.cannotJudge!] = (causes[r.cannotJudge!] ?? 0) + 1;
  const backdrops: Record<string, number> = {};
  for (const r of results) backdrops[r.attribution ?? ""] = (backdrops[r.attribution ?? ""] ?? 0) + 1;
  return {
    icons,
    judged: results.length - cannot.length,
    fails: results.filter((r) => r.status === "fail"),
    cannotJudge: cannot.length,
    causes,
    backdrops,
    cannotJudgeRuns: cannot,
    worst: results.reduce((m, r) => (r.cannotJudge ? m : Math.min(m, r.ratio || Infinity)), Infinity),
  };
}

/** Boot one target, judge gates 1 to 4, dispose. Gate 4 presses the trigger, so it runs last. */
export async function judgeTarget(t: Target): Promise<TargetGates> {
  const b = await bootTarget(t);
  try {
    const geo = geometryFor(b.core);
    settle(b.core);
    const g1 = judgeLegibility(b.core, geo);
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
      : "pass";
  const g2 = g.g2.findings.length ? "fail(" + g.g2.findings.length + ")" : g.g2.partial.length ? "partial(" + g.g2.partial.length + ")" : "pass";
  const g3 = g.g3.fails.length ? "fail(" + g.g3.fails.length + ")" : g.g3.rows.length ? "pass" : "n/a";
  return g.target + ": G1 " + g1 + " \u00b7 G2 " + g2 + " \u00b7 G3 " + g3 + " \u00b7 G4 " + g.g4.status + " [" + g.channel + "]";
}
