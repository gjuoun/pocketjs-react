// Batch 4 steps 2-4: custom properties are stored per node, not sent to the core; rem lengths are px; var-bound
// lengths are bindings resolved by a sweep, with an inline style beating the binding.
import { expect, test } from "bun:test";
import { createElement } from "react";
import { rewrite, rewriteLiteral, parseBinding } from "../src/compat/tokens.ts";
import { cssToCore, cssVars } from "../src/style/css.ts";
import { mountTree } from "./batch4-support.ts";

test("stores --var keys and does not throw", () => {
  const style = { "--sidebar-width": "16rem", width: 10 } as never;
  expect(cssToCore(style).width).toBe(10);
  expect(Object.keys(cssToCore(style))).toEqual(["width"]);
  expect(cssVars(style)).toEqual({ "--sidebar-width": "16rem" });
});

test("rem lengths are px", () => {
  expect(cssToCore({ width: "16rem" } as never).width).toBe(256);
  expect(cssToCore({ height: "1.5rem" } as never).height).toBe(24);
});

test("translate keys map to TRANSLATE_X/Y", () => {
  expect(cssToCore({ translateX: 12, translateY: "-4px" } as never)).toEqual({
    translateX: 12,
    translateY: -4,
  });
});

test("var-bound lengths are bindings, not drops or text", () => {
  const r = rewrite("w-(--sidebar-width) flex");
  expect(r.text).toBe("flex");
  expect(r.bindings).toEqual([{ prop: "width", name: "--sidebar-width" }]);
  expect(r.droppedTokens).toEqual([]);
  expect(rewriteLiteral("h-[var(--x)] min-w-[--y] p-2")).toBe("p-2");
  expect(parseBinding("max-h-(--z)")).toEqual({ prop: "maxH", name: "--z" });
});

test("binding width follows the inherited --w (160 px) and an inline width beats it (100 px)", async () => {
  const m = await mountTree(
    createElement(
      "div",
      { style: { "--w": "10rem" } as never, className: "flex flex-col" },
      createElement("div", { className: "w-(--w) h-[10px] bg-slate-900" }),
      createElement("div", {
        className: "w-(--w) h-[10px] bg-slate-900",
        style: { width: 100 } as never,
      }),
    ),
    [import.meta.path],
  );
  try {
    const boxes = m
      .nodes()
      .map((n) => m.box(n))
      .filter((b) => b && b.h === 10);
    expect(boxes.map((b) => b?.w)).toEqual([160, 100]);
  } finally {
    m.dispose();
  }
});
