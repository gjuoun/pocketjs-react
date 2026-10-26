// Batch 4 step 2: custom properties are stored per node, not sent to the core; rem lengths are px.
import { expect, test } from "bun:test";
import { cssToCore, cssVars } from "../src/style/css.ts";

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
  expect(cssToCore({ translateX: 12, translateY: "-4px" } as never)).toEqual({ translateX: 12, translateY: -4 });
});
