// Batch 4 step 7: the vendored sidebar on a 1024 px canvas (desktop branch, F1 A). The sidebar width is the
// --sidebar-width custom property, read through the w-(--sidebar-width) binding; the inset starts after it.
import { expect, test } from "bun:test";
import { createElement } from "react";
import { mountTree, uiFiles } from "./batch4-support.ts";

// The vendored sidebar is loaded at run time from a computed path: its own prop types (Sheet, Tooltip) are checked
// by the vendoring gate, not by this project, so the module graph of the test does not pull it into typecheck.
const SIDEBAR = new URL(
  "../test/fixtures/shadcn-full/ui/sidebar.tsx",
  import.meta.url,
).pathname;
const S = (await import(SIDEBAR)) as Record<string, any>;

const tick = () => new Promise((r) => setTimeout(r, 5));

async function laidOut(style?: Record<string, string>) {
  const tree = createElement(
    S.SidebarProvider,
    { style: style as never },
    createElement(S.Sidebar, null, createElement("div", null, "nav")),
    createElement(S.SidebarInset, null, createElement("div", null, "main")),
  );
  const m = await mountTree(tree, [import.meta.path, ...uiFiles()], {
    width: 1024,
    height: 600,
  });
  try {
    for (let i = 0; i < 4; i++) {
      await tick();
      m.core.step(0);
    }
    m.core.render();
    const widths = m
      .nodes()
      .map((n) => m.box(n))
      .filter((b) => b && b.h > 0)
      .map((b) => b?.w ?? 0);
    const main = m.core.texts().find((t) => t.text === "main");
    return { widths, mainX: main?.x ?? -1 };
  } finally {
    m.dispose();
  }
}

test("sidebar 256 px by default", async () => {
  const r = await laidOut();
  expect(r.widths).toContain(256);
});

test("sidebar 192 px with --sidebar-width 12rem", async () => {
  const r = await laidOut({ "--sidebar-width": "12rem" });
  expect(r.widths).toContain(192);
  expect(r.widths).not.toContain(256);
});

test("inset left edge at the sidebar width", async () => {
  const r = await laidOut();
  expect(r.mainX).toBeGreaterThanOrEqual(256);
});
