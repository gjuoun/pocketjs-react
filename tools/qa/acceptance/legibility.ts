// Gate 1, legibility: each text run's ink against the colour under it, WCAG contrast, minimum 3:1.
// The background is the dominant colour of the run's host box (the element that holds the text). A host
// whose dominant colour covers less than 60% of its box is mixed and unresolved; a run with no host box is
// unresolved too. Unresolved is never a pass.
export const SCREEN_W = 480;
export const SCREEN_H = 272;
export const MIN_CONTRAST = 3;
const MIN_INK_PX = 3;
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
export interface RunInput {
  text: string;
  rect: Box;
  host: Box | null;
}
export interface LegibilityResult {
  text: string;
  status: "pass" | "fail" | "unresolved";
  ratio: number;
  reason?: string;
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

/** Judge one text run. */
export function checkRun(px: Pixels, run: RunInput, min = MIN_CONTRAST): LegibilityResult {
  const base = { text: run.text };
  if (!run.host) return { ...base, status: "unresolved", ratio: 0, reason: "no host box" };
  const host = onScreen(run.host);
  if (!host) return { ...base, status: "unresolved", ratio: 0, reason: "host box is off screen or zero area" };
  const area = host.w * host.h;
  const bgHist = histogram(px, host);
  const [bg, bgCount] = [...bgHist.entries()].sort((a, b) => b[1] - a[1])[0];
  if (bgCount / area < MIN_BG_SHARE)
    return { ...base, status: "unresolved", ratio: 0, reason: "mixed background under the run" };
  const ink = onScreen(run.rect);
  if (!ink) return { ...base, status: "unresolved", ratio: 0, reason: "run is off screen" };
  const inkHist = histogram(px, ink);
  let best = 0;
  let bestColour = "";
  for (const [c, n] of inkHist) {
    if (c === bg || n < MIN_INK_PX) continue;
    const r = contrast(c, bg);
    if (r > best) {
      best = r;
      bestColour = c;
    }
  }
  if (best === 0)
    return { ...base, status: "fail", ratio: 1, reason: "no ink on its background (invisible text)" };
  const status = best >= min ? "pass" : "fail";
  return { ...base, status, ratio: Math.round(best * 100) / 100, reason: status === "fail" ? "contrast " + best.toFixed(2) + " below " + min : bestColour };
}
