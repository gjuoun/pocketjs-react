// C4b row-strip navigation, characterised on the shipped navigate(): up/down change row only,
// left/right wrap inside the row, and no move is diagonal. F3 fallback C kept navigate() unchanged;
// the press count pins what the layout costs for "quick brown fox" (Step 0 measured 54).
import { expect, test } from "bun:test";
import { homePos, layoutRows, navigate, type OskPos, oskLayer } from "../src/input/osk-layout.ts";

const rows = layoutRows(oskLayer("lower"), 480 - 2 * 4, 4);
const at = (ch: string): OskPos => {
  for (const row of rows) for (const k of row) if (k.key.ch === ch) return { row: k.row, col: k.col };
  throw new Error(ch);
};

test("left and right wrap inside the row and never leave it", () => {
  for (let r = 0; r < rows.length; r++) {
    const n = rows[r].length;
    expect(navigate(rows, { row: r, col: n - 1 }, "right")).toEqual({ row: r, col: 0 });
    expect(navigate(rows, { row: r, col: 0 }, "left")).toEqual({ row: r, col: n - 1 });
    expect(navigate(rows, { row: r, col: 1 }, "right")).toEqual({ row: r, col: 2 });
  }
});

test("up and down move exactly one row, never diagonally", () => {
  const from = at("g");
  const down = navigate(rows, from, "down");
  expect(down.row).toBe(from.row + 1);
  const up = navigate(rows, down, "up");
  expect(up.row).toBe(from.row);
  // the vertical move keeps a column that overlaps the key: g (row 1) -> the key below it
  expect(rows[down.row][down.col].x < rows[from.row][from.col].x + rows[from.row][from.col].w).toBe(true);
});

test("vertical moves clamp at the first and last row", () => {
  const top = { row: 0, col: 2 };
  expect(navigate(rows, top, "up")).toEqual(top);
  const bottom = { row: rows.length - 1, col: 0 };
  expect(navigate(rows, bottom, "down")).toEqual(bottom);
});

// Fewest d-pad moves to type a string from the home key, one hop at a time (CIRCLE not counted).
// navigate() is stateless, so per-hop shortest paths are the whole-sequence optimum.
function moves(text: string): number {
  let cur = homePos(rows);
  let total = 0;
  for (const ch of text) {
    const goal = at(ch);
    let frontier: OskPos[] = [cur];
    const seen = new Set([cur.row + ":" + cur.col]);
    let depth = 0;
    while (!frontier.some((p) => p.row === goal.row && p.col === goal.col)) {
      const next: OskPos[] = [];
      for (const p of frontier) {
        for (const d of ["up", "down", "left", "right"] as const) {
          const q = navigate(rows, p, d);
          const k = q.row + ":" + q.col;
          if (!seen.has(k)) {
            seen.add(k);
            next.push(q);
          }
        }
      }
      frontier = next;
      depth++;
    }
    total += depth;
    cur = goal;
  }
  return total;
}

test("quick brown fox costs 54 d-pad moves on the shipped layout (pinned)", () => {
  expect(moves("quick brown fox")).toBe(54);
});
