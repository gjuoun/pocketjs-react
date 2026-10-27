// The acceptance harness boots a gallery section with the build's own style table, as the product does. A `hidden`
// label inside the vendored carousel's arrows is display none: it draws no text.
import { expect, test } from "bun:test";
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
