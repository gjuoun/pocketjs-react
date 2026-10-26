// Batch 4 step 15: the react-day-picker shim lays October 2026 out as five rows of seven with 1 October in the Thursday
// column, the seven columns of equal width, and a pointer click on 26 selects that date once.
import { afterEach, expect, test } from "bun:test";
import { createElement } from "react";
import { DayPicker, monthWeeks } from "../src/primitives/react-day-picker.tsx";
import { mountTree, type Mounted } from "./batch4-support.ts";

const g = globalThis as { __pocketPointer?: unknown };
const tick = () => new Promise((r) => setTimeout(r, 5));
let m: Mounted | undefined;
afterEach(() => {
  m?.dispose();
  m = undefined;
  delete g.__pocketPointer;
});

async function frames(n: number) {
  for (let i = 0; i < n; i++) {
    await tick();
    m!.core.step(0);
  }
  m!.core.render();
}

const oct = new Date(2026, 9, 1);

test("October 2026 is five weeks of seven, starting on a Sunday", () => {
  const weeks = monthWeeks(oct, true);
  expect(weeks.length).toBe(5);
  expect(weeks.every((w) => w.length === 7)).toBe(true);
  expect(weeks[0][0].getDay()).toBe(0);
  expect(weeks[0][4].getDate()).toBe(1);
});

test("1 October sits in row 0, column 4 (Thursday), with equal column widths", async () => {
  m = await mountTree(
    createElement(DayPicker, { month: oct }),
    [import.meta.path],
    { width: 480, height: 272 },
  );
  await frames(3);
  const texts = m!.core.texts();
  const header = texts.find((t) => t.text === "Th")!;
  const one = texts.find((t) => t.text === "1")!;
  expect(Math.abs(one.x - header.x)).toBeLessThanOrEqual(2);
  const heads = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(
    (d) => texts.find((t) => t.text === d)!.x,
  );
  const gaps = heads.slice(1).map((x, i) => x - heads[i]);
  expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThanOrEqual(1);
});

test("a pointer click on 26 selects 26 October once", async () => {
  const picked: Date[] = [];
  m = await mountTree(
    createElement(DayPicker, {
      month: oct,
      selected: undefined,
      onSelect: (d: Date) => picked.push(d),
    }),
    [import.meta.path],
    { width: 480, height: 272 },
  );
  await frames(3);
  const t = m!.core.texts().find((x) => x.text === "26")!;
  const x = t.x + Math.floor(t.w / 2);
  const y = t.y + Math.floor(t.h / 2);
  g.__pocketPointer = [{ x, y, down: true }];
  await frames(3);
  g.__pocketPointer = [{ x, y, down: false }];
  await frames(3);
  expect(picked.length).toBe(1);
  expect(picked[0].getDate()).toBe(26);
  expect(picked[0].getMonth()).toBe(9);
});
