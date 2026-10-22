// The reader example, built by tools/build-reader.ts, played with the d-pad on the wasm core.
// Every observation is text the core drew.
import { expect, test } from "bun:test";
import { BTN } from "@pocketjs/framework/input";
import { build } from "../tools/build.ts";
import { buildReader } from "../tools/build-reader.ts";
import { bootApp } from "./harness.ts";

test("library -> contents -> reading -> page and chapter turns -> back to the library", async () => {
  const core = await bootApp(await buildReader({ outdir: "/tmp/pocketjs-react-test/reader" }));
  try {
    const drawn = () => core.texts().map((r) => r.text);
    expect(drawn()).toContain("Bitcoin: A Peer-to-Peer Electronic Cash System");
    expect(drawn()).toContain("Library");

    const libraryBg = core.pixel(470, 262);
    core.press(BTN.CIRCLE); // open the focused (first) book
    const toc = drawn();
    // The contents follow the library's (light) theme: same page background, no dark rows.
    const intro = core.texts().find((r) => r.text === "1. Introduction")!;
    expect(core.pixel(470, 262)).toBe(libraryBg);
    expect(core.pixel(intro.x - 4, intro.y + 2)).not.toBe("#1e293b");
    expect(toc).toContain("Abstract");
    expect(toc).toContain("4. Proof-of-Work");
    for (let i = 0; i < 13; i++) core.press(BTN.DOWN); // every entry is reachable through the window
    expect(drawn()).toContain("References");
    for (let i = 0; i < 9; i++) core.press(BTN.UP); // back to entry 4

    core.press(BTN.CIRCLE);
    let page = drawn();
    expect(page[0]).toBe("4. Proof-of-Work");
    expect(page.filter((t) => t === "4. Proof-of-Work").length).toBe(1); // the title is drawn once
    // The page indicator overlaps no other text and is not on the title's row.
    const runs = core.texts();
    const indicator = runs.find((r) => r.text === "page 1/4")!;
    const titleRun = runs.find((r) => r.text === "4. Proof-of-Work")!;
    const glyphW = (r: { text: string; w: number }) => Math.min(r.w, r.text.length * 9); // text runs report the box width
    const overlaps = (a: typeof indicator, b: typeof indicator) => a.x < b.x + glyphW(b) && b.x < a.x + glyphW(a) && a.y < b.y + b.h && b.y < a.y + a.h;
    expect(runs.filter((r) => r !== indicator && r.text.trim() && overlaps(r, indicator)).map((r) => r.text)).toEqual([]);
    expect(indicator.y).toBeGreaterThanOrEqual(titleRun.y + titleRun.h);
    expect(page).toContain("page 1/4");
    expect(page.some((t) => t.startsWith("To implement a distributed timestamp server"))).toBe(true);

    core.press(BTN.RIGHT);
    core.press(BTN.RIGHT);
    expect(drawn().some((t) => t.startsWith("page 3/"))).toBe(true);

    core.press(BTN.RTRIGGER);
    page = drawn();
    expect(page[0]).toBe("5. Network");
    expect(page).toContain("page 1/" + page.find((t) => t.startsWith("page 1/"))!.slice(7));

    core.press(BTN.CROSS); // contents
    expect(drawn()).toContain("5. Network");
    core.press(BTN.CROSS); // library
    expect(drawn()).toContain("Library");
  } finally {
    core.dispose();
  }
});

test("a contents list shorter than its window opens with its first entry focused; CIRCLE reads it", async () => {
  const built = await build("examples/reader/main.tsx", { outdir: "/tmp/pocketjs-react-test/reader-sanguo", name: "reader-sanguo", assets: { "sanguo.epub": "test/fixtures/books/sanguo.epub" } });
  const core = await bootApp(built);
  try {
    const drawn = () => core.texts().map((r) => r.text);
    expect(drawn()).toContain("三國志演義");
    core.press(BTN.CIRCLE); // the only book
    const first = core.texts().find((r) => r.text.startsWith("第一回："))!;
    expect(first).toBeDefined();
    expect(core.texts().filter((r) => r.text.startsWith("第")).length).toBe(3);
    expect(core.pixel(first.x - 4, first.y + 2)).toBe("#bfdbfe"); // LIGHT theme focus:bg-blue-200
    core.press(BTN.CIRCLE);
    const page = drawn();
    expect(page[0]).toBe(first.text);
    expect(page.some((t) => t.startsWith("page 1/"))).toBe(true);
  } finally {
    core.dispose();
  }
});
