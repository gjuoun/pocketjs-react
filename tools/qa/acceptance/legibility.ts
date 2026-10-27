// Gate 1, legibility: each text run's ink against the colour under it, WCAG contrast, minimum 3:1.
// The background is the dominant colour of the run's backdrop box (gates.ts picks it: the nearest enclosing
// box at least twice the run's area, so a text box never stands for its own background). A backdrop whose
// dominant colour covers less than 60% of it is mixed. There is no third state: a run the gate cannot judge
// (mixed backdrop, off-screen run) FAILS with reason "could not judge: ..." and its cause, so it never reads as neither.
//
// The ink floor. A run's ink is the colour, other than its backdrop, that covers at least a floor of pixels in the run's box;
// the best such colour's contrast is the run's contrast. The floor is 3 px for a run of text. It is 1 px for a ONE-CHARACTER
// run (an icon placeholder such as "?" or "+"), because a thin glyph can have only a few full-coverage pixels. That 1 px floor
// is accepted, with two guards: every run it judges is counted in floorRuns (the page report), and each run whose verdict
// would flip at the 3 px floor is listed in floorDecided. A run of tiny text therefore cannot pass unnoticed inside the floor.
export const SCREEN_W = 480;
export const SCREEN_H = 272;
export const MIN_CONTRAST = 3;
export const MIN_INK_PX = 3;
export const ONE_CHAR_INK_PX = 1;
const MIN_BG_SHARE = 0.6;

export interface Pixels {
  pixel(x: number, y: number): string;
}
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Candidate {
  box: Box;
  /** Where the box came from (written to gates.json): "text host", "ancestor +N", "containing box", "screen". */
  how: string;
}
export interface RunInput {
  text: string;
  rect: Box;
  /** Backdrop boxes to try, nearest first. The first one whose non-text pixels are at least 60% one colour is the backdrop. */
  candidates: Candidate[];
  /** Boxes whose pixels are text (every drawn run): excluded from the backdrop histogram so ink never counts as mixing. */
  mask?: Box[];
}
/** Why a run could not be judged. Every value is a FAIL. */
export type CannotJudge = "no backdrop" | "mixed background" | "run off screen";
export interface LegibilityResult {
  text: string;
  status: "pass" | "fail";
  ratio: number;
  reason?: string;
  cannotJudge?: CannotJudge;
  attribution?: string;
  /** True when the run was judged with the 1 px one-character floor (its ink was not subject to the 3 px floor). */
  usedOneCharFloor?: boolean;
  /** True when the verdict at the 1 px floor differs from the verdict at the 3 px floor (the floor decided it). */
  floorDecided?: boolean;
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** WCAG relative luminance of a #rrggbb colour. */
export function luminance(hex: string): number {
  const lin = rgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

/** WCAG contrast ratio of two colours, 1 to 21. */
export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** The part of a box that lies on the screen, or null. */
function onScreen(b: Box): Box | null {
  const x0 = Math.max(0, b.x);
  const y0 = Math.max(0, b.y);
  const x1 = Math.min(SCREEN_W, b.x + b.w);
  const y1 = Math.min(SCREEN_H, b.y + b.h);
  return x1 > x0 && y1 > y0 ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : null;
}

function histogram(px: Pixels, box: Box): Map<string, number> {
  const hist = new Map<string, number>();
  for (let y = box.y; y < box.y + box.h; y++)
    for (let x = box.x; x < box.x + box.w; x++) {
      const c = px.pixel(x, y);
      hist.set(c, (hist.get(c) ?? 0) + 1);
    }
  return hist;
}

/** The best ink contrast on a backdrop: the colour covering at least `floor` px that contrasts most (0 when none). */
function bestInk(hist: Map<string, number>, bg: string, floor: number): { best: number; colour: string } {
  let best = 0;
  let colour = "";
  for (const [c, n] of hist) {
    if (c === bg || n < floor) continue;
    const r = contrast(c, bg);
    if (r > best) {
      best = r;
      colour = c;
    }
  }
  return { best, colour };
}

/** Judge one text run (see RunInput for the backdrop search). */
export function checkRun(px: Pixels, run: RunInput, min = MIN_CONTRAST): LegibilityResult {
  const base: { text: string; attribution?: string } = { text: run.text };
  const cannot = (cause: CannotJudge, reason: string, attribution?: string): LegibilityResult => ({ ...base, status: "fail", ratio: 0, cannotJudge: cause, reason: "could not judge: " + reason, attribution });
  const ink = onScreen(run.rect);
  if (!ink) return cannot("run off screen", "the run is off screen");
  if (run.candidates.length === 0) return cannot("no backdrop", "no backdrop box for the run");
  const mask = (run.mask ?? []).map((m) => onScreen(m)).filter((m): m is Box => m !== null);
  const masked = (x: number, y: number) => mask.some((m) => x >= m.x && x < m.x + m.w && y >= m.y && y < m.y + m.h);
  let chosen: { box: Box; how: string; bg: string } | null = null;
  let nearest = "";
  for (const c of run.candidates) {
    const box = onScreen(c.box);
    if (!box) continue;
    const hist = new Map<string, number>();
    let n = 0;
    for (let y = box.y; y < box.y + box.h; y++)
      for (let x = box.x; x < box.x + box.w; x++) {
        if (masked(x, y)) continue;
        const col = px.pixel(x, y);
        hist.set(col, (hist.get(col) ?? 0) + 1);
        n++;
      }
    if (n === 0) continue;
    const [bg, count] = [...hist.entries()].sort((a, b) => b[1] - a[1])[0];
    const share = count / n;
    if (!nearest) {
      const top = [...hist.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([col, k]) => col + " " + Math.round((100 * k) / n) + "%").join(", ");
      nearest = c.how + " " + box.w + "x" + box.h + " (" + top + ")";
    }
    if (share >= MIN_BG_SHARE) {
      chosen = { box, how: c.how, bg };
      break;
    }
  }
  if (!chosen) return cannot("mixed background", "mixed background under the run (no enclosing box up to the screen is 60% one colour outside the text; nearest " + (nearest || "none") + ")", run.candidates[0]?.how);
  const { bg, how } = chosen;
  const inkHist = histogram(px, ink);
  // A one-character run is a thin glyph: its full-coverage colour can be only a few pixels, so its floor is 1 px (see the header).
  const oneChar = run.text.trim().length === 1;
  const { best, colour: bestColour } = bestInk(inkHist, bg, oneChar ? ONE_CHAR_INK_PX : MIN_INK_PX);
  const verdict = (b: number) => b > 0 && b >= min;
  const floored = oneChar ? { usedOneCharFloor: true, floorDecided: verdict(best) !== verdict(bestInk(inkHist, bg, MIN_INK_PX).best) } : {};
  if (best === 0)
    return { ...base, attribution: how, status: "fail", ratio: 1, reason: "no ink on its background (invisible text)", ...floored };
  const status = best >= min ? "pass" : "fail";
  return { ...base, attribution: how, status, ratio: Math.round(best * 100) / 100, reason: status === "fail" ? "contrast " + best.toFixed(2) + " below " + min + " (ink " + bestColour + " on " + bg + ")" : bestColour, ...floored };
}
