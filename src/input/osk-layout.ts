// C4 on-screen keyboard layout: rows of keys measured in relative units, normalized per
// row so every row spans the panel width. The panel computes its own pixel geometry (the JS
// side has no layout read-back), so the same numbers drive rendering, d-pad navigation and
// hit-testing, and they can never disagree.
//
// Ported from @pocketjs/framework 0.15.0 framework/src/osk-layout.ts (grid layout only: this
// repo has no touch surface, so the phone "staggered" layout and its hold rules do not apply).
// It is a port rather than an import because every keycap below is a source literal and the
// build's font bake only scans the app's import graph plus this repo's src/ - importing the
// upstream module would compile the panel with no glyphs for the keys it draws.
//
// Keycap labels are ASCII on purpose (DEL/ENT/OK/HIDE/</>): the framework's own arrows
// (⌫ ↵ ✓ ▼ ‹ ›) are not guaranteed to be in the baked atlas.

/** Non-typing key behaviors. Keys with `ch` set insert it. */
export type OskAction =
  | "shift"
  | "layer"
  | "backspace"
  | "enter"
  | "left"
  | "right"
  | "hide";

export type OskLayerName = "lower" | "upper" | "symbols";

export interface OskKeyDef {
  /** Literal text this key inserts (typing keys). */
  ch?: string;
  action?: OskAction;
  /** Layer a "layer" action switches to. */
  to?: OskLayerName;
  /** Key-cap label; defaults to `ch`. */
  label?: string;
  /** Relative width in row units (normalized per row). */
  w: number;
}

export const OSK_ROW_H = 18;
export const OSK_GAP = 4;
export const OSK_PAD = 4;
/** Docked panel height at the default row height: 4 rows + 3 gaps + padding. */
export const OSK_H = 4 * OSK_ROW_H + 3 * OSK_GAP + 2 * OSK_PAD;

export interface OskMetrics {
  readonly rowH: number;
  readonly gap: number;
  readonly pad: number;
}

export function oskMetrics(rowH: number = OSK_ROW_H): OskMetrics {
  return { rowH, gap: OSK_GAP, pad: OSK_PAD };
}

export function oskPanelHeight(metrics: OskMetrics): number {
  return 4 * metrics.rowH + 3 * metrics.gap + 2 * metrics.pad;
}

/** Offset of the first row inside the panel. */
export function oskRowsTop(metrics: OskMetrics): number {
  return metrics.pad;
}

const chars = (s: string): OskKeyDef[] => [...s].map((ch) => ({ ch, w: 1 }));

/** Grid bottom row, LVGL-style: hide · caret-left · space · caret-right · OK. */
const GRID_BOTTOM: OskKeyDef[] = [
  { action: "hide", label: "HIDE", w: 1.5 },
  { action: "left", label: "<", w: 1.5 },
  { ch: " ", label: "", w: 7 },
  { action: "right", label: ">", w: 1.5 },
  { action: "enter", label: "OK", w: 1.5 },
];

const LAYERS: Record<OskLayerName, OskKeyDef[][]> = {
  lower: [
    [
      { action: "layer", to: "symbols", label: "1#", w: 1.5 },
      ...chars("qwertyuiop"),
      { action: "backspace", label: "DEL", w: 1.5 },
    ],
    [
      { action: "shift", label: "ABC", w: 2 },
      ...chars("asdfghjkl"),
      { action: "enter", label: "ENT", w: 2 },
    ],
    chars("_-zxcvbnm.,:"),
    GRID_BOTTOM,
  ],
  upper: [
    [
      { action: "layer", to: "symbols", label: "1#", w: 1.5 },
      ...chars("QWERTYUIOP"),
      { action: "backspace", label: "DEL", w: 1.5 },
    ],
    [
      { action: "shift", label: "abc", w: 2 },
      ...chars("ASDFGHJKL"),
      { action: "enter", label: "ENT", w: 2 },
    ],
    chars("_-ZXCVBNM.,:"),
    GRID_BOTTOM,
  ],
  symbols: [
    [
      { action: "layer", to: "lower", label: "abc", w: 1.5 },
      ...chars("1234567890"),
      { action: "backspace", label: "DEL", w: 1.5 },
    ],
    [...chars("+-*/=%!?@"), { action: "enter", label: "ENT", w: 2 }],
    chars("#()[]'\";&$,."),
    GRID_BOTTOM,
  ],
};

