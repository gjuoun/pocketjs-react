// A deterministic ASCII plasma field: one string per grid row, for frame `t`.
// Pure — same t, same grid, so the wasm-core test and a screenshot both describe one state.

export const COLS = 40;
export const ROWS = 18;
/** Row pitch in px for text-xs font-mono (12 px face, 7.00 px advance — see the plan probe). */
export const PITCH = 13;
/** Cell advance in px; the grid is COLS * ADVANCE wide. */
export const ADVANCE = 7;

const RAMP = " .:-=+*#%@";

export function plasma(t: number, cols = COLS, rows = ROWS): string[] {
  const out: string[] = [];
  const cx = (cols - 1) / 2,
    cy = (rows - 1) / 2;
  for (let y = 0; y < rows; y++) {
    let row = "";
    for (let x = 0; x < cols; x++) {
      const ring = Math.hypot(x - cx, y - cy) * 0.42 - t * 2.1;
      const v =
        Math.sin((x + t * 1.3) * 0.26) +
        Math.sin((y - t * 0.9) * 0.44) +
        Math.sin((x + y + t * 1.7) * 0.17) +
        Math.sin(ring);
      const level = Math.floor(((v + 4) / 8) * (RAMP.length - 1) + 0.5);
      row += RAMP[Math.max(0, Math.min(RAMP.length - 1, level))];
    }
    out.push(row);
  }
  return out;
}
