// C8 Step 8 (Q3=A): a CardHeader with a CardAction child lays its title and action out in one row.
// The vendored header's grid becomes flex-row justify-between through the has-data selector; the
// real wasm core and its pak draw the texts, and their positions are read back.
import { afterEach, expect, test } from "bun:test";
import { build } from "../tools/build.ts";
import { bootApp, type Core } from "./harness.ts";

let core: Core | undefined;
afterEach(() => {
  core?.dispose();
  core = undefined;
});

test("the header's title and CardAction share a row, the action at the right edge", async () => {
  const built = await build("test/fixtures/shadcn-vendor/card-action-main.tsx", {
    outdir: "/tmp/pocketjs-react-test/compat-c8-card-action",
    name: "card-action",
  });
  core = await bootApp(built);
  core.step(0);
  core.render();
  const title = core.texts().find((r) => r.text === "Title")!;
  const act = core.texts().find((r) => r.text === "Act")!;
  expect(title).toBeDefined();
  expect(act).toBeDefined();
  expect(act.y).toBe(title.y);
  expect(act.x).toBeGreaterThan(title.x + title.w);
});
