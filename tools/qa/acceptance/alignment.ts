// Gate 3, alignment. A centred row is an element whose class has items-center and not flex-col. Its element
// children (not absolutely positioned, with area) must share one centre line, within 1 px. Rows that are not
// centred (items-start, stretch) are not judged; they are not in the report.
import { classOf } from "../../../src/style/class-runtime.ts";
import { type Geometry, isText, walk } from "./geometry.ts";
import { nameOf } from "./overflow.ts";

export interface RowResult {
  row: string;
  children: number;
  spread: number;
  status: "pass" | "fail" | "n/a";
}
export interface AlignmentReport {
  checked: number;
  rows: RowResult[];
  fails: RowResult[];
}

const tokens = (cls: string): string[] => cls.split(/\s+/).filter(Boolean);

export function checkAlignment(root: Parameters<typeof walk>[0], geo: Geometry, tolerance = 1): AlignmentReport {
  const rows: RowResult[] = [];
  let checked = 0;
  walk(root, (n) => {
    if (isText(n)) return;
    const cls = tokens(classOf(n));
    if (!cls.includes("items-center") || cls.includes("flex-col")) return;
    checked++;
    const centres: number[] = [];
    for (const c of n.children) {
      if (isText(c) || tokens(classOf(c)).includes("absolute")) continue;
      const r = geo.rect(c);
      if (!r || r.w === 0 || r.h === 0) continue;
      centres.push(r.y + r.h / 2);
    }
    const label = nameOf(n);
    if (centres.length < 2) {
      rows.push({ row: label, children: centres.length, spread: 0, status: "n/a" });
      return;
    }
    const spread = Math.max(...centres) - Math.min(...centres);
    rows.push({ row: label, children: centres.length, spread, status: spread <= tolerance ? "pass" : "fail" });
  });
  const fails = rows.filter((r) => r.status === "fail");
  return { checked, rows: rows.filter((r) => r.status !== "n/a"), fails };
}
