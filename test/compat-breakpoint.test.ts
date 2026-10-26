// Batch 4 step 5: md: and up is a selector against the mount viewport width (D4, F1 A); sm: stays dropped.
import { expect, test } from "bun:test";
import { createElement } from "react";
import { mountTree } from "./batch4-support.ts";

const tree = () =>
  createElement(
    "div",
    { className: "flex flex-col" },
    createElement("div", {
      className: "w-[40px] h-[10px] hidden md:flex bg-slate-900",
    }),
  );
const sized = (w: number) => (w ? [w] : []);

async function visibleWidths(width: number): Promise<number[]> {
  const m = await mountTree(tree(), [import.meta.path], { width, height: 300 });
  try {
    return m
      .nodes()
      .map((n) => m.box(n))
      .filter((b) => b && b.h === 10 && b.w === 40)
      .map((b) => b?.w ?? 0);
  } finally {
    m.dispose();
  }
}

test("md:flex applies at 800 px", async () => {
  expect(await visibleWidths(800)).toEqual([40]);
});

test("md:flex is dropped at 600 px", async () => {
  expect(await visibleWidths(600)).toEqual([]);
});

test("sm: stays dropped at any width", async () => {
  const m = await mountTree(
    createElement("div", {
      className: "w-[40px] h-[10px] sm:flex hidden bg-slate-900",
    }),
    [import.meta.path],
    { width: 1024, height: 300 },
  );
  try {
    expect(
      m
        .nodes()
        .map((n) => m.box(n))
        .filter((b) => b && b.h === 10).length,
    ).toBe(0);
  } finally {
    m.dispose();
  }
});

void sized;