/** The layer a keyboard opens on and every layout has. */
export const OSK_HOME_LAYER: OskLayerName = "lower";

/** The layer a "layer" key switches to from `from`. */
export function oskLayerToggle(from: OskLayerName): OskLayerName {
  return from === "symbols" ? "lower" : "symbols";
}

/** The rows of a layer. */
export function oskLayer(layer: OskLayerName): OskKeyDef[][] {
  return LAYERS[layer] ?? LAYERS[OSK_HOME_LAYER];
}

export interface OskKeyRect {
  key: OskKeyDef;
  row: number;
  /** Column among the row's KEYS. */
  col: number;
  /** Pixel offset inside the row (0 = row left edge). */
  x: number;
  w: number;
}

/**
 * Normalize one layer into per-key pixel rects for an `innerW`-wide row box.
 * Cumulative rounding: key edges land on round(prefix-units share), so the widths always
 * sum exactly to `innerW` with no 1-px drift.
 */
export function layoutRows(
  layer: readonly OskKeyDef[][],
  innerW: number,
  gap: number = OSK_GAP,
): OskKeyRect[][] {
  return layer.map((row, r) => {
    const units = row.reduce((sum, k) => sum + k.w, 0);
    const keyPx = innerW - gap * (row.length - 1);
    const rects: OskKeyRect[] = [];
    let prefix = 0;
    let left = 0;
    for (let c = 0; c < row.length; c++) {
      const right = Math.round(((prefix + row[c].w) / units) * keyPx);
      rects.push({
        key: row[c],
        row: r,
        col: rects.length,
        x: left + c * gap,
        w: right - left,
      });
      prefix += row[c].w;
      left = right;
    }
    return rects;
  });
}

export interface OskPos {
  row: number;
  col: number;
}

/** Clamp a (row, col) into a layer's shape — used across layer switches. */
export function clampPos(rows: readonly OskKeyRect[][], pos: OskPos): OskPos {
  const row = Math.max(0, Math.min(pos.row, rows.length - 1));
  const col = Math.max(0, Math.min(pos.col, rows[row].length - 1));
  return { row, col };
}

/** Where a keyboard opens the first time: the 'q' key, or the row's first key. */
export function homePos(rows: readonly OskKeyRect[][]): OskPos {
  for (const row of rows)
    for (const k of row)
      if (k.key.ch === "q") return { row: k.row, col: k.col };
  return { row: 0, col: 0 };
}

/**
 * Spatial d-pad navigation over variable-width rows: left/right wrap within the row;
 * up/down clamp at the edges and pick the key in the adjacent row with the largest
 * horizontal overlap (nearest center on ties/no overlap).
 */
export function navigate(
  rows: readonly OskKeyRect[][],
  pos: OskPos,
  direction: "up" | "down" | "left" | "right",
): OskPos {
  const { row, col } = clampPos(rows, pos);
  if (direction === "left" || direction === "right") {
    const n = rows[row].length;
    const d = direction === "right" ? 1 : -1;
    return { row, col: (col + d + n) % n };
  }
  const target = row + (direction === "down" ? 1 : -1);
  if (target < 0 || target >= rows.length) return { row, col };
  const cur = rows[row][col];
  const c0 = cur.x;
  const c1 = cur.x + cur.w;
  const center = (c0 + c1) / 2;
  let best = 0;
  let bestOverlap = -1;
  let bestDist = Infinity;
  for (let c = 0; c < rows[target].length; c++) {
    const k = rows[target][c];
    const overlap = Math.min(c1, k.x + k.w) - Math.max(c0, k.x);
    const dist = Math.abs(k.x + k.w / 2 - center);
    if (overlap > bestOverlap || (overlap === bestOverlap && dist < bestDist)) {
      best = c;
      bestOverlap = overlap;
      bestDist = dist;
    }
  }
  return { row: target, col: best };
}
