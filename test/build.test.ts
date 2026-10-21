// tools/build.ts against the real wasm core: compiled class literals draw their focus:
// variant, the font-slot cross product draws runtime combinations, and Pocket3D-licensed
// inputs fail the build.
import { afterEach, expect, test } from "bun:test";
import { BTN } from "@pocketjs/framework/input";
import { build } from "../tools/build.ts";
import { bootApp, type Core } from "./harness.ts";
import { NODE_TYPE, PROP } from "../src/internal/pocket.ts";
import { fontSlotFor } from "../src/internal/pocket-build.ts";

const OUT = "/tmp/pocketjs-react-test/build";
let core: Core | undefined;
afterEach(() => core?.dispose());

test("a compiled focus: variant redraws the row the d-pad focuses", async () => {
  core = await bootApp(await build("test/fixtures/styled/main.tsx", { outdir: OUT }));
  const row = core.texts().find((r) => r.text === "One")!;
  const before = core.pixel(row.x - 4, row.y + 2);
  core.press(BTN.DOWN);
  core.texts();
  const after = core.pixel(row.x - 4, row.y + 2);
  expect(after).not.toBe(before);
  const other = core.texts().find((r) => r.text === "Two")!;
  expect(core.pixel(other.x - 4, other.y + 2)).toBe(before);
});

test("the font-slot cross product draws a size + weight pair no literal spells out", async () => {
  const built = await build("test/fixtures/slots/main.tsx", { outdir: OUT });
  expect(built.fontSlots).toContain(fontSlotFor(14, true));
  core = await bootApp(built);
  const drawn = (slot: number, text: string) => {
    const ops = core!.ops;
    const id = ops.createNode(NODE_TYPE.text);
    ops.setText(id, text);
    ops.setProp(id, PROP.fontSlot, slot);
    ops.insertBefore(1, id, 0);
    core!.step(0);
    return core!.texts().some((r) => r.text === text);
  };
  expect(drawn(fontSlotFor(14, true), "Bold")).toBe(true);
  expect(drawn(fontSlotFor(24, true), "Plain")).toBe(false);
});

test("a Pocket3D-licensed input fails the build", async () => {
  const run = Bun.spawnSync(["bun", "tools/build.ts", "test/fixtures/p3d-import/main.tsx", "--outdir=" + OUT]);
  expect(run.exitCode).toBe(1);
  expect(run.stderr.toString()).toContain("node_modules/@pocketjs/framework/devices/LICENSE");
});
