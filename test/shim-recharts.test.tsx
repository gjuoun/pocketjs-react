// Batch 4 step 17: the recharts shim. The chart container draws its child (the ResponsiveContainer gives it the box), the
// chart style tag draws nothing, and a series component is a named error, never a silent empty plot.
import { expect, test } from "bun:test";
import { createElement } from "react";
import * as RC from "../src/primitives/recharts.tsx";
import { mountTree, uiFiles } from "./batch4-support.ts";

const CHART = new URL(
  "../test/fixtures/shadcn-full/ui/chart.tsx",
  import.meta.url,
).pathname;
const C = (await import(CHART)) as Record<string, any>;

test("the chart container draws its child", async () => {
  const m = await mountTree(
    createElement(
      C.ChartContainer,
      { config: { v: { label: "Visits", color: "#0f172a" } } },
      createElement("div", { className: "h-[40px] w-full" }, "chart body"),
    ),
    [import.meta.path, ...uiFiles()],
    { width: 480, height: 272 },
  );
  try {
    for (let i = 0; i < 3; i++) m.core.step(0);
    m.core.render();
    expect(m.core.texts().map((t) => t.text)).toContain("chart body");
  } finally {
    m.dispose();
  }
});

test("a series component is a named error", () => {
  expect(() => (RC.Bar as () => never)()).toThrow(
    "recharts Bar is not supported",
  );
});
