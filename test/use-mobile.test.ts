// Batch 4 step 6: the vendored use-mobile reads the live viewport through the window stand-in (PocketJS has no window).
import { expect, test } from "bun:test";
import { createElement } from "react";
import { useIsMobile } from "../test/fixtures/shadcn-full/ui/use-mobile.ts";
import { mountTree } from "./batch4-support.ts";

function Probe() {
  return createElement(
    "div",
    { className: "w-[40px] h-[10px] bg-slate-900" },
    useIsMobile() ? "mobile" : "desktop",
  );
}

/** Passive effects run between host frames, so the test yields to the event loop before each frame. */
const tick = () => new Promise((r) => setTimeout(r, 5));

async function textAt(width: number): Promise<string> {
  const m = await mountTree(createElement(Probe), [import.meta.path], {
    width,
    height: 300,
  });
  try {
    for (let i = 0; i < 4; i++) {
      await tick();
      m.core.step(0);
    }
    m.core.render();
    return m.core
      .texts()
      .map((t) => t.text)
      .join("|");
  } finally {
    m.dispose();
  }
}

test("desktop at 1280 px", async () => {
  expect(await textAt(1280)).toContain("desktop");
});

test("mobile at 360 px", async () => {
  expect(await textAt(360)).toContain("mobile");
});
