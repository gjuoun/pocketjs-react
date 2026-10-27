// The acceptance harness boots a gallery section with the build's own style table, as the product does. A `hidden`
// label inside the vendored carousel's arrows is display none: it draws no text and no ink. The second case is the gate
// that reads the same boot (G2 on the overlay channel): a hidden label must not be reported as overflow.
import { expect, test } from "bun:test";
import { judgeTarget } from "../tools/qa/acceptance/gates.ts";
import { bootTarget, disposeTarget } from "../tools/qa/acceptance/screen.ts";

test("carousel section: the hidden arrow labels draw no text", async () => {
  const b = await bootTarget({ kind: "section", name: "carousel" });
  try {
    const drawn = b.core.texts().map((r) => r.text);
    expect(drawn).toContain("One");
    expect(drawn).not.toContain("Previous slide");
    expect(drawn).not.toContain("Next slide");
  } finally {
    disposeTarget(b);
  }
}, 120_000);

test("carousel section: no overflow finding from the hidden arrow labels (overlay gate)", async () => {
  const g = await judgeTarget({ kind: "section", name: "carousel" });
  // The stock channel reads screen-clipped boxes and is not evidence for G2 (overflow.test.ts says the same).
  if (g.channel !== "overlay") return;
  expect(g.g1.fails).toEqual([]);
  expect(g.g2.findings).toEqual([]);
  expect(g.g3.fails).toEqual([]);
}, 120_000);
