import { afterEach, expect, test } from "bun:test";
import { View } from "../../src/index.ts";
import { rootMirror, type NodeMirror } from "../../src/internal/pocket.ts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../src/native/table.tsx";
import { geometryFor, walk, type Rect } from "../../tools/qa/acceptance/geometry.ts";
import { harness, ROOT } from "./support.ts";

const h = harness();
afterEach(() => h.dispose());
const RULE = "#e2e8f0"; // slate-200: the divider rule
const ZEBRA = "#f1f5f9"; // slate-100: the tinted row

/** The rect of every node with a debugName (the table's cells and rows), in tree order. */
function named(name: string): Rect[] {
  const out: Rect[] = [];
  walk(rootMirror, (n: NodeMirror) => { if (n.debugName === name) out.push(geometryFor(h.core).rect(n)!); });
  return out;
}
/** The rect of a text run (the drawn glyph box). */
const runOf = (text: string) => h.core.texts().find((t) => t.text === text)!;
const inside = (r: { x: number; y: number; w: number; h: number }, c: Rect) => r.x >= c.x && r.y >= c.y && r.x + r.w <= c.x + c.w && r.y + r.h <= c.y + c.h;

const COLUMNS = [{ width: 120 }, { width: 70, align: "right" as const }, { width: 80, align: "center" as const }];

function Plans(props: { rows?: "divider" | "zebra" }) {
  return (
    <View className={ROOT}>
      <Table columns={COLUMNS} rows={props.rows}>
        <TableHeader>
          <TableRow><TableHead>Plan</TableHead><TableHead>Seats</TableHead><TableHead>Tier</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          <TableRow><TableCell>Starter</TableCell><TableCell>1</TableCell><TableCell>Free</TableCell></TableRow>
          <TableRow><TableCell>Team</TableCell><TableCell>10</TableCell><TableCell>Pro</TableCell></TableRow>
          <TableRow><TableCell>Studio</TableCell><TableCell>25</TableCell><TableCell>Max</TableCell></TableRow>
        </TableBody>
      </Table>
    </View>
  );
}

test("columns line up: every row's cell in a column has the same x and width as the header's", async () => {
  await h.boot(() => <Plans />);
  const heads = named("table-head");
  const cells = named("table-cell");
  expect(heads).toHaveLength(3);
  expect(cells).toHaveLength(9);
  for (let col = 0; col < 3; col++) {
    const column = [heads[col], cells[col], cells[col + 3], cells[col + 6]];
    for (const c of column) { expect(c.x).toBe(column[0].x); expect(c.w).toBe(COLUMNS[col].width); }
  }
});

test("right and centre alignment place the text in its cell; left sits on the padding", async () => {
  await h.boot(() => <Plans />);
  const cells = named("table-cell");
  // Left column: text starts 8 px (px-2) inside the cell.
  expect(runOf("Team").x).toBe(cells[3].x + 8);
  // Seats (right): the text ends 8 px inside the cell's right edge.
  expect(runOf("10").x + runOf("10").w).toBe(cells[4].x + cells[4].w - 8);
  // Tier (centre): the text is centred to a pixel.
  const tier = runOf("Pro");
  expect(Math.abs(tier.x + tier.w / 2 - (cells[8].x + cells[8].w / 2))).toBeLessThanOrEqual(1);
});

test("the text of every cell stays inside its cell", async () => {
  await h.boot(() => <Plans />);
  const cells = [...named("table-head"), ...named("table-cell")];
  for (const t of ["Plan", "Seats", "Tier", "Starter", "Team", "Studio", "1", "10", "25", "Free", "Pro", "Max"]) {
    const r = runOf(t);
    expect(cells.some((c) => inside(r, c))).toBe(true);
  }
});

test("rows are centred vertically: every cell's centre row is the row's centre", async () => {
  await h.boot(() => <Plans />);
  const rows = named("table-row");
  const cells = named("table-cell");
  for (let i = 0; i < 3; i++) {
    const rowMid = rows[i + 1].y + rows[i + 1].h / 2;
    for (let col = 0; col < 3; col++) expect(cells[i * 3 + col].y + cells[i * 3 + col].h / 2).toBe(rowMid);
  }
});

test("divider mode draws a 1 px rule between body rows, and no tint", async () => {
  await h.boot(() => <Plans rows="divider" />);
  const rows = named("table-row");
  // The first body row is rows[1]; the 1 px rule sits in the gap just above the next row.
  expect(rows[2].y - (rows[1].y + rows[1].h)).toBe(1);
  expect(h.core.pixel(rows[1].x + 40, rows[2].y - 1)).toBe(RULE);
  expect(h.core.pixel(rows[2].x + 40, rows[2].y + 2)).not.toBe(ZEBRA);
});

test("zebra mode tints every other body row and draws no rule", async () => {
  await h.boot(() => <Plans rows="zebra" />);
  const rows = named("table-row");
  // Body rows are rows[1..3]; index 0 (Starter) is plain, index 1 (Team) is tinted, index 2 (Studio) plain.
  expect(h.core.pixel(rows[1].x + 1, rows[1].y + 4)).not.toBe(ZEBRA);
  expect(h.core.pixel(rows[2].x + 1, rows[2].y + 4)).toBe(ZEBRA);
  expect(h.core.pixel(rows[3].x + 1, rows[3].y + 4)).not.toBe(ZEBRA);
});
