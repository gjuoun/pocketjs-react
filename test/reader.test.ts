// The reader example, built by tools/build-reader.ts, played with the d-pad on the wasm core.
// Every observation is text the core drew.
import { expect, test } from "bun:test";
import { BTN } from "@pocketjs/framework/input";
import { buildReader } from "../tools/build-reader.ts";
import { bootApp } from "./harness.ts";

test("library -> contents -> reading -> page and chapter turns -> back to the library", async () => {
  const core = await bootApp(await buildReader({ outdir: "/tmp/pocketjs-react-test/reader" }));
  try {
    const drawn = () => core.texts().map((r) => r.text);
    expect(drawn()).toContain("Bitcoin: A Peer-to-Peer Electronic Cash System");
    expect(drawn()).toContain("Library");

    core.press(BTN.CIRCLE); // open the focused (first) book
    const toc = drawn();
    expect(toc).toContain("Abstract");
    expect(toc).toContain("4. Proof-of-Work");
    for (let i = 0; i < 13; i++) core.press(BTN.DOWN); // every entry is reachable through the window
    expect(drawn()).toContain("References");
    for (let i = 0; i < 9; i++) core.press(BTN.UP); // back to entry 4

    core.press(BTN.CIRCLE);
    let page = drawn();
    expect(page[0]).toBe("4. Proof-of-Work");
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
